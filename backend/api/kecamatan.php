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
        // ?years=1 → gabungan distinct tahun_ajaran dari kecamatan + data_sekolah
        if (isset($_GET['years'])) {
            $result = $conn->query("
                SELECT tahun_ajaran FROM kecamatan   WHERE tahun_ajaran IS NOT NULL AND tahun_ajaran != ''
                UNION
                SELECT tahun_ajaran FROM data_sekolah WHERE tahun_ajaran IS NOT NULL AND tahun_ajaran != ''
                ORDER BY tahun_ajaran DESC
            ");
            $years = [];
            while ($row = $result->fetch_assoc()) {
                $years[] = $row['tahun_ajaran'];
            }
            sendResponse($years);
            break;
        }

        // ?aggregate=1&tahun_ajaran=X → agregasi sarpras sekolah per kecamatan
        if (isset($_GET['aggregate'])) {
            $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

            $sql = "
                SELECT
                    k.id                                            AS kecamatan_id,
                    k.nama_kecamatan,
                    k.kode_kecamatan,
                    COUNT(DISTINCT s.id)                            AS jumlah_sekolah,
                    COUNT(DISTINCT ss.id)                           AS sekolah_sudah_isi,
                    COALESCE(SUM(ss.jumlah_ruang_kelas), 0)         AS jumlah_ruang_kelas,
                    COALESCE(SUM(ss.ruang_kelas_baik), 0)           AS ruang_kelas_baik,
                    COALESCE(SUM(ss.ruang_kelas_rusak_ringan), 0)   AS ruang_kelas_rusak_ringan,
                    COALESCE(SUM(ss.ruang_kelas_rusak_berat), 0)    AS ruang_kelas_rusak_berat,
                    COALESCE(SUM(ss.fasilitas_lapangan_olahraga), 0) AS fasilitas_lapangan_olahraga,
                    COALESCE(SUM(ss.fasilitas_perpustakaan), 0)     AS fasilitas_perpustakaan,
                    COALESCE(SUM(ss.fasilitas_uks), 0)              AS fasilitas_uks,
                    COALESCE(SUM(ss.fasilitas_toilet), 0)           AS fasilitas_toilet,
                    COALESCE(SUM(ss.fasilitas_tempat_ibadah), 0)    AS fasilitas_tempat_ibadah,
                    COALESCE(SUM(ss.jumlah_rombongan_belajar), 0)   AS jumlah_rombongan_belajar
                FROM kecamatan k
                LEFT JOIN sekolah s ON s.kecamatan_id = k.id
                LEFT JOIN sekolah_sarpras ss ON ss.sekolah_id = s.id
                    " . (!empty($tahun_ajaran) ? "AND ss.tahun_ajaran = ?" : "") . "
                GROUP BY k.id, k.nama_kecamatan, k.kode_kecamatan
                ORDER BY k.nama_kecamatan ASC
            ";

            $stmt = $conn->prepare($sql);
            if (!empty($tahun_ajaran)) {
                $stmt->bind_param('s', $tahun_ajaran);
            }
            $stmt->execute();
            $result = $stmt->get_result();

            $data = [];
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
            sendResponse($data);
            break;
        }

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

        // Special action: sync kecamatan from sekolah_sarpras aggregation
        if (isset($_GET['sync'])) {
            $tahun_ajaran = sanitizeInput($data['tahun_ajaran'] ?? '');
            if (empty($tahun_ajaran)) {
                sendError('tahun_ajaran harus diisi untuk sinkronisasi', 400);
            }

            // Get aggregated sarpras per kecamatan
            $agg_sql = "
                SELECT
                    k.id AS kecamatan_id,
                    k.tahun_ajaran AS kec_tahun,
                    COALESCE(SUM(ss.jumlah_ruang_kelas), 0)          AS jumlah_ruang_kelas,
                    COALESCE(SUM(ss.ruang_kelas_baik), 0)            AS ruang_kelas_baik,
                    COALESCE(SUM(ss.ruang_kelas_rusak_ringan), 0)    AS ruang_kelas_rusak_ringan,
                    COALESCE(SUM(ss.ruang_kelas_rusak_berat), 0)     AS ruang_kelas_rusak_berat,
                    COALESCE(SUM(ss.fasilitas_lapangan_olahraga), 0) AS fasilitas_lapangan_olahraga,
                    COALESCE(SUM(ss.fasilitas_perpustakaan), 0)      AS fasilitas_perpustakaan,
                    COALESCE(SUM(ss.fasilitas_uks), 0)               AS fasilitas_uks,
                    COALESCE(SUM(ss.fasilitas_toilet), 0)            AS fasilitas_toilet,
                    COALESCE(SUM(ss.fasilitas_tempat_ibadah), 0)     AS fasilitas_tempat_ibadah,
                    COALESCE(SUM(ss.jumlah_rombongan_belajar), 0)    AS jumlah_rombongan_belajar
                FROM kecamatan k
                LEFT JOIN sekolah s ON s.kecamatan_id = k.id
                LEFT JOIN sekolah_sarpras ss ON ss.sekolah_id = s.id AND ss.tahun_ajaran = ?
                GROUP BY k.id
            ";
            $agg_stmt = $conn->prepare($agg_sql);
            $agg_stmt->bind_param('s', $tahun_ajaran);
            $agg_stmt->execute();
            $rows = $agg_stmt->get_result();

            $upd = $conn->prepare("
                UPDATE kecamatan SET
                    tahun_ajaran = ?,
                    jumlah_ruang_kelas = ?, ruang_kelas_baik = ?,
                    ruang_kelas_rusak_ringan = ?, ruang_kelas_rusak_berat = ?,
                    fasilitas_lapangan_olahraga = ?, fasilitas_perpustakaan = ?,
                    fasilitas_uks = ?, fasilitas_toilet = ?, fasilitas_tempat_ibadah = ?,
                    jumlah_rombongan_belajar = ?
                WHERE id = ?
            ");

            $updated = 0;
            while ($r = $rows->fetch_assoc()) {
                $upd->bind_param('siiiiiiiiiii',
                    $tahun_ajaran,
                    $r['jumlah_ruang_kelas'], $r['ruang_kelas_baik'],
                    $r['ruang_kelas_rusak_ringan'], $r['ruang_kelas_rusak_berat'],
                    $r['fasilitas_lapangan_olahraga'], $r['fasilitas_perpustakaan'],
                    $r['fasilitas_uks'], $r['fasilitas_toilet'], $r['fasilitas_tempat_ibadah'],
                    $r['jumlah_rombongan_belajar'],
                    $r['kecamatan_id']
                );
                $upd->execute();
                $updated++;
            }

            sendResponse([
                'message'  => "Berhasil mensinkronisasi {$updated} kecamatan dari data sarpras sekolah",
                'updated'  => $updated,
                'tahun_ajaran' => $tahun_ajaran
            ]);
            break;
        }
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
