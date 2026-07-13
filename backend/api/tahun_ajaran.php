<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        // List all tahun ajaran, flag which one is aktif
        $result = $conn->query(
            "SELECT id, tahun_ajaran, status, batas_submit_rkas, batas_submit_laporan,
                    created_by, created_at, updated_at
             FROM tahun_ajaran_config
             ORDER BY tahun_ajaran DESC"
        );

        $list = [];
        $aktif = null;
        while ($row = $result->fetch_assoc()) {
            if ($row['status'] === 'aktif') {
                $aktif = $row;
            }
            $list[] = $row;
        }

        sendResponse([
            'data'  => $list,
            'aktif' => $aktif
        ]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $tahun_ajaran         = sanitizeInput($data['tahun_ajaran'] ?? '');
        $status               = sanitizeInput($data['status'] ?? 'aktif');
        $batas_submit_rkas    = !empty($data['batas_submit_rkas']) ? sanitizeInput($data['batas_submit_rkas']) : null;
        $batas_submit_laporan = !empty($data['batas_submit_laporan']) ? sanitizeInput($data['batas_submit_laporan']) : null;
        $created_by           = $_SESSION['admin_id'];

        if (empty($tahun_ajaran)) {
            sendError('Tahun ajaran harus diisi', 400);
        }

        $allowed_status = ['aktif', 'tutup', 'arsip'];
        if (!in_array($status, $allowed_status)) {
            sendError('Status tidak valid. Gunakan: aktif, tutup, atau arsip', 400);
        }

        // If new status is 'aktif', deactivate the previous active one
        if ($status === 'aktif') {
            $conn->query("UPDATE tahun_ajaran_config SET status = 'tutup' WHERE status = 'aktif'");
        }

        $stmt = $conn->prepare(
            "INSERT INTO tahun_ajaran_config (tahun_ajaran, status, batas_submit_rkas, batas_submit_laporan, created_by)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssssi", $tahun_ajaran, $status, $batas_submit_rkas, $batas_submit_laporan, $created_by);

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Tahun ajaran berhasil ditambahkan',
                'id'      => $conn->insert_id
            ], 201);
        } else {
            if ($conn->errno === 1062) {
                sendError('Tahun ajaran sudah ada', 409);
            }
            sendError('Gagal menambahkan tahun ajaran: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id                   = intval($data['id'] ?? 0);
        $status               = sanitizeInput($data['status'] ?? '');
        $batas_submit_rkas    = !empty($data['batas_submit_rkas']) ? sanitizeInput($data['batas_submit_rkas']) : null;
        $batas_submit_laporan = !empty($data['batas_submit_laporan']) ? sanitizeInput($data['batas_submit_laporan']) : null;

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Check exists
        $check = $conn->prepare("SELECT id FROM tahun_ajaran_config WHERE id = ?");
        $check->bind_param("i", $id);
        $check->execute();
        if ($check->get_result()->num_rows === 0) {
            sendError('Tahun ajaran tidak ditemukan', 404);
        }

        $allowed_status = ['aktif', 'tutup', 'arsip'];
        if (!empty($status) && !in_array($status, $allowed_status)) {
            sendError('Status tidak valid. Gunakan: aktif, tutup, atau arsip', 400);
        }

        // If setting to 'aktif', close the previous active one (excluding current)
        if ($status === 'aktif') {
            $deact = $conn->prepare("UPDATE tahun_ajaran_config SET status = 'tutup' WHERE status = 'aktif' AND id != ?");
            $deact->bind_param("i", $id);
            $deact->execute();
        }

        $stmt = $conn->prepare(
            "UPDATE tahun_ajaran_config
             SET status = ?, batas_submit_rkas = ?, batas_submit_laporan = ?
             WHERE id = ?"
        );
        $stmt->bind_param("sssi", $status, $batas_submit_rkas, $batas_submit_laporan, $id);

        if ($stmt->execute()) {
            sendResponse(['message' => 'Tahun ajaran berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate tahun ajaran: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Check if any rkas linked to this tahun_ajaran
        $check_stmt = $conn->prepare(
            "SELECT COUNT(*) AS cnt FROM rkas r
             JOIN tahun_ajaran_config t ON r.tahun_ajaran = t.tahun_ajaran
             WHERE t.id = ?"
        );
        $check_stmt->bind_param("i", $id);
        $check_stmt->execute();
        $check_res = $check_stmt->get_result()->fetch_assoc();

        if ($check_res['cnt'] > 0) {
            sendError('Tidak dapat menghapus tahun ajaran yang sudah memiliki data RKAS', 409);
        }

        $stmt = $conn->prepare("DELETE FROM tahun_ajaran_config WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) {
                sendError('Tahun ajaran tidak ditemukan', 404);
            }
            sendResponse(['message' => 'Tahun ajaran berhasil dihapus']);
        } else {
            sendError('Gagal menghapus tahun ajaran: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
