<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method   = $_SERVER['REQUEST_METHOD'];
$admin_id = $_SESSION['admin_id'];

switch ($method) {

    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);

            $stmt = $conn->prepare(
                "SELECT rb.*, s.nama_sekolah, s.npsn, s.jenjang,
                        k.nama_kecamatan, k.kode_kecamatan
                 FROM realisasi_bos rb
                 JOIN sekolah s ON rb.sekolah_id = s.id
                 JOIN kecamatan k ON s.kecamatan_id = k.id
                 WHERE rb.id = ?"
            );
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                sendError('Realisasi tidak ditemukan', 404);
            }

            $realisasi = $result->fetch_assoc();

            // Get realisasi_detail items
            $detail_stmt = $conn->prepare(
                "SELECT rd.*, rk.komponen_kegiatan AS rkas_komponen, rk.jumlah AS rkas_jumlah
                 FROM realisasi_detail rd
                 LEFT JOIN rkas_detail rk ON rd.rkas_detail_id = rk.id
                 WHERE rd.realisasi_id = ?
                 ORDER BY rd.id ASC"
            );
            $detail_stmt->bind_param("i", $id);
            $detail_stmt->execute();
            $detail_result = $detail_stmt->get_result();
            $items = [];
            while ($row = $detail_result->fetch_assoc()) {
                $items[] = $row;
            }
            $realisasi['items'] = $items;

            // Get BKU entries
            $bku_stmt = $conn->prepare(
                "SELECT id, tanggal, uraian, penerimaan, pengeluaran, saldo, created_at
                 FROM bku WHERE realisasi_id = ? ORDER BY tanggal ASC, id ASC"
            );
            $bku_stmt->bind_param("i", $id);
            $bku_stmt->execute();
            $bku_result = $bku_stmt->get_result();
            $bku_entries = [];
            while ($row = $bku_result->fetch_assoc()) {
                $bku_entries[] = $row;
            }
            $realisasi['bku'] = $bku_entries;

            sendResponse($realisasi);
        } else {
            $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';

            $sql    = "SELECT rb.*, s.nama_sekolah, s.npsn, s.jenjang,
                              k.nama_kecamatan, k.kode_kecamatan
                       FROM realisasi_bos rb
                       JOIN sekolah s ON rb.sekolah_id = s.id
                       JOIN kecamatan k ON s.kecamatan_id = k.id
                       WHERE 1=1";
            $types  = '';
            $params = [];

            if (!empty($status)) {
                $sql    .= " AND rb.status = ?";
                $types  .= 's';
                $params[] = $status;
            }
            $sql .= " ORDER BY rb.updated_at DESC";

            $stmt = $conn->prepare($sql);
            if (!empty($types)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();

            $list = [];
            while ($row = $result->fetch_assoc()) {
                $list[] = $row;
            }
            sendResponse($list);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id               = intval($data['id'] ?? 0);
        $action           = sanitizeInput($data['action'] ?? '');
        $catatan_validasi = sanitizeInput($data['catatan_validasi'] ?? '');

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        if (!in_array($action, ['terverifikasi', 'pembinaan'])) {
            sendError('Action tidak valid. Gunakan: terverifikasi atau pembinaan', 400);
        }

        if ($action === 'pembinaan' && empty($catatan_validasi)) {
            sendError('Catatan validasi harus diisi jika action adalah pembinaan', 400);
        }

        // Verify realisasi exists and is in 'submitted' status
        $chk = $conn->prepare("SELECT id, status FROM realisasi_bos WHERE id = ?");
        $chk->bind_param("i", $id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('Realisasi tidak ditemukan', 404);
        }

        $realisasi_row = $chk_result->fetch_assoc();
        if ($realisasi_row['status'] !== 'submitted') {
            sendError(
                'Hanya realisasi dengan status submitted yang dapat divalidasi. Status saat ini: ' . $realisasi_row['status'],
                400
            );
        }

        if ($action === 'terverifikasi') {
            $stmt = $conn->prepare(
                "UPDATE realisasi_bos
                 SET status = 'terverifikasi', tanggal_validasi = NOW(), admin_id = ?, catatan_validasi = NULL
                 WHERE id = ?"
            );
            $stmt->bind_param("ii", $admin_id, $id);
            $msg = 'Realisasi berhasil terverifikasi';
        } else {
            // pembinaan
            $stmt = $conn->prepare(
                "UPDATE realisasi_bos
                 SET status = 'pembinaan', catatan_validasi = ?, admin_id = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("sii", $catatan_validasi, $admin_id, $id);
            $msg = 'Realisasi dikembalikan untuk pembinaan';
        }

        if ($stmt->execute()) {
            sendResponse(['message' => $msg, 'id' => $id, 'action' => $action]);
        } else {
            sendError('Gagal memperbarui status realisasi: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
