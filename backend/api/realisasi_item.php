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
 * Helper: verify operator owns the given realisasi_id.
 * Returns the realisasi_bos row or calls sendError.
 */
function verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id) {
    $stmt = $conn->prepare(
        "SELECT id, sekolah_id, status, total_penerimaan, total_pengeluaran, saldo
         FROM realisasi_bos WHERE id = ? AND sekolah_id = ?"
    );
    $stmt->bind_param("ii", $realisasi_id, $sekolah_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('Realisasi tidak ditemukan atau bukan milik sekolah Anda', 404);
    }
    return $result->fetch_assoc();
}

/**
 * Helper: verify the operator owns a realisasi_detail item.
 * Returns the detail row or calls sendError.
 */
function verifyDetailOwnership($conn, $item_id, $sekolah_id) {
    $stmt = $conn->prepare(
        "SELECT rd.*
         FROM realisasi_detail rd
         JOIN realisasi_bos rb ON rd.realisasi_id = rb.id
         WHERE rd.id = ? AND rb.sekolah_id = ?"
    );
    $stmt->bind_param("ii", $item_id, $sekolah_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('Item realisasi tidak ditemukan atau bukan milik sekolah Anda', 404);
    }
    return $result->fetch_assoc();
}

/**
 * Recalculate and update parent realisasi_bos totals.
 */
function updateRealisasiTotal($conn, $realisasi_id) {
    $sum_stmt = $conn->prepare(
        "SELECT COALESCE(SUM(realisasi), 0) AS total_pengeluaran
         FROM realisasi_detail WHERE realisasi_id = ?"
    );
    $sum_stmt->bind_param("i", $realisasi_id);
    $sum_stmt->execute();
    $sum_row = $sum_stmt->get_result()->fetch_assoc();
    $total_pengeluaran = floatval($sum_row['total_pengeluaran']);

    // Get total_penerimaan
    $pen_stmt = $conn->prepare("SELECT total_penerimaan FROM realisasi_bos WHERE id = ?");
    $pen_stmt->bind_param("i", $realisasi_id);
    $pen_stmt->execute();
    $pen_row = $pen_stmt->get_result()->fetch_assoc();
    $total_penerimaan = floatval($pen_row['total_penerimaan']);

    $saldo = $total_penerimaan - $total_pengeluaran;

    $upd = $conn->prepare(
        "UPDATE realisasi_bos SET total_pengeluaran = ?, saldo = ? WHERE id = ?"
    );
    $upd->bind_param("ddi", $total_pengeluaran, $saldo, $realisasi_id);
    $upd->execute();

    return [
        'total_pengeluaran' => $total_pengeluaran,
        'total_penerimaan'  => $total_penerimaan,
        'saldo'             => $saldo
    ];
}

switch ($method) {

    case 'GET':
        $realisasi_id = intval($_GET['realisasi_id'] ?? 0);

        if ($realisasi_id === 0) {
            sendError('realisasi_id harus disertakan', 400);
        }

        // Verify ownership
        $realisasi = verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        $stmt = $conn->prepare(
            "SELECT rd.*, rk.komponen_kegiatan AS rkas_komponen, rk.jumlah AS rkas_jumlah
             FROM realisasi_detail rd
             LEFT JOIN rkas_detail rk ON rd.rkas_detail_id = rk.id
             WHERE rd.realisasi_id = ?
             ORDER BY rd.id ASC"
        );
        $stmt->bind_param("i", $realisasi_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $items          = [];
        $total_anggaran = 0;
        $total_realisasi = 0;
        while ($row = $result->fetch_assoc()) {
            $items[]          = $row;
            $total_anggaran  += floatval($row['anggaran']);
            $total_realisasi += floatval($row['realisasi']);
        }

        sendResponse([
            'realisasi_id'      => $realisasi_id,
            'realisasi_status'  => $realisasi['status'],
            'total_penerimaan'  => $realisasi['total_penerimaan'],
            'total_pengeluaran' => $realisasi['total_pengeluaran'],
            'saldo'             => $realisasi['saldo'],
            'items'             => $items,
            'total_anggaran'    => $total_anggaran,
            'total_realisasi'   => $total_realisasi
        ]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $realisasi_id      = intval($data['realisasi_id'] ?? 0);
        $rkas_detail_id    = !empty($data['rkas_detail_id']) ? intval($data['rkas_detail_id']) : null;
        $komponen_kegiatan = sanitizeInput($data['komponen_kegiatan'] ?? '');
        $uraian            = sanitizeInput($data['uraian'] ?? '');
        $anggaran          = floatval($data['anggaran'] ?? 0);
        $realisasi_val     = floatval($data['realisasi'] ?? 0);
        $keterangan        = sanitizeInput($data['keterangan'] ?? '');

        if ($realisasi_id === 0 || empty($komponen_kegiatan)) {
            sendError('realisasi_id dan komponen_kegiatan harus diisi', 400);
        }

        // Verify ownership
        $realisasi = verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        // Only allow editing if status is draft or pembinaan
        if (!in_array($realisasi['status'], ['draft', 'pembinaan'])) {
            sendError('Realisasi tidak dapat diubah karena statusnya: ' . $realisasi['status'], 400);
        }

        $stmt = $conn->prepare(
            "INSERT INTO realisasi_detail
             (realisasi_id, rkas_detail_id, komponen_kegiatan, uraian, anggaran, realisasi, keterangan)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("iissdds", $realisasi_id, $rkas_detail_id, $komponen_kegiatan, $uraian, $anggaran, $realisasi_val, $keterangan);

        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            // Auto-update parent totals
            $totals = updateRealisasiTotal($conn, $realisasi_id);

            sendResponse([
                'message'           => 'Item realisasi berhasil ditambahkan',
                'id'                => $new_id,
                'total_pengeluaran' => $totals['total_pengeluaran'],
                'saldo'             => $totals['saldo']
            ], 201);
        } else {
            sendError('Gagal menambahkan item realisasi: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id                = intval($data['id'] ?? 0);
        $rkas_detail_id    = !empty($data['rkas_detail_id']) ? intval($data['rkas_detail_id']) : null;
        $komponen_kegiatan = sanitizeInput($data['komponen_kegiatan'] ?? '');
        $uraian            = sanitizeInput($data['uraian'] ?? '');
        $anggaran          = floatval($data['anggaran'] ?? 0);
        $realisasi_val     = floatval($data['realisasi'] ?? 0);
        $keterangan        = sanitizeInput($data['keterangan'] ?? '');

        if ($id === 0 || empty($komponen_kegiatan)) {
            sendError('id dan komponen_kegiatan harus diisi', 400);
        }

        // Verify item ownership
        $item = verifyDetailOwnership($conn, $id, $sekolah_id);
        $realisasi_id = $item['realisasi_id'];

        // Verify parent realisasi status
        $realisasi = verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);
        if (!in_array($realisasi['status'], ['draft', 'pembinaan'])) {
            sendError('Realisasi tidak dapat diubah karena statusnya: ' . $realisasi['status'], 400);
        }

        $stmt = $conn->prepare(
            "UPDATE realisasi_detail
             SET rkas_detail_id = ?, komponen_kegiatan = ?, uraian = ?, anggaran = ?, realisasi = ?, keterangan = ?
             WHERE id = ?"
        );
        $stmt->bind_param("issddsi", $rkas_detail_id, $komponen_kegiatan, $uraian, $anggaran, $realisasi_val, $keterangan, $id);

        if ($stmt->execute()) {
            $totals = updateRealisasiTotal($conn, $realisasi_id);

            sendResponse([
                'message'           => 'Item realisasi berhasil diupdate',
                'total_pengeluaran' => $totals['total_pengeluaran'],
                'saldo'             => $totals['saldo']
            ]);
        } else {
            sendError('Gagal mengupdate item realisasi: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify item ownership
        $item = verifyDetailOwnership($conn, $id, $sekolah_id);
        $realisasi_id = $item['realisasi_id'];

        // Verify parent realisasi status
        $realisasi = verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);
        if (!in_array($realisasi['status'], ['draft', 'pembinaan'])) {
            sendError('Realisasi tidak dapat diubah karena statusnya: ' . $realisasi['status'], 400);
        }

        $stmt = $conn->prepare("DELETE FROM realisasi_detail WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            $totals = updateRealisasiTotal($conn, $realisasi_id);

            sendResponse([
                'message'           => 'Item realisasi berhasil dihapus',
                'total_pengeluaran' => $totals['total_pengeluaran'],
                'saldo'             => $totals['saldo']
            ]);
        } else {
            sendError('Gagal menghapus item realisasi: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
