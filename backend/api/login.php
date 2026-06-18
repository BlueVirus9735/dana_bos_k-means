<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = sanitizeInput($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendError('Username dan password harus diisi', 400);
    }
    
    require_once '../includes/db.php';
    
    $stmt = $conn->prepare("SELECT id, username, password, nama, email FROM admin WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Username atau password salah', 401);
    }
    
    $admin = $result->fetch_assoc();
    
    if (password_verify($password, $admin['password'])) {
        // Start session
        session_start();
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_nama'] = $admin['nama'];
        
        sendResponse([
            'message' => 'Login berhasil',
            'admin' => [
                'id' => $admin['id'],
                'username' => $admin['username'],
                'nama' => $admin['nama'],
                'email' => $admin['email']
            ]
        ]);
    } else {
        sendError('Username atau password salah', 401);
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if logged in
    session_start();
    if (isset($_SESSION['admin_id'])) {
        sendResponse([
            'logged_in' => true,
            'admin' => [
                'id' => $_SESSION['admin_id'],
                'username' => $_SESSION['admin_username'],
                'nama' => $_SESSION['admin_nama']
            ]
        ]);
    } else {
        sendResponse(['logged_in' => false]);
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Logout
    session_start();
    session_destroy();
    sendResponse(['message' => 'Logout berhasil']);
}
?>
