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
                "SELECT r.*, s.nama_sekolah, s.npsn, s.jenjang,
                        k.nama_kecamatan, k.kode_kecamatan
                 FROM rkas r
                 JOIN sekolah s ON r.sekolah_id = s.id
                 JOIN kecamatan k ON s.kecamatan_id = k.id
                 WHERE r.id = ?"
            );
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                sendError('RKAS tidak ditemukan', 404);
            }

            $rkas = $result->fetch_assoc();

            // Get all rkas_detail items
            $detail_stmt = $conn->prepare(
                "SELECT id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah, created_at
                 FROM rkas_detail WHERE rkas_id = ? ORDER BY id ASC"
            );
            $detail_stmt->bind_param("i", $id);
            $detail_stmt->execute();
            $detail_result = $detail_stmt->get_result();
            $items = [];
            $total_anggaran = 0;
            while ($row = $detail_result->fetch_assoc()) {
                $items[]         = $row;
                $total_anggaran += floatval($row['jumlah']);
            }
            $rkas['items']          = $items;
            $rkas['total_items']    = count($items);
            $rkas['total_anggaran'] = $total_anggaran;

            sendResponse($rkas);
        } else {
            $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';

            $sql    = "SELECT r.*, s.nama_sekolah, s.npsn, s.jenjang,
                              k.nama_kecamatan, k.kode_kecamatan,
                              (SELECT COUNT(*) FROM rkas_detail rd WHERE rd.rkas_id = r.id) AS jumlah_item,
                              (SELECT COALESCE(SUM(rd2.jumlah), 0) FROM rkas_detail rd2 WHERE rd2.rkas_id = r.id) AS total_anggaran
                       FROM rkas r
                       JOIN sekolah s ON r.sekolah_id = s.id
                       JOIN kecamatan k ON s.kecamatan_id = k.id
                       WHERE 1=1";
            $types  = '';
            $params = [];

            if (!empty($status)) {
                $sql    .= " AND r.status = ?";
                $types  .= 's';
                $params[] = $status;
            }
            $sql .= " ORDER BY r.updated_at DESC";

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

        $id              = intval($data['id'] ?? 0);
        $action          = sanitizeInput($data['action'] ?? '');
        $catatan_revisi  = sanitizeInput($data['catatan_revisi'] ?? '');

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        if (!in_array($action, ['sahkan', 'kembalikan'])) {
            sendError('Action tidak valid. Gunakan: sahkan atau kembalikan', 400);
        }

        if ($action === 'kembalikan' && empty($catatan_revisi)) {
            sendError('Catatan revisi harus diisi jika action adalah kembalikan', 400);
        }

        // Verify RKAS exists and is in 'pending' status
        $chk = $conn->prepare("SELECT id, status FROM rkas WHERE id = ?");
        $chk->bind_param("i", $id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('RKAS tidak ditemukan', 404);
        }

        $rkas_row = $chk_result->fetch_assoc();
        if ($rkas_row['status'] !== 'pending') {
            sendError('Hanya RKAS dengan status pending yang dapat diverifikasi. Status saat ini: ' . $rkas_row['status'], 400);
        }

        if ($action === 'sahkan') {
            $stmt = $conn->prepare(
                "UPDATE rkas
                 SET status = 'disahkan', tanggal_verifikasi = NOW(), admin_id = ?, catatan_revisi = NULL
                 WHERE id = ?"
            );
            $stmt->bind_param("ii", $admin_id, $id);
            $msg = 'RKAS berhasil disahkan';
        } else {
            // kembalikan
            $stmt = $conn->prepare(
                "UPDATE rkas
                 SET status = 'revisi', catatan_revisi = ?, tanggal_verifikasi = NULL, admin_id = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("sii", $catatan_revisi, $admin_id, $id);
            $msg = 'RKAS dikembalikan untuk direvisi';
        }

        if ($stmt->execute()) {
            sendResponse(['message' => $msg, 'id' => $id, 'action' => $action]);
        } else {
            sendError('Gagal memperbarui status RKAS: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
