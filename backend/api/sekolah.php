<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get all sekolah or specific sekolah
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT s.*, k.nama_kecamatan FROM sekolah s JOIN kecamatan k ON s.kecamatan_id = k.id WHERE s.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendError('Sekolah tidak ditemukan', 404);
            }
            
            sendResponse($result->fetch_assoc());
        } else {
            $kecamatan_id = isset($_GET['kecamatan_id']) ? intval($_GET['kecamatan_id']) : 0;
            
            if ($kecamatan_id > 0) {
                $stmt = $conn->prepare("SELECT s.*, k.nama_kecamatan FROM sekolah s JOIN kecamatan k ON s.kecamatan_id = k.id WHERE s.kecamatan_id = ? ORDER BY s.nama_sekolah ASC");
                $stmt->bind_param("i", $kecamatan_id);
                $stmt->execute();
                $result = $stmt->get_result();
            } else {
                $result = $conn->query("SELECT s.*, k.nama_kecamatan FROM sekolah s JOIN kecamatan k ON s.kecamatan_id = k.id ORDER BY s.nama_sekolah ASC");
            }
            
            $sekolah = [];
            while ($row = $result->fetch_assoc()) {
                $sekolah[] = $row;
            }
            sendResponse($sekolah);
        }
        break;
        
    case 'POST':
        // Create new sekolah
        $data = json_decode(file_get_contents('php://input'), true);
        
        $npsn = sanitizeInput($data['npsn'] ?? '');
        $nama_sekolah = sanitizeInput($data['nama_sekolah'] ?? '');
        $kecamatan_id = intval($data['kecamatan_id'] ?? 0);
        $alamat = sanitizeInput($data['alamat'] ?? '');
        $jenjang = sanitizeInput($data['jenjang'] ?? '');
        
        if (empty($npsn) || empty($nama_sekolah) || $kecamatan_id === 0 || empty($jenjang)) {
            sendError('Data tidak lengkap', 400);
        }
        
        $stmt = $conn->prepare("INSERT INTO sekolah (npsn, nama_sekolah, kecamatan_id, alamat, jenjang) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssiss", $npsn, $nama_sekolah, $kecamatan_id, $alamat, $jenjang);
        
        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Sekolah berhasil ditambahkan',
                'id' => $conn->insert_id
            ], 201);
        } else {
            sendError('Gagal menambahkan sekolah', 500);
        }
        break;
        
    case 'PUT':
        // Update sekolah
        $data = json_decode(file_get_contents('php://input'), true);
        
        $id = intval($data['id'] ?? 0);
        $npsn = sanitizeInput($data['npsn'] ?? '');
        $nama_sekolah = sanitizeInput($data['nama_sekolah'] ?? '');
        $kecamatan_id = intval($data['kecamatan_id'] ?? 0);
        $alamat = sanitizeInput($data['alamat'] ?? '');
        $jenjang = sanitizeInput($data['jenjang'] ?? '');
        
        if ($id === 0 || empty($npsn) || empty($nama_sekolah) || $kecamatan_id === 0 || empty($jenjang)) {
            sendError('Data tidak lengkap', 400);
        }
        
        $stmt = $conn->prepare("UPDATE sekolah SET npsn = ?, nama_sekolah = ?, kecamatan_id = ?, alamat = ?, jenjang = ? WHERE id = ?");
        $stmt->bind_param("ssissi", $npsn, $nama_sekolah, $kecamatan_id, $alamat, $jenjang, $id);
        
        if ($stmt->execute()) {
            sendResponse(['message' => 'Sekolah berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate sekolah', 500);
        }
        break;
        
    case 'DELETE':
        // Delete sekolah
        $id = intval($_GET['id'] ?? 0);
        
        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }
        
        $stmt = $conn->prepare("DELETE FROM sekolah WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            sendResponse(['message' => 'Sekolah berhasil dihapus']);
        } else {
            sendError('Gagal menghapus sekolah', 500);
        }
        break;
        
    default:
        sendError('Method tidak diizinkan', 405);
}
?>
