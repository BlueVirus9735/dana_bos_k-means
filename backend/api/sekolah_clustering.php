<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method tidak diizinkan', 405);
}

$kecamatan_id = intval($_GET['kecamatan_id'] ?? 0);
$tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

if ($kecamatan_id <= 0) {
    sendError('kecamatan_id tidak valid', 400);
}
if (empty($tahun_ajaran)) {
    sendError('tahun_ajaran harus diisi', 400);
}

// ── Ambil data sekolah + BOS + Sarpras untuk kecamatan ini ───────────────────
$query = "
    SELECT
        s.id                                            AS sekolah_id,
        s.npsn,
        s.nama_sekolah,
        s.jenjang,

        -- Fitur 1, 2, 3: BOS
        COALESCE(ds.jumlah_siswa, 0)                    AS jumlah_siswa,
        COALESCE(ds.total_dana_bos, 0)                  AS total_dana_bos,
        ROUND(COALESCE(ds.total_dana_bos, 0) * 0.20, 2) AS alokasi_sarpras,

        -- Fitur 4–11: Sarpras
        COALESCE(ss.jumlah_rombongan_belajar, 0)        AS jumlah_rombongan_belajar,
        COALESCE(ss.fasilitas_perpustakaan, 0)          AS fasilitas_perpustakaan,
        COALESCE(ss.fasilitas_tempat_ibadah, 0)         AS fasilitas_tempat_ibadah,
        COALESCE(ss.fasilitas_toilet, 0)                AS fasilitas_toilet,
        COALESCE(ss.fasilitas_uks, 0)                   AS fasilitas_uks,
        COALESCE(ss.ruang_kelas_baik, 0)                AS ruang_kelas_baik,
        COALESCE(ss.ruang_kelas_rusak_ringan, 0)        AS ruang_kelas_rusak_ringan,
        COALESCE(ss.ruang_kelas_rusak_berat, 0)         AS ruang_kelas_rusak_berat,

        -- Flag: apakah ada data sarpras?
        CASE WHEN ss.id IS NOT NULL THEN 1 ELSE 0 END   AS has_sarpras,
        CASE WHEN ds.id IS NOT NULL THEN 1 ELSE 0 END   AS has_bos

    FROM sekolah s
    LEFT JOIN data_sekolah ds
        ON ds.sekolah_id = s.id AND ds.tahun_ajaran = ?
    LEFT JOIN sekolah_sarpras ss
        ON ss.sekolah_id = s.id AND ss.tahun_ajaran = ?
    WHERE s.kecamatan_id = ?
    ORDER BY s.nama_sekolah ASC
";

$stmt = $conn->prepare($query);
$stmt->bind_param("ssi", $tahun_ajaran, $tahun_ajaran, $kecamatan_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendError('Tidak ada sekolah di kecamatan ini', 404);
}

$sekolah_data   = [];
$sekolah_names  = [];
$sekolah_info   = [];
$n_has_data     = 0;

while ($row = $result->fetch_assoc()) {
    $sekolah_names[] = $row['nama_sekolah'];
    $sekolah_info[]  = [
        'sekolah_id'  => intval($row['sekolah_id']),
        'npsn'        => $row['npsn'],
        'nama_sekolah'=> $row['nama_sekolah'],
        'jenjang'     => $row['jenjang'],
        'has_bos'     => intval($row['has_bos']),
        'has_sarpras' => intval($row['has_sarpras']),
        'jumlah_siswa'=> intval($row['jumlah_siswa']),
        'total_dana_bos' => floatval($row['total_dana_bos']),
    ];

    // 11 fitur sama persis dengan kecamatan-level
    $sekolah_data[] = [
        intval($row['jumlah_siswa']),
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

    if ($row['has_bos'] || $row['has_sarpras']) {
        $n_has_data++;
    }
}

$n_sekolah = count($sekolah_data);

// ── Cek: apakah ada cukup data untuk clustering? ─────────────────────────────
$warning = null;
if ($n_has_data === 0) {
    sendError("Tidak ada data BOS atau Sarpras untuk tahun ajaran {$tahun_ajaran} di kecamatan ini.", 422);
}
if ($n_has_data < $n_sekolah) {
    $warning = ($n_sekolah - $n_has_data) . " sekolah tidak memiliki data BOS/Sarpras dan ikut di-cluster dengan nilai nol.";
}

// ── Panggil Python K-Means mode sekolah ───────────────────────────────────────
$python_input_b64 = base64_encode(json_encode([
    'mode'          => 'sekolah',
    'data'          => $sekolah_data,
    'sekolah_names' => $sekolah_names,
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

// ── Merge info sekolah ke hasil clustering ────────────────────────────────────
$merged_results = [];
foreach ($python_result['sekolah_results'] as $idx => $res) {
    $info = $sekolah_info[$idx];
    $merged_results[] = array_merge($info, [
        'cluster_id'    => $res['cluster_id'],
        'kategori'      => $res['kategori'],
        'nilai_cluster' => $res['nilai_cluster'],
        'data'          => $res['data'],
        'data_normalized' => $res['data_normalized'],
    ]);
}

// Urutkan: Prioritas Utama dulu, lalu Perlu Perhatian, lalu Mandiri
usort($merged_results, function($a, $b) {
    return $b['cluster_id'] - $a['cluster_id'];
});

// Tambahkan ranking
foreach ($merged_results as $i => &$item) {
    $item['rank'] = $i + 1;
}
unset($item);

sendResponse([
    'kecamatan_id'  => $kecamatan_id,
    'tahun_ajaran'  => $tahun_ajaran,
    'n_sekolah'     => $n_sekolah,
    'n_has_data'    => $n_has_data,
    'warning'       => $warning,
    'n_clusters'    => $python_result['n_clusters'],
    'n_iterations'  => $python_result['n_iterations'],
    'inertia'       => $python_result['inertia'],
    'dbi_score'     => $python_result['dbi']['score'] ?? null,
    'summary'       => $python_result['summary'],
    'sekolah_results' => $merged_results,
]);
