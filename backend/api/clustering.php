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

    $query = "
        SELECT
            k.id                        AS kecamatan_id,
            k.nama_kecamatan,
            COALESCE(SUM(ss.ruang_kelas_baik), 0) AS ruang_kelas_baik,
            COALESCE(SUM(ss.ruang_kelas_rusak_ringan), 0) AS ruang_kelas_rusak_ringan,
            COALESCE(SUM(ss.ruang_kelas_rusak_berat), 0) AS ruang_kelas_rusak_berat,
            COALESCE(SUM(ss.jumlah_ruang_kelas), 0) AS jumlah_ruang_kelas,
            COALESCE(SUM(ss.fasilitas_lapangan_olahraga), 0) AS fasilitas_lapangan_olahraga,
            COALESCE(SUM(ss.fasilitas_perpustakaan), 0) AS fasilitas_perpustakaan,
            COALESCE(SUM(ss.fasilitas_uks), 0) AS fasilitas_uks,
            COALESCE(SUM(ss.fasilitas_toilet), 0) AS fasilitas_toilet,
            COALESCE(SUM(ss.fasilitas_tempat_ibadah), 0) AS fasilitas_tempat_ibadah,
            COALESCE(SUM(ss.jumlah_rombongan_belajar), 0) AS jumlah_rombongan_belajar,
            COALESCE(SUM(ds.jumlah_siswa), 0)    AS total_siswa,
            COALESCE(SUM(ds.total_dana_bos), 0)  AS total_dana_bos,
            ROUND(COALESCE(SUM(ds.total_dana_bos), 0) * 0.20, 2) AS alokasi_sarpras
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

    // Validasi n_clusters tidak boleh lebih besar dari jumlah data
    if ($n_clusters > $result->num_rows) {
        sendError("n_clusters ($n_clusters) tidak boleh lebih besar dari jumlah kecamatan ({$result->num_rows})", 400);
    }

    $kecamatan_data   = [];
    $kecamatan_names  = [];
    $kecamatan_ids    = [];
    $kecamatan_raw    = [];

    while ($row = $result->fetch_assoc()) {
        $kecamatan_ids[]  = $row['kecamatan_id'];
        $kecamatan_names[]= $row['nama_kecamatan'];
        $kecamatan_raw[]  = $row;

        // 11 Fitur untuk K-Means
        $kecamatan_data[] = [
            intval($row['total_siswa']),
            intval($row['ruang_kelas_baik']),
            intval($row['ruang_kelas_rusak_ringan']),
            intval($row['ruang_kelas_rusak_berat']),
            intval($row['jumlah_ruang_kelas']),
            intval($row['fasilitas_lapangan_olahraga']),
            intval($row['fasilitas_perpustakaan']),
            intval($row['fasilitas_uks']),
            intval($row['fasilitas_toilet']),
            intval($row['fasilitas_tempat_ibadah']),
            intval($row['jumlah_rombongan_belajar']),
            floatval($row['alokasi_sarpras']),
        ];
    }

    $python_input_b64 = base64_encode(json_encode([
        'data'            => $kecamatan_data,
        'kecamatan_names' => $kecamatan_names,
        'n_clusters'      => $n_clusters,
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

    foreach ($python_result['kecamatan_results'] as $index => $kec_result) {
        $kecamatan_id  = $kecamatan_ids[$index];
        $raw           = $kecamatan_raw[$index];
        $kategori      = $kec_result['kategori'];
        $nilai_cluster = floatval($kec_result['nilai_cluster']);
        $d             = $kec_result['data'];

        $total_dana_bos   = floatval($raw['total_dana_bos']);
        $alokasi_sarpras  = floatval($raw['alokasi_sarpras']);

        // isid + 11 i + 2 d = isid iiiiiiiiiii dd
        $insert_stmt->bind_param(
            "isidiiiiiiiiiiidd",
            $kecamatan_id,
            $tahun_ajaran,
            $kategori,
            $nilai_cluster,
            $raw['total_siswa'], $raw['ruang_kelas_baik'], $raw['ruang_kelas_rusak_ringan'], $raw['ruang_kelas_rusak_berat'], $raw['jumlah_ruang_kelas'],
            $raw['fasilitas_lapangan_olahraga'], $raw['fasilitas_perpustakaan'], $raw['fasilitas_uks'], $raw['fasilitas_toilet'], $raw['fasilitas_tempat_ibadah'],
            $raw['jumlah_rombongan_belajar'],
            $total_dana_bos,
            $alokasi_sarpras
        );
        $insert_stmt->execute();
    }

    // Simpan detail perhitungan — ambil last insert_id dari loop sebelumnya
    $cluster_centers = $python_result['cluster_centers_normalized'] ?? [];
    $inertia         = $python_result['inertia'] ?? 0;

    // Gunakan insert_id dari insert terakhir (hindari race condition MAX(id))
    $hasil_cluster_id = $conn->insert_id;

    if (!empty($cluster_centers) && $hasil_cluster_id) {
        // Simpan rata-rata semua dimensi tiap cluster center (bukan hanya dimensi [0])
        $c1 = !empty($cluster_centers[0]) ? floatval(array_sum($cluster_centers[0]) / count($cluster_centers[0])) : 0;
        $c2 = !empty($cluster_centers[1]) ? floatval(array_sum($cluster_centers[1]) / count($cluster_centers[1])) : 0;
        $c3 = !empty($cluster_centers[2]) ? floatval(array_sum($cluster_centers[2]) / count($cluster_centers[2])) : 0;
        $detail_stmt = $conn->prepare("INSERT INTO detail_perhitungan (hasil_cluster_id, iterasi, cluster_center_1, cluster_center_2, cluster_center_3, inertia) VALUES (?, 1, ?, ?, ?, ?)");
        $detail_stmt->bind_param("idddd", $hasil_cluster_id, $c1, $c2, $c3, $inertia);
        $detail_stmt->execute();
    }

    sendResponse([
        'message'      => 'Clustering berhasil',
        'results'      => $python_result,
        'tahun_ajaran' => $tahun_ajaran,
    ]);

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? date('Y'));

    $query = "
        SELECT
            hc.*,
            k.nama_kecamatan
        FROM hasil_cluster hc
        JOIN kecamatan k ON hc.kecamatan_id = k.id
        WHERE hc.tahun_ajaran = ?
        ORDER BY hc.cluster_kategori DESC, k.nama_kecamatan ASC
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $tahun_ajaran);
    $stmt->execute();
    $result = $stmt->get_result();

    $results = [];
    while ($row = $result->fetch_assoc()) {
        $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1] ?? 'Rendah';
        $results[] = $row;
    }

    sendResponse($results);
}
