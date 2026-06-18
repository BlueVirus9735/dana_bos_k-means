<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

session_start();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM kecamatan WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                sendError('Kecamatan tidak ditemukan', 404);
            }

            sendResponse($result->fetch_assoc());
        } else {
            $result = $conn->query("SELECT * FROM kecamatan ORDER BY nama_kecamatan ASC");
            $kecamatan = [];
            while ($row = $result->fetch_assoc()) {
                $kecamatan[] = $row;
            }
            sendResponse($kecamatan);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $nama_kecamatan        = sanitizeInput($data['nama_kecamatan'] ?? '');
        $kode_kecamatan        = sanitizeInput($data['kode_kecamatan'] ?? '');
        $tahun_ajaran          = sanitizeInput($data['tahun_ajaran'] ?? '2024/2025');
        
        $ruang_kelas_baik         = intval($data['ruang_kelas_baik'] ?? 0);
        $ruang_kelas_rusak_ringan = intval($data['ruang_kelas_rusak_ringan'] ?? 0);
        $ruang_kelas_rusak_berat  = intval($data['ruang_kelas_rusak_berat'] ?? 0);
        $jumlah_ruang_kelas       = intval($data['jumlah_ruang_kelas'] ?? 0);
        
        $fas_lapangan             = intval($data['fasilitas_lapangan_olahraga'] ?? 0);
        $fas_perpustakaan         = intval($data['fasilitas_perpustakaan'] ?? 0);
        $fas_uks                  = intval($data['fasilitas_uks'] ?? 0);
        $fas_toilet               = intval($data['fasilitas_toilet'] ?? 0);
        $fas_ibadah               = intval($data['fasilitas_tempat_ibadah'] ?? 0);
        
        $jumlah_rombel            = intval($data['jumlah_rombongan_belajar'] ?? 0);
        $latitude                 = isset($data['latitude']) && $data['latitude'] !== '' ? floatval($data['latitude']) : null;
        $longitude                = isset($data['longitude']) && $data['longitude'] !== '' ? floatval($data['longitude']) : null;

        if (empty($nama_kecamatan) || empty($kode_kecamatan)) {
            sendError('Nama kecamatan dan kode kecamatan harus diisi', 400);
        }

        $stmt = $conn->prepare("INSERT INTO kecamatan (
            nama_kecamatan, kode_kecamatan, tahun_ajaran,
            ruang_kelas_baik, ruang_kelas_rusak_ringan, ruang_kelas_rusak_berat, jumlah_ruang_kelas,
            fasilitas_lapangan_olahraga, fasilitas_perpustakaan, fasilitas_uks, fasilitas_toilet, fasilitas_tempat_ibadah,
            jumlah_rombongan_belajar, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param("sssiiiiiiiiiidd", 
            $nama_kecamatan, $kode_kecamatan, $tahun_ajaran,
            $ruang_kelas_baik, $ruang_kelas_rusak_ringan, $ruang_kelas_rusak_berat, $jumlah_ruang_kelas,
            $fas_lapangan, $fas_perpustakaan, $fas_uks, $fas_toilet, $fas_ibadah,
            $jumlah_rombel, $latitude, $longitude
        );

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Kecamatan berhasil ditambahkan',
                'id'      => $conn->insert_id
            ], 201);
        } else {
            sendError('Gagal menambahkan kecamatan: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);

        $id                    = intval($data['id'] ?? 0);
        $nama_kecamatan        = sanitizeInput($data['nama_kecamatan'] ?? '');
        $kode_kecamatan        = sanitizeInput($data['kode_kecamatan'] ?? '');
        $tahun_ajaran          = sanitizeInput($data['tahun_ajaran'] ?? '2024/2025');
        
        $ruang_kelas_baik         = intval($data['ruang_kelas_baik'] ?? 0);
        $ruang_kelas_rusak_ringan = intval($data['ruang_kelas_rusak_ringan'] ?? 0);
        $ruang_kelas_rusak_berat  = intval($data['ruang_kelas_rusak_berat'] ?? 0);
        $jumlah_ruang_kelas       = intval($data['jumlah_ruang_kelas'] ?? 0);
        
        $fas_lapangan             = intval($data['fasilitas_lapangan_olahraga'] ?? 0);
        $fas_perpustakaan         = intval($data['fasilitas_perpustakaan'] ?? 0);
        $fas_uks                  = intval($data['fasilitas_uks'] ?? 0);
        $fas_toilet               = intval($data['fasilitas_toilet'] ?? 0);
        $fas_ibadah               = intval($data['fasilitas_tempat_ibadah'] ?? 0);
        
        $jumlah_rombel            = intval($data['jumlah_rombongan_belajar'] ?? 0);
        $latitude                 = isset($data['latitude']) && $data['latitude'] !== '' ? floatval($data['latitude']) : null;
        $longitude                = isset($data['longitude']) && $data['longitude'] !== '' ? floatval($data['longitude']) : null;

        if ($id === 0 || empty($nama_kecamatan) || empty($kode_kecamatan)) {
            sendError('Data tidak lengkap', 400);
        }

        $stmt = $conn->prepare("UPDATE kecamatan SET 
            nama_kecamatan=?, kode_kecamatan=?, tahun_ajaran=?,
            ruang_kelas_baik=?, ruang_kelas_rusak_ringan=?, ruang_kelas_rusak_berat=?, jumlah_ruang_kelas=?,
            fasilitas_lapangan_olahraga=?, fasilitas_perpustakaan=?, fasilitas_uks=?, fasilitas_toilet=?, fasilitas_tempat_ibadah=?,
            jumlah_rombongan_belajar=?, latitude=?, longitude=? 
            WHERE id=?");
            
        $stmt->bind_param("sssiiiiiiiiiiddi", 
            $nama_kecamatan, $kode_kecamatan, $tahun_ajaran,
            $ruang_kelas_baik, $ruang_kelas_rusak_ringan, $ruang_kelas_rusak_berat, $jumlah_ruang_kelas,
            $fas_lapangan, $fas_perpustakaan, $fas_uks, $fas_toilet, $fas_ibadah,
            $jumlah_rombel, $latitude, $longitude, $id
        );

        if ($stmt->execute()) {
            sendResponse(['message' => 'Kecamatan berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate kecamatan: ' . $conn->error, 500);
        }
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        $stmt = $conn->prepare("DELETE FROM kecamatan WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            sendResponse(['message' => 'Kecamatan berhasil dihapus']);
        } else {
            sendError('Gagal menghapus kecamatan: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
