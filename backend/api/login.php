<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = sanitizeInput($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendError('Username dan password harus diisi', 400);
    }

    require_once '../includes/db.php';

    // --- Try admin table first ---
    $stmt = $conn->prepare("SELECT id, username, password, nama, email FROM admin WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $admin = $result->fetch_assoc();
        if (password_verify($password, $admin['password'])) {
            startSession();
            $_SESSION['admin_id']       = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            $_SESSION['admin_nama']     = $admin['nama'];
            $_SESSION['role']           = 'admin';

            sendResponse([
                'message' => 'Login berhasil',
                'role'    => 'admin',
                'user'    => [
                    'id'       => $admin['id'],
                    'username' => $admin['username'],
                    'nama'     => $admin['nama'],
                    'email'    => $admin['email']
                ]
            ]);
        } else {
            sendError('Username atau password salah', 401);
        }
    }

    // --- Try operator_sekolah table ---
    $stmt2 = $conn->prepare("SELECT id, username, password, nama, email, sekolah_id, is_active FROM operator_sekolah WHERE username = ?");
    $stmt2->bind_param("s", $username);
    $stmt2->execute();
    $result2 = $stmt2->get_result();

    if ($result2->num_rows === 0) {
        sendError('Username atau password salah', 401);
    }

    $operator = $result2->fetch_assoc();

    if (!$operator['is_active']) {
        sendError('Akun operator tidak aktif. Hubungi Admin Dinas.', 403);
    }

    if (password_verify($password, $operator['password'])) {
        startSession();
        $_SESSION['operator_id']       = $operator['id'];
        $_SESSION['operator_username'] = $operator['username'];
        $_SESSION['operator_nama']     = $operator['nama'];
        $_SESSION['sekolah_id']        = $operator['sekolah_id'];
        $_SESSION['role']              = 'operator';

        sendResponse([
            'message' => 'Login berhasil',
            'role'    => 'operator',
            'user'    => [
                'id'         => $operator['id'],
                'username'   => $operator['username'],
                'nama'       => $operator['nama'],
                'email'      => $operator['email'],
                'sekolah_id' => $operator['sekolah_id']
            ]
        ]);
    } else {
        sendError('Username atau password salah', 401);
    }

} elseif ($method === 'GET') {
    startSession();

    if (isset($_SESSION['admin_id'])) {
        sendResponse([
            'logged_in' => true,
            'role'      => 'admin',
            'user'      => [
                'id'       => $_SESSION['admin_id'],
                'username' => $_SESSION['admin_username'],
                'nama'     => $_SESSION['admin_nama']
            ]
        ]);
    } elseif (isset($_SESSION['operator_id'])) {
        sendResponse([
            'logged_in'  => true,
            'role'       => 'operator',
            'user'       => [
                'id'         => $_SESSION['operator_id'],
                'username'   => $_SESSION['operator_username'],
                'nama'       => $_SESSION['operator_nama'],
                'sekolah_id' => $_SESSION['sekolah_id']
            ]
        ]);
    } else {
        sendResponse(['logged_in' => false]);
    }

} elseif ($method === 'DELETE') {
    startSession();
    session_destroy();
    sendResponse(['message' => 'Logout berhasil']);

} else {
    sendError('Method tidak diizinkan', 405);
}
?>
