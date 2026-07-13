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
 * Helper: verify operator owns the realisasi.
 */
function verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id) {
    $stmt = $conn->prepare(
        "SELECT id, sekolah_id, status, total_penerimaan FROM realisasi_bos WHERE id = ? AND sekolah_id = ?"
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
 * Recalculate running saldo for all BKU entries of a realisasi_id
 * starting from a specific position (entry after the changed one).
 * This rebuilds all saldo from the beginning for simplicity and correctness.
 */
function recalculateBkuSaldo($conn, $realisasi_id) {
    // Fetch all entries ordered by tanggal ASC, then id ASC
    $stmt = $conn->prepare(
        "SELECT id, penerimaan, pengeluaran FROM bku WHERE realisasi_id = ? ORDER BY tanggal ASC, id ASC"
    );
    $stmt->bind_param("i", $realisasi_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $running_saldo = 0;
    $update_stmt   = $conn->prepare("UPDATE bku SET saldo = ? WHERE id = ?");

    while ($row = $result->fetch_assoc()) {
        $running_saldo += floatval($row['penerimaan']) - floatval($row['pengeluaran']);
        $update_stmt->bind_param("di", $running_saldo, $row['id']);
        $update_stmt->execute();
    }

    return $running_saldo;
}

switch ($method) {

    case 'GET':
        $realisasi_id = intval($_GET['realisasi_id'] ?? 0);

        if ($realisasi_id === 0) {
            sendError('realisasi_id harus disertakan', 400);
        }

        // Verify ownership
        verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        $stmt = $conn->prepare(
            "SELECT id, realisasi_id, tanggal, uraian, penerimaan, pengeluaran, saldo, created_at
             FROM bku
             WHERE realisasi_id = ?
             ORDER BY tanggal ASC, id ASC"
        );
        $stmt->bind_param("i", $realisasi_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $entries         = [];
        $total_penerimaan = 0;
        $total_pengeluaran = 0;
        while ($row = $result->fetch_assoc()) {
            $entries[]          = $row;
            $total_penerimaan  += floatval($row['penerimaan']);
            $total_pengeluaran += floatval($row['pengeluaran']);
        }

        sendResponse([
            'realisasi_id'      => $realisasi_id,
            'entries'           => $entries,
            'total_penerimaan'  => $total_penerimaan,
            'total_pengeluaran' => $total_pengeluaran,
            'saldo_akhir'       => $total_penerimaan - $total_pengeluaran
        ]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $realisasi_id = intval($data['realisasi_id'] ?? 0);
        $tanggal      = sanitizeInput($data['tanggal'] ?? '');
        $uraian       = sanitizeInput($data['uraian'] ?? '');
        $penerimaan   = floatval($data['penerimaan'] ?? 0);
        $pengeluaran  = floatval($data['pengeluaran'] ?? 0);

        if ($realisasi_id === 0 || empty($tanggal) || empty($uraian)) {
            sendError('realisasi_id, tanggal, dan uraian harus diisi', 400);
        }

        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
            sendError('Format tanggal tidak valid. Gunakan YYYY-MM-DD', 400);
        }

        // Verify ownership
        verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        // Get last saldo to compute an initial running saldo estimate
        $last_stmt = $conn->prepare(
            "SELECT COALESCE(
               (SELECT saldo FROM bku WHERE realisasi_id = ? ORDER BY tanggal ASC, id DESC LIMIT 1),
               0
             ) AS last_saldo"
        );
        $last_stmt->bind_param("i", $realisasi_id);
        $last_stmt->execute();
        $last_row    = $last_stmt->get_result()->fetch_assoc();
        $last_saldo  = floatval($last_row['last_saldo']);
        $new_saldo   = $last_saldo + $penerimaan - $pengeluaran;

        $stmt = $conn->prepare(
            "INSERT INTO bku (realisasi_id, tanggal, uraian, penerimaan, pengeluaran, saldo)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("issddd", $realisasi_id, $tanggal, $uraian, $penerimaan, $pengeluaran, $new_saldo);

        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            // Recalculate all saldo to ensure correctness when inserting out of order
            recalculateBkuSaldo($conn, $realisasi_id);

            sendResponse([
                'message' => 'Entri BKU berhasil ditambahkan',
                'id'      => $new_id,
                'saldo'   => $new_saldo
            ], 201);
        } else {
            sendError('Gagal menambahkan entri BKU: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id          = intval($data['id'] ?? 0);
        $tanggal     = sanitizeInput($data['tanggal'] ?? '');
        $uraian      = sanitizeInput($data['uraian'] ?? '');
        $penerimaan  = floatval($data['penerimaan'] ?? 0);
        $pengeluaran = floatval($data['pengeluaran'] ?? 0);

        if ($id === 0 || empty($tanggal) || empty($uraian)) {
            sendError('id, tanggal, dan uraian harus diisi', 400);
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
            sendError('Format tanggal tidak valid. Gunakan YYYY-MM-DD', 400);
        }

        // Verify the BKU entry belongs to operator's realisasi
        $chk = $conn->prepare(
            "SELECT b.id, b.realisasi_id FROM bku b
             JOIN realisasi_bos rb ON b.realisasi_id = rb.id
             WHERE b.id = ? AND rb.sekolah_id = ?"
        );
        $chk->bind_param("ii", $id, $sekolah_id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('Entri BKU tidak ditemukan atau bukan milik sekolah Anda', 404);
        }
        $bku_row      = $chk_result->fetch_assoc();
        $realisasi_id = $bku_row['realisasi_id'];

        // Verify realisasi ownership
        verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        // Update the entry (saldo will be recalculated below)
        $stmt = $conn->prepare(
            "UPDATE bku SET tanggal = ?, uraian = ?, penerimaan = ?, pengeluaran = ? WHERE id = ?"
        );
        $stmt->bind_param("ssddi", $tanggal, $uraian, $penerimaan, $pengeluaran, $id);

        if ($stmt->execute()) {
            // Recalculate all saldo from beginning
            $saldo_akhir = recalculateBkuSaldo($conn, $realisasi_id);

            sendResponse([
                'message'     => 'Entri BKU berhasil diupdate',
                'saldo_akhir' => $saldo_akhir
            ]);
        } else {
            sendError('Gagal mengupdate entri BKU: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify BKU belongs to operator's realisasi
        $chk = $conn->prepare(
            "SELECT b.id, b.realisasi_id FROM bku b
             JOIN realisasi_bos rb ON b.realisasi_id = rb.id
             WHERE b.id = ? AND rb.sekolah_id = ?"
        );
        $chk->bind_param("ii", $id, $sekolah_id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('Entri BKU tidak ditemukan atau bukan milik sekolah Anda', 404);
        }
        $bku_row      = $chk_result->fetch_assoc();
        $realisasi_id = $bku_row['realisasi_id'];

        // Verify realisasi ownership
        verifyRealisasiOwnership($conn, $realisasi_id, $sekolah_id);

        $stmt = $conn->prepare("DELETE FROM bku WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            // Recalculate saldo for remaining entries
            $saldo_akhir = recalculateBkuSaldo($conn, $realisasi_id);

            sendResponse([
                'message'     => 'Entri BKU berhasil dihapus',
                'saldo_akhir' => $saldo_akhir
            ]);
        } else {
            sendError('Gagal menghapus entri BKU: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
