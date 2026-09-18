<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $data         = json_decode(file_get_contents('php://input'), true);
    $tahun_ajaran = sanitizeInput($data['tahun_ajaran'] ?? date('Y'));
    $n_clusters   = intval($data['n_clusters'] ?? 3);

    // Query 11 Fitur Agregasi per Kecamatan
    $query = "
        SELECT
            k.id                        AS kecamatan_id,
            k.nama_kecamatan,
            COALESCE(SUM(ds.jumlah_siswa), 0)    AS total_siswa,
            COALESCE(SUM(ds.total_dana_bos), 0)  AS total_dana_bos,
            ROUND(COALESCE(SUM(ds.total_dana_bos), 0) * 0.20, 2) AS alokasi_sarpras,
            COALESCE(SUM(ss.jumlah_rombongan_belajar), 0) AS jumlah_rombongan_belajar,
            COALESCE(SUM(ss.fasilitas_perpustakaan), 0) AS fasilitas_perpustakaan,
            COALESCE(SUM(ss.fasilitas_tempat_ibadah), 0) AS fasilitas_tempat_ibadah,
            COALESCE(SUM(ss.fasilitas_toilet), 0) AS fasilitas_toilet,
            COALESCE(SUM(ss.fasilitas_uks), 0) AS fasilitas_uks,
            COALESCE(SUM(ss.ruang_kelas_baik), 0) AS ruang_kelas_baik,
            COALESCE(SUM(ss.ruang_kelas_rusak_ringan), 0) AS ruang_kelas_rusak_ringan,
            COALESCE(SUM(ss.ruang_kelas_rusak_berat), 0) AS ruang_kelas_rusak_berat,
            COALESCE(SUM(ss.jumlah_ruang_kelas), 0) AS jumlah_ruang_kelas,
            COALESCE(SUM(ss.fasilitas_lapangan_olahraga), 0) AS fasilitas_lapangan_olahraga
        FROM kecamatan k
        LEFT JOIN sekolah s  ON k.id = s.kecamatan_id
        LEFT JOIN data_sekolah ds ON s.id = ds.sekolah_id AND ds.tahun_ajaran = ?
        LEFT JOIN sekolah_sarpras ss ON s.id = ss.sekolah_id AND ss.tahun_ajaran = ?
        GROUP BY k.id, k.nama_kecamatan
        ORDER BY k.nama_kecamatan ASC
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("ss", $tahun_ajaran, $tahun_ajaran);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        sendError('Tidak ada data kecamatan', 400);
    }

    $kecamatan_data   = [];
    $kecamatan_names  = [];
    $kecamatan_ids    = [];
    $kecamatan_raw    = [];

    while ($row = $result->fetch_assoc()) {
        $kecamatan_ids[]   = $row['kecamatan_id'];
        $kecamatan_names[] = $row['nama_kecamatan'];
        $kecamatan_raw[]   = $row;

        // 11 Fitur persis urutan di Excel:
        // 0: Siswa, 1: Total BOS, 2: Dana Sarpras, 3: Rombel, 4: Perpus,
        // 5: Ibadah, 6: Toilet, 7: UKS, 8: Baik, 9: Rusak Ringan, 10: Rusak Berat
        $kecamatan_data[] = [
            intval($row['total_siswa']),
            floatval($row['total_dana_bos']),
            floatval($row['alokasi_sarpras']),
            intval($row['jumlah_rombongan_belajar']),
            intval($row['fasilitas_perpustakaan']),
            intval($row['fasilitas_tempat_ibadah']),
            intval($row['fasilitas_toilet']),
            intval($row['fasilitas_uks']),
            intval($row['ruang_kelas_baik']),
            intval($row['ruang_kelas_rusak_ringan']),
            intval($row['ruang_kelas_rusak_berat']),
        ];
    }

    $python_input_b64 = base64_encode(json_encode([
        'data'            => $kecamatan_data,
        'kecamatan_names' => $kecamatan_names,
    ]));

    $python_script = PYTHON_SCRIPT_PATH;
    $command = escapeshellcmd('python') . ' ' . escapeshellarg($python_script) . ' ' . escapeshellarg($python_input_b64);
    $output  = shell_exec($command);

    if ($output === null) {
        sendError('Gagal menjalankan script Python', 500);
    }

    $python_result = json_decode($output, true);

    if (isset($python_result['error'])) {
        sendError('Python error: ' . $python_result['error'], 500);
    }

    // Hapus hasil lama untuk tahun ini
    $stmt = $conn->prepare("DELETE FROM hasil_cluster WHERE tahun_ajaran = ?");
    $stmt->bind_param("s", $tahun_ajaran);
    $stmt->execute();

    // Insert hasil baru
    $insert_stmt = $conn->prepare("
        INSERT INTO hasil_cluster
            (kecamatan_id, tahun_ajaran, cluster_kategori, nilai_cluster,
             jumlah_siswa_total, ruang_kelas_baik_total, ruang_kelas_rusak_ringan_total, ruang_kelas_rusak_berat_total, jumlah_ruang_kelas_total,
             fasilitas_lapangan_olahraga_total, fasilitas_perpustakaan_total, fasilitas_uks_total, fasilitas_toilet_total, fasilitas_tempat_ibadah_total,
             jumlah_rombongan_belajar_total,
             total_dana_bos_total, alokasi_dana_sarpras_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $first_inserted_id = 0;
    foreach ($python_result['kecamatan_results'] as $index => $kec_result) {
        $kecamatan_id  = $kecamatan_ids[$index];
        $raw           = $kecamatan_raw[$index];
        $kategori      = $kec_result['kategori'];
        $nilai_cluster = floatval($kec_result['nilai_cluster']);

        $total_dana_bos  = floatval($raw['total_dana_bos']);
        $alokasi_sarpras = floatval($raw['alokasi_sarpras']);

        $insert_stmt->bind_param(
            "isidiiiiiiiiiiidd",
            $kecamatan_id,
            $tahun_ajaran,
            $kategori,
            $nilai_cluster,
            $raw['total_siswa'],
            $raw['ruang_kelas_baik'],
            $raw['ruang_kelas_rusak_ringan'],
            $raw['ruang_kelas_rusak_berat'],
            $raw['jumlah_ruang_kelas'],
            $raw['fasilitas_lapangan_olahraga'],
            $raw['fasilitas_perpustakaan'],
            $raw['fasilitas_uks'],
            $raw['fasilitas_toilet'],
            $raw['fasilitas_tempat_ibadah'],
            $raw['jumlah_rombongan_belajar'],
            $total_dana_bos,
            $alokasi_sarpras
        );
        $insert_stmt->execute();
        if ($first_inserted_id === 0) {
            $first_inserted_id = $conn->insert_id;
        }
    }

    // Simpan detail iterasi ke tabel detail_perhitungan
    $iterations = $python_result['iterations'] ?? [];
    $inertia    = floatval($python_result['inertia'] ?? 0);

    if (!empty($iterations) && $first_inserted_id > 0) {
        $detail_stmt = $conn->prepare("INSERT INTO detail_perhitungan (hasil_cluster_id, iterasi, cluster_center_1, cluster_center_2, cluster_center_3, inertia) VALUES (?, ?, ?, ?, ?, ?)");
        
        foreach ($iterations as $it_row) {
            $it_num = intval($it_row['iterasi']);
            $cents  = $it_row['centroids'] ?? [];
            
            // Rata-rata 11 dimensi tiap centroid pada iterasi tersebut
            $c1_avg = !empty($cents[0]) ? floatval(array_sum($cents[0]) / count($cents[0])) : 0;
            $c2_avg = !empty($cents[1]) ? floatval(array_sum($cents[1]) / count($cents[1])) : 0;
            $c3_avg = !empty($cents[2]) ? floatval(array_sum($cents[2]) / count($cents[2])) : 0;

            $detail_stmt->bind_param("iidddd", $first_inserted_id, $it_num, $c1_avg, $c2_avg, $c3_avg, $inertia);
            $detail_stmt->execute();
        }
    }

    // ── Simpan hasil DBI ke tabel evaluasi_cluster ────────────────────────────
    $dbi = $python_result['dbi'] ?? null;
    if ($dbi !== null) {
        $dbi_score          = floatval($dbi['score'] ?? 0);
        $n_iterations_val   = intval($python_result['n_iterations'] ?? 0);
        $sigma_json         = json_encode($dbi['sigma'] ?? []);
        $inter_dist_json    = json_encode($dbi['inter_distances'] ?? []);
        $centroids_json     = json_encode($dbi['centroids_final'] ?? []);
        $per_cluster_json   = json_encode($dbi['per_cluster'] ?? []);

        $eval_stmt = $conn->prepare("
            INSERT INTO evaluasi_cluster
                (tahun_ajaran, n_clusters, dbi_score, inertia, n_iterations,
                 sigma_json, inter_distance_json, centroids_json, per_cluster_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                n_clusters          = VALUES(n_clusters),
                dbi_score           = VALUES(dbi_score),
                inertia             = VALUES(inertia),
                n_iterations        = VALUES(n_iterations),
                sigma_json          = VALUES(sigma_json),
                inter_distance_json = VALUES(inter_distance_json),
                centroids_json      = VALUES(centroids_json),
                per_cluster_json    = VALUES(per_cluster_json),
                updated_at          = CURRENT_TIMESTAMP
        ");

        if ($eval_stmt) {
            $eval_stmt->bind_param(
                "siidiisss",
                $tahun_ajaran,
                $n_clusters,
                $dbi_score,
                $inertia,
                $n_iterations_val,
                $sigma_json,
                $inter_dist_json,
                $centroids_json,
                $per_cluster_json
            );
            $eval_stmt->execute();
        }
    }

    sendResponse([
        'message'      => 'Clustering berhasil diproses',
        'results'      => $python_result,
        'tahun_ajaran' => $tahun_ajaran,
    ]);


} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? date('Y'));

    $query = "
        SELECT
            hc.*,
            k.nama_kecamatan,
            k.kode_kecamatan
        FROM hasil_cluster hc
        JOIN kecamatan k ON hc.kecamatan_id = k.id
        WHERE hc.tahun_ajaran = ?
        ORDER BY hc.cluster_kategori DESC, hc.nilai_cluster ASC
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $tahun_ajaran);
    $stmt->execute();
    $result = $stmt->get_result();

    $results = [];
    while ($row = $result->fetch_assoc()) {
        $cat_map = [1 => 'Rendah', 2 => 'Sedang', 3 => 'Tinggi'];
        $row['kategori_nama'] = $cat_map[intval($row['cluster_kategori'])] ?? 'Sedang';
        $results[] = $row;
    }

    sendResponse($results);
}
?>}
