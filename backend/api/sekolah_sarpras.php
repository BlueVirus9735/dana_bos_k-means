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
            // Admin: can filter by tahun_ajaran and/or sekolah_id
            $tahun_ajaran = isset($_GET['tahun_ajaran']) ? sanitizeInput($_GET['tahun_ajaran']) : '';
            $sekolah_id   = isset($_GET['sekolah_id']) ? intval($_GET['sekolah_id']) : 0;

            $sql = "SELECT ss.*, s.nama_sekolah, s.npsn, s.jenjang, k.nama_kecamatan
                    FROM sekolah_sarpras ss
                    JOIN sekolah s ON ss.sekolah_id = s.id
                    JOIN kecamatan k ON s.kecamatan_id = k.id
                    WHERE 1=1";
            $types  = '';
            $params = [];

            if (!empty($tahun_ajaran)) {
                $sql    .= " AND ss.tahun_ajaran = ?";
                $types  .= 's';
                $params[] = $tahun_ajaran;
            }
            if ($sekolah_id > 0) {
                $sql    .= " AND ss.sekolah_id = ?";
                $types  .= 'i';
                $params[] = $sekolah_id;
            }
            $sql .= " ORDER BY s.nama_sekolah ASC";

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
        } else {
            // Operator: get their own sekolah sarpras
            $sekolah_id   = $_SESSION['sekolah_id'];
            $tahun_ajaran = isset($_GET['tahun_ajaran']) ? sanitizeInput($_GET['tahun_ajaran']) : '';

            $sql    = "SELECT ss.*, s.nama_sekolah, s.npsn, k.nama_kecamatan
                       FROM sekolah_sarpras ss
                       JOIN sekolah s ON ss.sekolah_id = s.id
                       JOIN kecamatan k ON s.kecamatan_id = k.id
                       WHERE ss.sekolah_id = ?";
            $types  = 'i';
            $params = [$sekolah_id];

            if (!empty($tahun_ajaran)) {
                $sql    .= " AND ss.tahun_ajaran = ?";
                $types  .= 's';
                $params[] = $tahun_ajaran;
            }
            $sql .= " ORDER BY ss.tahun_ajaran DESC";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();

            $list = [];
            while ($row = $result->fetch_assoc()) {
                $list[] = $row;
            }
            sendResponse($list);
        }
        break;

    case 'POST':
        if ($is_admin) {
            sendError('Admin tidak dapat menginput data sarpras. Gunakan akun Operator Sekolah.', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $sekolah_id                    = $_SESSION['sekolah_id'];
        $tahun_ajaran                  = sanitizeInput($data['tahun_ajaran'] ?? '');
        $ruang_kelas_baik              = intval($data['ruang_kelas_baik'] ?? 0);
        $ruang_kelas_rusak_ringan      = intval($data['ruang_kelas_rusak_ringan'] ?? 0);
        $ruang_kelas_rusak_berat       = intval($data['ruang_kelas_rusak_berat'] ?? 0);
        $jumlah_ruang_kelas            = intval($data['jumlah_ruang_kelas'] ?? 0);
        $fasilitas_lapangan_olahraga   = intval($data['fasilitas_lapangan_olahraga'] ?? 0);
        $fasilitas_perpustakaan        = intval($data['fasilitas_perpustakaan'] ?? 0);
        $fasilitas_uks                 = intval($data['fasilitas_uks'] ?? 0);
        $fasilitas_toilet              = intval($data['fasilitas_toilet'] ?? 0);
        $fasilitas_tempat_ibadah       = intval($data['fasilitas_tempat_ibadah'] ?? 0);
        $jumlah_rombongan_belajar      = intval($data['jumlah_rombongan_belajar'] ?? 0);

        if (empty($tahun_ajaran)) {
            sendError('Tahun ajaran harus diisi', 400);
        }

        // Check for duplicate
        $chk = $conn->prepare("SELECT id FROM sekolah_sarpras WHERE sekolah_id = ? AND tahun_ajaran = ?");
        $chk->bind_param("is", $sekolah_id, $tahun_ajaran);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            sendError('Data sarpras untuk tahun ajaran ini sudah ada. Gunakan method PUT untuk update.', 409);
        }

        $stmt = $conn->prepare(
            "INSERT INTO sekolah_sarpras
             (sekolah_id, tahun_ajaran, ruang_kelas_baik, ruang_kelas_rusak_ringan,
              ruang_kelas_rusak_berat, jumlah_ruang_kelas, fasilitas_lapangan_olahraga,
              fasilitas_perpustakaan, fasilitas_uks, fasilitas_toilet,
              fasilitas_tempat_ibadah, jumlah_rombongan_belajar)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param(
            "isiiiiiiiiii",
            $sekolah_id, $tahun_ajaran, $ruang_kelas_baik, $ruang_kelas_rusak_ringan,
            $ruang_kelas_rusak_berat, $jumlah_ruang_kelas, $fasilitas_lapangan_olahraga,
            $fasilitas_perpustakaan, $fasilitas_uks, $fasilitas_toilet,
            $fasilitas_tempat_ibadah, $jumlah_rombongan_belajar
        );

        if ($stmt->execute()) {
            sendResponse([
                'message' => 'Data sarpras berhasil disimpan',
                'id'      => $conn->insert_id
            ], 201);
        } else {
            sendError('Gagal menyimpan data sarpras: ' . $conn->error, 500);
        }
        break;

    case 'PUT':
        if ($is_admin) {
            sendError('Admin tidak dapat mengubah data sarpras. Gunakan akun Operator Sekolah.', 403);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $id                            = intval($data['id'] ?? 0);
        $sekolah_id                    = $_SESSION['sekolah_id'];
        $ruang_kelas_baik              = intval($data['ruang_kelas_baik'] ?? 0);
        $ruang_kelas_rusak_ringan      = intval($data['ruang_kelas_rusak_ringan'] ?? 0);
        $ruang_kelas_rusak_berat       = intval($data['ruang_kelas_rusak_berat'] ?? 0);
        $jumlah_ruang_kelas            = intval($data['jumlah_ruang_kelas'] ?? 0);
        $fasilitas_lapangan_olahraga   = intval($data['fasilitas_lapangan_olahraga'] ?? 0);
        $fasilitas_perpustakaan        = intval($data['fasilitas_perpustakaan'] ?? 0);
        $fasilitas_uks                 = intval($data['fasilitas_uks'] ?? 0);
        $fasilitas_toilet              = intval($data['fasilitas_toilet'] ?? 0);
        $fasilitas_tempat_ibadah       = intval($data['fasilitas_tempat_ibadah'] ?? 0);
        $jumlah_rombongan_belajar      = intval($data['jumlah_rombongan_belajar'] ?? 0);

        if ($id === 0) {
            sendError('ID tidak valid', 400);
        }

        // Verify record belongs to operator's sekolah
        $chk = $conn->prepare("SELECT id FROM sekolah_sarpras WHERE id = ? AND sekolah_id = ?");
        $chk->bind_param("ii", $id, $sekolah_id);
        $chk->execute();
        if ($chk->get_result()->num_rows === 0) {
            sendError('Data tidak ditemukan atau bukan milik sekolah Anda', 404);
        }

        $stmt = $conn->prepare(
            "UPDATE sekolah_sarpras
             SET ruang_kelas_baik = ?, ruang_kelas_rusak_ringan = ?, ruang_kelas_rusak_berat = ?,
                 jumlah_ruang_kelas = ?, fasilitas_lapangan_olahraga = ?, fasilitas_perpustakaan = ?,
                 fasilitas_uks = ?, fasilitas_toilet = ?, fasilitas_tempat_ibadah = ?,
                 jumlah_rombongan_belajar = ?
             WHERE id = ? AND sekolah_id = ?"
        );
        $stmt->bind_param(
            "iiiiiiiiiiii",
            $ruang_kelas_baik, $ruang_kelas_rusak_ringan, $ruang_kelas_rusak_berat,
            $jumlah_ruang_kelas, $fasilitas_lapangan_olahraga, $fasilitas_perpustakaan,
            $fasilitas_uks, $fasilitas_toilet, $fasilitas_tempat_ibadah,
            $jumlah_rombongan_belajar, $id, $sekolah_id
        );

        if ($stmt->execute()) {
            sendResponse(['message' => 'Data sarpras berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate data sarpras: ' . $conn->error, 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
