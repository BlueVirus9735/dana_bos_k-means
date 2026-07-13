<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id']) && !isset($_SESSION['operator_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method   = $_SERVER['REQUEST_METHOD'];
$is_admin = isset($_SESSION['admin_id']);

switch ($method) {

    case 'GET':
        if ($is_admin) {
            // Admin: get all RKAS with sekolah info
            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $stmt = $conn->prepare(
                    "SELECT r.*, s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
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

                // Get rkas_detail items
                $detail_stmt = $conn->prepare("SELECT * FROM rkas_detail WHERE rkas_id = ? ORDER BY id ASC");
                $detail_stmt->bind_param("i", $id);
                $detail_stmt->execute();
                $detail_result = $detail_stmt->get_result();
                $details = [];
                while ($row = $detail_result->fetch_assoc()) {
                    $details[] = $row;
                }
                $rkas['items']       = $details;
                $rkas['total_items'] = count($details);
                $rkas['total_anggaran'] = array_sum(array_column($details, 'jumlah'));

                sendResponse($rkas);
            } else {
                $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';

                $sql    = "SELECT r.*, s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan,
                                  (SELECT COUNT(*) FROM rkas_detail rd WHERE rd.rkas_id = r.id) AS total_items,
                                  (SELECT COALESCE(SUM(rd2.jumlah),0) FROM rkas_detail rd2 WHERE rd2.rkas_id = r.id) AS total_anggaran
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
        } else {
            // Operator: get own RKAS
            $sekolah_id = $_SESSION['sekolah_id'];

            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $stmt = $conn->prepare(
                    "SELECT r.*, s.nama_sekolah, s.npsn, k.nama_kecamatan
                     FROM rkas r
                     JOIN sekolah s ON r.sekolah_id = s.id
                     JOIN kecamatan k ON s.kecamatan_id = k.id
                     WHERE r.id = ? AND r.sekolah_id = ?"
                );
                $stmt->bind_param("ii", $id, $sekolah_id);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows === 0) {
                    sendError('RKAS tidak ditemukan atau bukan milik sekolah Anda', 404);
                }

                $rkas = $result->fetch_assoc();

                // Get rkas_detail items
                $detail_stmt = $conn->prepare("SELECT * FROM rkas_detail WHERE rkas_id = ? ORDER BY id ASC");
                $detail_stmt->bind_param("i", $id);
                $detail_stmt->execute();
                $detail_result = $detail_stmt->get_result();
                $details = [];
                while ($row = $detail_result->fetch_assoc()) {
                    $details[] = $row;
                }
                $rkas['items']        = $details;
                $rkas['total_items']  = count($details);
                $rkas['total_anggaran'] = array_sum(array_column($details, 'jumlah'));

                sendResponse($rkas);
            } else {
                $stmt = $conn->prepare(
                    "SELECT r.*,
                            (SELECT COUNT(*) FROM rkas_detail rd WHERE rd.rkas_id = r.id) AS total_items,
                            (SELECT COALESCE(SUM(rd2.jumlah),0) FROM rkas_detail rd2 WHERE rd2.rkas_id = r.id) AS total_anggaran
                     FROM rkas r
                     WHERE r.sekolah_id = ?
                     ORDER BY r.tahun_ajaran DESC"
                );
                $stmt->bind_param("i", $sekolah_id);
                $stmt->execute();
                $result = $stmt->get_result();

                $list = [];
                while ($row = $result->fetch_assoc()) {
                    $list[] = $row;
                }
                sendResponse($list);
            }
        }
        break;

    case 'POST':
        if ($is_admin) {
            sendError('Admin tidak dapat membuat RKAS. Gunakan akun Operator Sekolah.', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $sekolah_id   = $_SESSION['sekolah_id'];
        $tahun_ajaran = sanitizeInput($data['tahun_ajaran'] ?? '');

        if (empty($tahun_ajaran)) {
            sendError('Tahun ajaran harus diisi', 400);
        }

        // Check if tahun_ajaran is aktif
        $ta_stmt = $conn->prepare("SELECT id, status, batas_submit_rkas FROM tahun_ajaran_config WHERE tahun_ajaran = ? AND status = 'aktif'");
        $ta_stmt->bind_param("s", $tahun_ajaran);
        $ta_stmt->execute();
        $ta_result = $ta_stmt->get_result();
        if ($ta_result->num_rows === 0) {
            sendError('Tahun ajaran tidak ditemukan atau tidak aktif', 400);
        }

        $ta = $ta_result->fetch_assoc();

        // Check deadline
        if (!empty($ta['batas_submit_rkas']) && date('Y-m-d') > $ta['batas_submit_rkas']) {
            sendError('Batas waktu submit RKAS untuk tahun ajaran ini sudah berakhir (' . $ta['batas_submit_rkas'] . ')', 400);
        }

        // Check no existing RKAS for same sekolah + tahun
        $chk = $conn->prepare("SELECT id FROM rkas WHERE sekolah_id = ? AND tahun_ajaran = ?");
        $chk->bind_param("is", $sekolah_id, $tahun_ajaran);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            sendError('RKAS untuk tahun ajaran ini sudah ada', 409);
        }

        $stmt = $conn->prepare("INSERT INTO rkas (sekolah_id, tahun_ajaran, status) VALUES (?, ?, 'draft')");
        $stmt->bind_param("is", $sekolah_id, $tahun_ajaran);

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'RKAS berhasil dibuat',
                'id'      => $conn->insert_id
            ], 201);
        } else {
            sendError('Gagal membuat RKAS: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        if ($is_admin) {
            sendError('Untuk verifikasi RKAS, gunakan endpoint rkas_verifikasi.php', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $id           = intval($data['id'] ?? 0);
        $sekolah_id   = $_SESSION['sekolah_id'];
        $action       = sanitizeInput($data['action'] ?? '');
        $tahun_ajaran = sanitizeInput($data['tahun_ajaran'] ?? '');

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify ownership and fetch current status
        $chk = $conn->prepare("SELECT id, status, tahun_ajaran FROM rkas WHERE id = ? AND sekolah_id = ?");
        $chk->bind_param("ii", $id, $sekolah_id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('RKAS tidak ditemukan atau bukan milik sekolah Anda', 404);
        }

        $rkas_row = $chk_result->fetch_assoc();

        // Only allow updates if status is draft or revisi
        if (!in_array($rkas_row['status'], ['draft', 'revisi'])) {
            sendError('RKAS tidak dapat diubah karena statusnya: ' . $rkas_row['status'], 400);
        }

        if ($action === 'submit') {
            // Check deadline for submit
            $current_tahun = $rkas_row['tahun_ajaran'];
            $ta_chk = $conn->prepare("SELECT batas_submit_rkas FROM tahun_ajaran_config WHERE tahun_ajaran = ?");
            $ta_chk->bind_param("s", $current_tahun);
            $ta_chk->execute();
            $ta_row = $ta_chk->get_result()->fetch_assoc();
            if ($ta_row && !empty($ta_row['batas_submit_rkas']) && date('Y-m-d') > $ta_row['batas_submit_rkas']) {
                sendError('Batas waktu submit RKAS sudah berakhir (' . $ta_row['batas_submit_rkas'] . ')', 400);
            }

            // Check must have at least 1 item
            $item_chk = $conn->prepare("SELECT COUNT(*) AS cnt FROM rkas_detail WHERE rkas_id = ?");
            $item_chk->bind_param("i", $id);
            $item_chk->execute();
            $item_cnt = $item_chk->get_result()->fetch_assoc();
            if ($item_cnt['cnt'] === 0) {
                sendError('RKAS harus memiliki minimal 1 item sebelum disubmit', 400);
            }

            $stmt = $conn->prepare("UPDATE rkas SET status = 'pending', tanggal_submit = NOW() WHERE id = ? AND sekolah_id = ?");
            $stmt->bind_param("ii", $id, $sekolah_id);

            if ($stmt->execute()) {
                sendResponse(['message' => 'RKAS berhasil disubmit dan menunggu verifikasi']);
            } else {
                sendError('Gagal mengsubmit RKAS: ' . $conn->error, 500);
            }
        } else {
            // Regular update: update tahun_ajaran if provided
            if (!empty($tahun_ajaran)) {
                // Check no duplicate for new tahun_ajaran (exclude current)
                $dup_chk = $conn->prepare("SELECT id FROM rkas WHERE sekolah_id = ? AND tahun_ajaran = ? AND id != ?");
                $dup_chk->bind_param("isi", $sekolah_id, $tahun_ajaran, $id);
                $dup_chk->execute();
                if ($dup_chk->get_result()->num_rows > 0) {
                    sendError('RKAS untuk tahun ajaran ini sudah ada', 409);
                }

                $stmt = $conn->prepare("UPDATE rkas SET tahun_ajaran = ? WHERE id = ? AND sekolah_id = ?");
                $stmt->bind_param("sii", $tahun_ajaran, $id, $sekolah_id);
            } else {
                // Touch updated_at
                $stmt = $conn->prepare("UPDATE rkas SET updated_at = NOW() WHERE id = ? AND sekolah_id = ?");
                $stmt->bind_param("ii", $id, $sekolah_id);
            }

            if ($stmt->execute()) {
                sendResponse(['message' => 'RKAS berhasil diupdate']);
            } else {
                sendError('Gagal mengupdate RKAS: ' . $conn->error, 500);
            }
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
