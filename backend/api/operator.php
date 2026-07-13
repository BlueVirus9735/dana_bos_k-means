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
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare(
                "SELECT o.id, o.username, o.nama, o.email, o.sekolah_id, o.is_active,
                        o.created_at, o.updated_at,
                        s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
                 FROM operator_sekolah o
                 JOIN sekolah s ON o.sekolah_id = s.id
                 JOIN kecamatan k ON s.kecamatan_id = k.id
                 WHERE o.id = ?"
            );
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                sendError('Operator tidak ditemukan', 404);
            }
            sendResponse($result->fetch_assoc());
        } else {
            $result = $conn->query(
                "SELECT o.id, o.username, o.nama, o.email, o.sekolah_id, o.is_active,
                        o.created_at, o.updated_at,
                        s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
                 FROM operator_sekolah o
                 JOIN sekolah s ON o.sekolah_id = s.id
                 JOIN kecamatan k ON s.kecamatan_id = k.id
                 ORDER BY s.nama_sekolah ASC"
            );

            $operators = [];
            while ($row = $result->fetch_assoc()) {
                $operators[] = $row;
            }
            sendResponse($operators);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $username   = sanitizeInput($data['username'] ?? '');
        $password   = $data['password'] ?? '';
        $nama       = sanitizeInput($data['nama'] ?? '');
        $email      = sanitizeInput($data['email'] ?? '');
        $sekolah_id = intval($data['sekolah_id'] ?? 0);

        if (empty($username) || empty($password) || empty($nama) || $sekolah_id === 0) {
            sendError('Username, password, nama, dan sekolah_id harus diisi', 400);
        }

        if (strlen($password) < 6) {
            sendError('Password minimal 6 karakter', 400);
        }

        // Check sekolah not already have operator
        $chk = $conn->prepare("SELECT id FROM operator_sekolah WHERE sekolah_id = ?");
        $chk->bind_param("i", $sekolah_id);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            sendError('Sekolah ini sudah memiliki operator', 409);
        }

        // Check username unique
        $chk2 = $conn->prepare("SELECT id FROM operator_sekolah WHERE username = ?");
        $chk2->bind_param("s", $username);
        $chk2->execute();
        if ($chk2->get_result()->num_rows > 0) {
            sendError('Username sudah digunakan', 409);
        }

        $hashed = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $conn->prepare(
            "INSERT INTO operator_sekolah (username, password, nama, email, sekolah_id)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssssi", $username, $hashed, $nama, $email, $sekolah_id);

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Operator berhasil ditambahkan',
                'id'      => $conn->insert_id
            ], 201);
        } else {
            sendError('Gagal menambahkan operator: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id         = intval($data['id'] ?? 0);
        $username   = sanitizeInput($data['username'] ?? '');
        $nama       = sanitizeInput($data['nama'] ?? '');
        $email      = sanitizeInput($data['email'] ?? '');
        $sekolah_id = intval($data['sekolah_id'] ?? 0);
        $is_active  = isset($data['is_active']) ? intval($data['is_active']) : null;
        $password   = $data['password'] ?? '';

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Check exists
        $chk = $conn->prepare("SELECT id FROM operator_sekolah WHERE id = ?");
        $chk->bind_param("i", $id);
        $chk->execute();
        if ($chk->get_result()->num_rows === 0) {
            sendError('Operator tidak ditemukan', 404);
        }

        // Check username uniqueness (excluding current)
        if (!empty($username)) {
            $chk2 = $conn->prepare("SELECT id FROM operator_sekolah WHERE username = ? AND id != ?");
            $chk2->bind_param("si", $username, $id);
            $chk2->execute();
            if ($chk2->get_result()->num_rows > 0) {
                sendError('Username sudah digunakan', 409);
            }
        }

        // Check sekolah uniqueness (excluding current)
        if ($sekolah_id > 0) {
            $chk3 = $conn->prepare("SELECT id FROM operator_sekolah WHERE sekolah_id = ? AND id != ?");
            $chk3->bind_param("ii", $sekolah_id, $id);
            $chk3->execute();
            if ($chk3->get_result()->num_rows > 0) {
                sendError('Sekolah ini sudah memiliki operator lain', 409);
            }
        }

        if (!empty($password)) {
            if (strlen($password) < 6) {
                sendError('Password minimal 6 karakter', 400);
            }
            $hashed = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $conn->prepare(
                "UPDATE operator_sekolah
                 SET username = ?, nama = ?, email = ?, sekolah_id = ?, is_active = ?, password = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("sssiisi", $username, $nama, $email, $sekolah_id, $is_active, $hashed, $id);
        } else {
            $stmt = $conn->prepare(
                "UPDATE operator_sekolah
                 SET username = ?, nama = ?, email = ?, sekolah_id = ?, is_active = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("sssiii", $username, $nama, $email, $sekolah_id, $is_active, $id);
        }

        if ($stmt->execute()) {
            sendResponse(['message' => 'Operator berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate operator: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        $stmt = $conn->prepare("DELETE FROM operator_sekolah WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) {
                sendError('Operator tidak ditemukan', 404);
            }
            sendResponse(['message' => 'Operator berhasil dihapus']);
        } else {
            sendError('Gagal menghapus operator: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
