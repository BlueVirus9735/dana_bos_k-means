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

$tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

// ── Ambil daftar tahun yang tersedia di evaluasi_cluster ──────────────────────
if (isset($_GET['years'])) {
    $result = $conn->query("SELECT tahun_ajaran FROM evaluasi_cluster ORDER BY tahun_ajaran DESC");
    $years = [];
    while ($row = $result->fetch_assoc()) {
        $years[] = $row['tahun_ajaran'];
    }
    sendResponse($years);
    exit;
}

// ── Ambil data evaluasi DBI untuk tahun tertentu ──────────────────────────────
if (empty($tahun_ajaran)) {
    // Default ke tahun terbaru yang ada di evaluasi_cluster
    $res = $conn->query("SELECT tahun_ajaran FROM evaluasi_cluster ORDER BY tahun_ajaran DESC LIMIT 1");
    if ($res && $res->num_rows > 0) {
        $tahun_ajaran = $res->fetch_assoc()['tahun_ajaran'];
    } else {
        sendResponse([
            'exists' => false,
            'message' => 'Belum ada data evaluasi. Jalankan proses clustering terlebih dahulu.',
        ]);
        exit;
    }
}

$stmt = $conn->prepare("SELECT * FROM evaluasi_cluster WHERE tahun_ajaran = ? LIMIT 1");
$stmt->bind_param("s", $tahun_ajaran);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendResponse([
        'exists'       => false,
        'tahun_ajaran' => $tahun_ajaran,
        'message'      => 'Belum ada data evaluasi untuk tahun ini. Jalankan ulang proses clustering.',
    ]);
    exit;
}

$row = $result->fetch_assoc();

// Decode JSON fields
$sigma           = json_decode($row['sigma_json'], true) ?? [];
$inter_distances = json_decode($row['inter_distance_json'], true) ?? [];
$centroids       = json_decode($row['centroids_json'], true) ?? [];
$per_cluster     = json_decode($row['per_cluster_json'], true) ?? [];

// ── Ambil distribusi kecamatan per cluster (untuk konteks) ────────────────────
$dist_stmt = $conn->prepare("
    SELECT
        hc.cluster_kategori,
        COUNT(*) AS jumlah_kecamatan,
        SUM(hc.jumlah_siswa_total) AS total_siswa
    FROM hasil_cluster hc
    WHERE hc.tahun_ajaran = ?
    GROUP BY hc.cluster_kategori
    ORDER BY hc.cluster_kategori ASC
");
$dist_stmt->bind_param("s", $tahun_ajaran);
$dist_stmt->execute();
$dist_result = $dist_stmt->get_result();

$cat_map = [1 => 'Rendah', 2 => 'Sedang', 3 => 'Tinggi'];
$distribution = [];
while ($drow = $dist_result->fetch_assoc()) {
    $cat_id = intval($drow['cluster_kategori']);
    $distribution[] = [
        'cluster_id'       => $cat_id,
        'kategori'         => $cat_map[$cat_id] ?? "C{$cat_id}",
        'jumlah_kecamatan' => intval($drow['jumlah_kecamatan']),
        'total_siswa'      => intval($drow['total_siswa']),
    ];
}

// ── Merge distribusi ke per_cluster ───────────────────────────────────────────
$dist_map = [];
foreach ($distribution as $d) {
    $dist_map[$d['cluster_id']] = $d;
}
foreach ($per_cluster as &$pc) {
    $cid = intval($pc['cluster_id']);
    if (isset($dist_map[$cid])) {
        $pc['jumlah_kecamatan'] = $dist_map[$cid]['jumlah_kecamatan'];
        $pc['total_siswa']      = $dist_map[$cid]['total_siswa'];
    } else {
        $pc['jumlah_kecamatan'] = 0;
        $pc['total_siswa']      = 0;
    }
}
unset($pc);

// ── Interpretasi DBI ──────────────────────────────────────────────────────────
$dbi_score = floatval($row['dbi_score']);
if ($dbi_score < 1.0) {
    $interpretasi = ['label' => 'Sangat Baik', 'level' => 'good'];
} elseif ($dbi_score < 2.0) {
    $interpretasi = ['label' => 'Cukup Baik', 'level' => 'medium'];
} else {
    $interpretasi = ['label' => 'Perlu Ditinjau', 'level' => 'poor'];
}

sendResponse([
    'exists'          => true,
    'tahun_ajaran'    => $row['tahun_ajaran'],
    'n_clusters'      => intval($row['n_clusters']),
    'dbi_score'       => $dbi_score,
    'inertia'         => floatval($row['inertia']),
    'n_iterations'    => intval($row['n_iterations']),
    'interpretasi'    => $interpretasi,
    'sigma'           => $sigma,
    'inter_distances' => $inter_distances,
    'centroids'       => $centroids,
    'per_cluster'     => $per_cluster,
    'distribution'    => $distribution,
    'created_at'      => $row['created_at'],
    'updated_at'      => $row['updated_at'],
]);
