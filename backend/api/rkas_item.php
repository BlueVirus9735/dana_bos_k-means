<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['operator_id'])) {
    sendError('Unauthorized. Hanya Operator Sekolah yang dapat mengakses endpoint ini.', 401);
}

require_once '../includes/db.php';

$sekolah_id = $_SESSION['sekolah_id'];
$method     = $_SERVER['REQUEST_METHOD'];

/**
 * Helper: verify operator owns the given rkas_id.
 * Returns the rkas row or calls sendError.
 */
function verifyRkasOwnership($conn, $rkas_id, $sekolah_id) {
    $stmt = $conn->prepare("SELECT id, sekolah_id, status FROM rkas WHERE id = ? AND sekolah_id = ?");
    $stmt->bind_param("ii", $rkas_id, $sekolah_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('RKAS tidak ditemukan atau bukan milik sekolah Anda', 404);
    }
    return $result->fetch_assoc();
}

/**
 * Helper: verify operator owns the rkas_detail item via its parent rkas.
 * Returns the detail row or calls sendError.
 */
function verifyItemOwnership($conn, $item_id, $sekolah_id) {
    $stmt = $conn->prepare(
        "SELECT rd.id, rd.rkas_id, rd.komponen_kegiatan, rd.uraian, rd.volume, rd.satuan,
                rd.harga_satuan, rd.jumlah
         FROM rkas_detail rd
         JOIN rkas r ON rd.rkas_id = r.id
         WHERE rd.id = ? AND r.sekolah_id = ?"
    );
    $stmt->bind_param("ii", $item_id, $sekolah_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('Item tidak ditemukan atau bukan milik sekolah Anda', 404);
    }
    return $result->fetch_assoc();
}

switch ($method) {

    case 'GET':
        $rkas_id = intval($_GET['rkas_id'] ?? 0);

        if ($rkas_id === 0) {
            sendError('rkas_id harus disertakan', 400);
        }

        // Verify ownership
        $rkas = verifyRkasOwnership($conn, $rkas_id, $sekolah_id);

        $stmt = $conn->prepare(
            "SELECT id, rkas_id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah, created_at
             FROM rkas_detail
             WHERE rkas_id = ?
             ORDER BY id ASC"
        );
        $stmt->bind_param("i", $rkas_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        $total = 0;
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
            $total  += floatval($row['jumlah']);
        }

        sendResponse([
            'rkas_id'        => $rkas_id,
            'rkas_status'    => $rkas['status'],
            'items'          => $items,
            'total_anggaran' => $total
        ]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $rkas_id           = intval($data['rkas_id'] ?? 0);
        $komponen_kegiatan = sanitizeInput($data['komponen_kegiatan'] ?? '');
        $uraian            = sanitizeInput($data['uraian'] ?? '');
        $volume            = floatval($data['volume'] ?? 1);
        $satuan            = sanitizeInput($data['satuan'] ?? '');
        $harga_satuan      = floatval($data['harga_satuan'] ?? 0);

        if ($rkas_id === 0 || empty($komponen_kegiatan)) {
            sendError('rkas_id dan komponen_kegiatan harus diisi', 400);
        }

        if ($volume <= 0) {
            sendError('Volume harus lebih dari 0', 400);
        }

        if ($harga_satuan < 0) {
            sendError('Harga satuan tidak boleh negatif', 400);
        }

        // Verify ownership and status
        $rkas = verifyRkasOwnership($conn, $rkas_id, $sekolah_id);

        if (!in_array($rkas['status'], ['draft', 'revisi'])) {
            sendError('RKAS tidak dapat diubah karena statusnya: ' . $rkas['status'], 400);
        }

        $jumlah = $volume * $harga_satuan;

        $stmt = $conn->prepare(
            "INSERT INTO rkas_detail (rkas_id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("issdsdd", $rkas_id, $komponen_kegiatan, $uraian, $volume, $satuan, $harga_satuan, $jumlah);

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Item RKAS berhasil ditambahkan',
                'id'      => $conn->insert_id,
                'jumlah'  => $jumlah
            ], 201);
        } else {
            sendError('Gagal menambahkan item RKAS: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id                = intval($data['id'] ?? 0);
        $komponen_kegiatan = sanitizeInput($data['komponen_kegiatan'] ?? '');
        $uraian            = sanitizeInput($data['uraian'] ?? '');
        $volume            = floatval($data['volume'] ?? 1);
        $satuan            = sanitizeInput($data['satuan'] ?? '');
        $harga_satuan      = floatval($data['harga_satuan'] ?? 0);

        if ($id === 0 || empty($komponen_kegiatan)) {
            sendError('id dan komponen_kegiatan harus diisi', 400);
        }

        if ($volume <= 0) {
            sendError('Volume harus lebih dari 0', 400);
        }

        // Verify item ownership and get rkas_id
        $item = verifyItemOwnership($conn, $id, $sekolah_id);

        // Check rkas status allows editing
        $rkas = verifyRkasOwnership($conn, $item['rkas_id'], $sekolah_id);
        if (!in_array($rkas['status'], ['draft', 'revisi'])) {
            sendError('RKAS tidak dapat diubah karena statusnya: ' . $rkas['status'], 400);
        }

        $jumlah = $volume * $harga_satuan;

        $stmt = $conn->prepare(
            "UPDATE rkas_detail
             SET komponen_kegiatan = ?, uraian = ?, volume = ?, satuan = ?, harga_satuan = ?, jumlah = ?
             WHERE id = ?"
        );
        $stmt->bind_param("ssdsddi", $komponen_kegiatan, $uraian, $volume, $satuan, $harga_satuan, $jumlah, $id);

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Item RKAS berhasil diupdate',
                'jumlah'  => $jumlah
            ]);
        } else {
            sendError('Gagal mengupdate item RKAS: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify item ownership
        $item = verifyItemOwnership($conn, $id, $sekolah_id);

        // Check rkas status allows editing
        $rkas = verifyRkasOwnership($conn, $item['rkas_id'], $sekolah_id);
        if (!in_array($rkas['status'], ['draft', 'revisi'])) {
            sendError('RKAS tidak dapat diubah karena statusnya: ' . $rkas['status'], 400);
        }

        $stmt = $conn->prepare("DELETE FROM rkas_detail WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            sendResponse(['message' => 'Item RKAS berhasil dihapus']);
        } else {
            sendError('Gagal menghapus item RKAS: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
