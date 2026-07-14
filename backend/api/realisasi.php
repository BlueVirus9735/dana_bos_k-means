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
            // Admin: get all realisasi with sekolah info
            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $stmt = $conn->prepare(
                    "SELECT rb.*, s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
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

                // Auto-sync total_penerimaan with data_sekolah regardless of status
                $bos_stmt = $conn->prepare(
                    "SELECT total_dana_bos FROM data_sekolah WHERE sekolah_id = ? AND tahun_ajaran = ?"
                );
                $bos_stmt->bind_param("is", $realisasi['sekolah_id'], $realisasi['tahun_ajaran']);
                $bos_stmt->execute();
                $bos_row = $bos_stmt->get_result()->fetch_assoc();
                $latest_penerimaan = $bos_row ? floatval($bos_row['total_dana_bos']) : 0.00;

                if ($latest_penerimaan != floatval($realisasi['total_penerimaan'])) {
                    // Update realisasi_bos
                    $upd_stmt = $conn->prepare(
                        "UPDATE realisasi_bos SET total_penerimaan = ?, saldo = ? - total_pengeluaran WHERE id = ?"
                    );
                    $upd_stmt->bind_param("ddi", $latest_penerimaan, $latest_penerimaan, $id);
                    $upd_stmt->execute();

                    $realisasi['total_penerimaan'] = $latest_penerimaan;
                    $realisasi['saldo'] = $latest_penerimaan - floatval($realisasi['total_pengeluaran']);
                }

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
                $details = [];
                while ($row = $detail_result->fetch_assoc()) {
                    $details[] = $row;
                }
                $realisasi['items'] = $details;

                sendResponse($realisasi);
            } else {
                $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';

                $sql    = "SELECT rb.*, s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
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
        } else {
            // Operator: get own realisasi
            $sekolah_id = $_SESSION['sekolah_id'];

            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $stmt = $conn->prepare(
                    "SELECT rb.*, s.nama_sekolah, s.npsn, k.nama_kecamatan
                     FROM realisasi_bos rb
                     JOIN sekolah s ON rb.sekolah_id = s.id
                     JOIN kecamatan k ON s.kecamatan_id = k.id
                     WHERE rb.id = ? AND rb.sekolah_id = ?"
                );
                $stmt->bind_param("ii", $id, $sekolah_id);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows === 0) {
                    sendError('Realisasi tidak ditemukan atau bukan milik sekolah Anda', 404);
                }

                $realisasi = $result->fetch_assoc();

                // Auto-sync total_penerimaan with data_sekolah regardless of status
                $bos_stmt = $conn->prepare(
                    "SELECT total_dana_bos FROM data_sekolah WHERE sekolah_id = ? AND tahun_ajaran = ?"
                );
                $bos_stmt->bind_param("is", $sekolah_id, $realisasi['tahun_ajaran']);
                $bos_stmt->execute();
                $bos_row = $bos_stmt->get_result()->fetch_assoc();
                $latest_penerimaan = $bos_row ? floatval($bos_row['total_dana_bos']) : 0.00;

                if ($latest_penerimaan != floatval($realisasi['total_penerimaan'])) {
                    // Update realisasi_bos
                    $upd_stmt = $conn->prepare(
                        "UPDATE realisasi_bos SET total_penerimaan = ?, saldo = ? - total_pengeluaran WHERE id = ?"
                    );
                    $upd_stmt->bind_param("ddi", $latest_penerimaan, $latest_penerimaan, $id);
                    $upd_stmt->execute();

                    $realisasi['total_penerimaan'] = $latest_penerimaan;
                    $realisasi['saldo'] = $latest_penerimaan - floatval($realisasi['total_pengeluaran']);
                }

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
                $details = [];
                while ($row = $detail_result->fetch_assoc()) {
                    $details[] = $row;
                }
                $realisasi['items'] = $details;

                // Get BKU entries
                $bku_stmt = $conn->prepare(
                    "SELECT id, tanggal, uraian, penerimaan, pengeluaran, saldo
                     FROM bku WHERE realisasi_id = ? ORDER BY tanggal ASC, id ASC"
                );
                $bku_stmt->bind_param("i", $id);
                $bku_stmt->execute();
                $bku_result = $bku_stmt->get_result();
                $bku = [];
                while ($row = $bku_result->fetch_assoc()) {
                    $bku[] = $row;
                }
                $realisasi['bku'] = $bku;

                sendResponse($realisasi);
            } else {
                $stmt = $conn->prepare(
                    "SELECT rb.*
                     FROM realisasi_bos rb
                     WHERE rb.sekolah_id = ?
                     ORDER BY rb.tahun_ajaran DESC"
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
            sendError('Admin tidak dapat membuat realisasi. Gunakan akun Operator Sekolah.', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $sekolah_id   = $_SESSION['sekolah_id'];
        $tahun_ajaran = sanitizeInput($data['tahun_ajaran'] ?? '');

        if (empty($tahun_ajaran)) {
            sendError('Tahun ajaran harus diisi', 400);
        }

        // Check rkas exists and is 'disahkan' for same sekolah + tahun
        $rkas_stmt = $conn->prepare(
            "SELECT id FROM rkas WHERE sekolah_id = ? AND tahun_ajaran = ? AND status = 'disahkan'"
        );
        $rkas_stmt->bind_param("is", $sekolah_id, $tahun_ajaran);
        $rkas_stmt->execute();
        $rkas_result = $rkas_stmt->get_result();
        if ($rkas_result->num_rows === 0) {
            sendError('RKAS untuk tahun ajaran ini belum disahkan. Realisasi tidak dapat dibuat.', 400);
        }
        $rkas_row = $rkas_result->fetch_assoc();
        $rkas_id  = $rkas_row['id'];

        // Check no existing realisasi for same sekolah + tahun
        $chk = $conn->prepare("SELECT id FROM realisasi_bos WHERE sekolah_id = ? AND tahun_ajaran = ?");
        $chk->bind_param("is", $sekolah_id, $tahun_ajaran);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            sendError('Realisasi untuk tahun ajaran ini sudah ada', 409);
        }

        // Auto-fetch total_penerimaan from data_sekolah (Input Dana BOS oleh Admin)
        $bos_stmt = $conn->prepare(
            "SELECT total_dana_bos FROM data_sekolah WHERE sekolah_id = ? AND tahun_ajaran = ?"
        );
        $bos_stmt->bind_param("is", $sekolah_id, $tahun_ajaran);
        $bos_stmt->execute();
        $bos_row = $bos_stmt->get_result()->fetch_assoc();
        $total_penerimaan = $bos_row ? floatval($bos_row['total_dana_bos']) : 0.00;

        $saldo = $total_penerimaan;

        $ins_stmt = $conn->prepare(
            "INSERT INTO realisasi_bos (sekolah_id, tahun_ajaran, rkas_id, total_penerimaan, total_pengeluaran, saldo, status)
             VALUES (?, ?, ?, ?, 0.00, ?, 'draft')"
        );
        $ins_stmt->bind_param("isidd", $sekolah_id, $tahun_ajaran, $rkas_id, $total_penerimaan, $saldo);

        if (!$ins_stmt->execute()) {
            sendError('Gagal membuat realisasi: ' . $conn->error, 500);
        }
        $realisasi_id = $conn->insert_id;

        // Auto-populate realisasi_detail dari rkas_detail
        $rkas_items_stmt = $conn->prepare(
            "SELECT id, komponen_kegiatan, uraian, jumlah FROM rkas_detail WHERE rkas_id = ? ORDER BY id ASC"
        );
        $rkas_items_stmt->bind_param("i", $rkas_id);
        $rkas_items_stmt->execute();
        $rkas_items = $rkas_items_stmt->get_result();

        $item_ins = $conn->prepare(
            "INSERT INTO realisasi_detail (realisasi_id, rkas_detail_id, komponen_kegiatan, uraian, anggaran, realisasi, keterangan)
             VALUES (?, ?, ?, ?, ?, 0, '')"
        );
        while ($rk = $rkas_items->fetch_assoc()) {
            $item_ins->bind_param("iissd", $realisasi_id, $rk['id'], $rk['komponen_kegiatan'], $rk['uraian'], $rk['jumlah']);
            $item_ins->execute();
        }

        sendResponse([
            'message'          => 'Realisasi berhasil dibuat',
            'id'               => $realisasi_id,
            'total_penerimaan' => $total_penerimaan
        ], 201);
        break;

    case 'PUT':
        if ($is_admin) {
            sendError('Untuk validasi realisasi, gunakan endpoint realisasi_validasi.php', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $id               = intval($data['id'] ?? 0);
        $sekolah_id       = $_SESSION['sekolah_id'];
        $action           = sanitizeInput($data['action'] ?? '');
        $total_penerimaan = isset($data['total_penerimaan']) ? floatval($data['total_penerimaan']) : null;
        $total_pengeluaran = isset($data['total_pengeluaran']) ? floatval($data['total_pengeluaran']) : null;

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify ownership and fetch current status
        $chk = $conn->prepare(
            "SELECT id, status, total_penerimaan, total_pengeluaran, saldo
             FROM realisasi_bos WHERE id = ? AND sekolah_id = ?"
        );
        $chk->bind_param("ii", $id, $sekolah_id);
        $chk->execute();
        $chk_result = $chk->get_result();
        if ($chk_result->num_rows === 0) {
            sendError('Realisasi tidak ditemukan atau bukan milik sekolah Anda', 404);
        }

        $realisasi_row = $chk_result->fetch_assoc();

        // Only allow updates if status is draft or pembinaan
        if (!in_array($realisasi_row['status'], ['draft', 'pembinaan'])) {
            sendError('Realisasi tidak dapat diubah karena statusnya: ' . $realisasi_row['status'], 400);
        }

        if ($action === 'submit') {
            $stmt = $conn->prepare(
                "UPDATE realisasi_bos SET status = 'submitted', tanggal_submit = NOW() WHERE id = ? AND sekolah_id = ?"
            );
            $stmt->bind_param("ii", $id, $sekolah_id);
            $msg = 'Realisasi berhasil disubmit';
        } else {
            // Regular update
            $new_penerimaan  = $total_penerimaan  !== null ? $total_penerimaan  : floatval($realisasi_row['total_penerimaan']);
            $new_pengeluaran = $total_pengeluaran !== null ? $total_pengeluaran : floatval($realisasi_row['total_pengeluaran']);
            $new_saldo       = $new_penerimaan - $new_pengeluaran;

            $stmt = $conn->prepare(
                "UPDATE realisasi_bos
                 SET total_penerimaan = ?, total_pengeluaran = ?, saldo = ?
                 WHERE id = ? AND sekolah_id = ?"
            );
            $stmt->bind_param("dddii", $new_penerimaan, $new_pengeluaran, $new_saldo, $id, $sekolah_id);
            $msg = 'Realisasi berhasil diupdate';
        }

        if ($stmt->execute()) {
            sendResponse(['message' => $msg]);
        } else {
            sendError('Gagal mengupdate realisasi: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
