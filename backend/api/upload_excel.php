<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

session_start();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['excel_file'])) {
        sendError('File tidak ditemukan', 400);
    }
    
    $file = $_FILES['excel_file'];
    $tahun_ajaran = sanitizeInput($_POST['tahun_ajaran'] ?? date('Y'));
    
    // Validate file
    $allowed_extensions = ['xlsx', 'xls'];
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, $allowed_extensions)) {
        sendError('Format file tidak valid. Gunakan .xlsx atau .xls', 400);
    }
    
    // Load PhpSpreadsheet
    require '../vendor/autoload.php';
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file['tmp_name']);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        
        // Skip header row
        $header = array_shift($rows);
        
        $success_count = 0;
        $error_count = 0;
        $errors = [];
        
        foreach ($rows as $row) {
            // Expected format: npsn, nama_sekolah, nama_kecamatan, jenjang, jumlah_siswa, jumlah_ruang_kelas, jumlah_fasilitas, total_dana_bos, alokasi_dana_sarpras
            $npsn = sanitizeInput($row[0] ?? '');
            $nama_sekolah = sanitizeInput($row[1] ?? '');
            $nama_kecamatan = sanitizeInput($row[2] ?? '');
            $jenjang = sanitizeInput($row[3] ?? '');
            $jumlah_siswa = intval($row[4] ?? 0);
            $jumlah_ruang_kelas = intval($row[5] ?? 0);
            $jumlah_fasilitas = intval($row[6] ?? 0);
            $total_dana_bos = floatval($row[7] ?? 0);
            $alokasi_dana_sarpras = floatval($row[8] ?? 0);
            
            if (empty($npsn) || empty($nama_sekolah) || empty($nama_kecamatan)) {
                $error_count++;
                $errors[] = "Baris kosong atau data tidak lengkap";
                continue;
            }
            
            // Check or create kecamatan
            $stmt = $conn->prepare("SELECT id FROM kecamatan WHERE nama_kecamatan = ?");
            $stmt->bind_param("s", $nama_kecamatan);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $kecamatan = $result->fetch_assoc();
                $kecamatan_id = $kecamatan['id'];
            } else {
                // Create new kecamatan
                $kode_kecamatan = 'K' . str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
                $stmt = $conn->prepare("INSERT INTO kecamatan (nama_kecamatan, kode_kecamatan) VALUES (?, ?)");
                $stmt->bind_param("ss", $nama_kecamatan, $kode_kecamatan);
                $stmt->execute();
                $kecamatan_id = $conn->insert_id;
            }
            
            // Check or create sekolah
            $stmt = $conn->prepare("SELECT id FROM sekolah WHERE npsn = ?");
            $stmt->bind_param("s", $npsn);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $sekolah = $result->fetch_assoc();
                $sekolah_id = $sekolah['id'];
            } else {
                // Create new sekolah
                $stmt = $conn->prepare("INSERT INTO sekolah (npsn, nama_sekolah, kecamatan_id, jenjang) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("ssis", $npsn, $nama_sekolah, $kecamatan_id, $jenjang);
                $stmt->execute();
                $sekolah_id = $conn->insert_id;
            }
            
            // Insert or update data sekolah
            $stmt = $conn->prepare("INSERT INTO data_sekolah (sekolah_id, tahun_ajaran, jumlah_siswa, jumlah_ruang_kelas, jumlah_fasilitas, total_dana_bos, alokasi_dana_sarpras) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE jumlah_siswa = VALUES(jumlah_siswa), jumlah_ruang_kelas = VALUES(jumlah_ruang_kelas), jumlah_fasilitas = VALUES(jumlah_fasilitas), total_dana_bos = VALUES(total_dana_bos), alokasi_dana_sarpras = VALUES(alokasi_dana_sarpras)");
            $stmt->bind_param("isiiidd", $sekolah_id, $tahun_ajaran, $jumlah_siswa, $jumlah_ruang_kelas, $jumlah_fasilitas, $total_dana_bos, $alokasi_dana_sarpras);
            
            if ($stmt->execute()) {
                $success_count++;
            } else {
                $error_count++;
                $errors[] = "Gagal menyimpan data untuk sekolah: $nama_sekolah";
            }
        }
        
        // Log upload history
        $stmt = $conn->prepare("INSERT INTO upload_history (admin_id, nama_file, jumlah_data, status) VALUES (?, ?, ?, ?)");
        $status = ($error_count === 0) ? 'success' : 'partial';
        $stmt->bind_param("isis", $_SESSION['admin_id'], $file['name'], $success_count, $status);
        $stmt->execute();
        
        sendResponse([
            'message' => 'Upload selesai',
            'success_count' => $success_count,
            'error_count' => $error_count,
            'errors' => $errors
        ]);
        
    } catch (Exception $e) {
        sendError('Gagal memproses file: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method tidak diizinkan', 405);
}
?>
