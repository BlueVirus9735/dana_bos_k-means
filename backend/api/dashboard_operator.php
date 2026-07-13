<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['operator_id'])) {
    sendError('Unauthorized. Hanya Operator Sekolah yang dapat mengakses endpoint ini.', 401);
}

require_once '../includes/db.php';

$method     = $_SERVER['REQUEST_METHOD'];
$sekolah_id = $_SESSION['sekolah_id'];

if ($method !== 'GET') {
    sendError('Method tidak diizinkan', 405);
}

// -------------------------------------------------------
// 1. Info Sekolah
// -------------------------------------------------------
$sekolah_stmt = $conn->prepare(
    "SELECT s.id, s.nama_sekolah, s.npsn, s.jenjang, s.alamat,
            k.nama_kecamatan, k.kode_kecamatan
     FROM sekolah s
     JOIN kecamatan k ON s.kecamatan_id = k.id
     WHERE s.id = ?"
);
$sekolah_stmt->bind_param("i", $sekolah_id);
$sekolah_stmt->execute();
$sekolah_result = $sekolah_stmt->get_result();

if ($sekolah_result->num_rows === 0) {
    sendError('Data sekolah tidak ditemukan', 404);
}
$info_sekolah = $sekolah_result->fetch_assoc();

// -------------------------------------------------------
// 2. Tahun Ajaran Aktif
// -------------------------------------------------------
$ta_result = $conn->query(
    "SELECT id, tahun_ajaran, status, batas_submit_rkas, batas_submit_laporan
     FROM tahun_ajaran_config WHERE status = 'aktif' LIMIT 1"
);
$tahun_ajaran_aktif = null;
if ($ta_result && $ta_result->num_rows > 0) {
    $tahun_ajaran_aktif = $ta_result->fetch_assoc();
}

// -------------------------------------------------------
// 3. RKAS Terkini (most recent by tahun_ajaran)
// -------------------------------------------------------
$rkas_stmt = $conn->prepare(
    "SELECT r.id, r.tahun_ajaran, r.status, r.catatan_revisi,
            r.tanggal_submit, r.tanggal_verifikasi, r.created_at, r.updated_at,
            (SELECT COUNT(*) FROM rkas_detail rd WHERE rd.rkas_id = r.id) AS jumlah_item,
            (SELECT COALESCE(SUM(rd2.jumlah), 0) FROM rkas_detail rd2 WHERE rd2.rkas_id = r.id) AS total_anggaran
     FROM rkas r
     WHERE r.sekolah_id = ?
     ORDER BY r.tahun_ajaran DESC
     LIMIT 1"
);
$rkas_stmt->bind_param("i", $sekolah_id);
$rkas_stmt->execute();
$rkas_result = $rkas_stmt->get_result();
$rkas_terkini = null;
if ($rkas_result->num_rows > 0) {
    $rkas_terkini = $rkas_result->fetch_assoc();
}

// -------------------------------------------------------
// 4. Realisasi Terkini (most recent by tahun_ajaran)
// -------------------------------------------------------
$real_stmt = $conn->prepare(
    "SELECT id, tahun_ajaran, status, total_penerimaan, total_pengeluaran, saldo,
            catatan_validasi, tanggal_submit, tanggal_validasi, created_at, updated_at
     FROM realisasi_bos
     WHERE sekolah_id = ?
     ORDER BY tahun_ajaran DESC
     LIMIT 1"
);
$real_stmt->bind_param("i", $sekolah_id);
$real_stmt->execute();
$real_result = $real_stmt->get_result();
$realisasi_terkini = null;
if ($real_result->num_rows > 0) {
    $realisasi_terkini = $real_result->fetch_assoc();
}

// -------------------------------------------------------
// 5. Sarpras Terkini (for active tahun ajaran if exists, else most recent)
// -------------------------------------------------------
$sarpras_terkini = null;
if ($tahun_ajaran_aktif) {
    $sarpras_stmt = $conn->prepare(
        "SELECT * FROM sekolah_sarpras WHERE sekolah_id = ? AND tahun_ajaran = ? LIMIT 1"
    );
    $sarpras_stmt->bind_param("is", $sekolah_id, $tahun_ajaran_aktif['tahun_ajaran']);
    $sarpras_stmt->execute();
    $sarpras_result = $sarpras_stmt->get_result();
    if ($sarpras_result->num_rows > 0) {
        $sarpras_terkini = $sarpras_result->fetch_assoc();
    }
}

// If not found for active year, get most recent
if (!$sarpras_terkini) {
    $sarpras_stmt2 = $conn->prepare(
        "SELECT * FROM sekolah_sarpras WHERE sekolah_id = ? ORDER BY tahun_ajaran DESC LIMIT 1"
    );
    $sarpras_stmt2->bind_param("i", $sekolah_id);
    $sarpras_stmt2->execute();
    $sarpras_result2 = $sarpras_stmt2->get_result();
    if ($sarpras_result2->num_rows > 0) {
        $sarpras_terkini = $sarpras_result2->fetch_assoc();
    }
}

// -------------------------------------------------------
// 6. Notifikasi
// -------------------------------------------------------
$notifikasi = [];

// Check RKAS revisi
if ($rkas_terkini && $rkas_terkini['status'] === 'revisi') {
    $catatan = !empty($rkas_terkini['catatan_revisi'])
        ? ' - ' . $rkas_terkini['catatan_revisi']
        : '';
    $notifikasi[] = [
        'type'    => 'warning',
        'message' => 'RKAS tahun ' . $rkas_terkini['tahun_ajaran'] . ' dikembalikan untuk direvisi' . $catatan,
        'link'    => 'rkas'
    ];
}

// Check realisasi pembinaan
if ($realisasi_terkini && $realisasi_terkini['status'] === 'pembinaan') {
    $catatan = !empty($realisasi_terkini['catatan_validasi'])
        ? ' - ' . $realisasi_terkini['catatan_validasi']
        : '';
    $notifikasi[] = [
        'type'    => 'warning',
        'message' => 'Laporan realisasi tahun ' . $realisasi_terkini['tahun_ajaran'] . ' membutuhkan perbaikan' . $catatan,
        'link'    => 'realisasi'
    ];
}

// Check deadline RKAS
if ($tahun_ajaran_aktif && !empty($tahun_ajaran_aktif['batas_submit_rkas'])) {
    $batas_rkas = $tahun_ajaran_aktif['batas_submit_rkas'];
    $today      = date('Y-m-d');
    $days_left  = (int) ceil((strtotime($batas_rkas) - strtotime($today)) / 86400);

    if ($days_left > 0 && $days_left <= 7) {
        // Check if rkas not yet submitted
        if (!$rkas_terkini || !in_array($rkas_terkini['status'], ['pending', 'disahkan'])) {
            $notifikasi[] = [
                'type'    => 'info',
                'message' => 'Batas submit RKAS tahun ' . $tahun_ajaran_aktif['tahun_ajaran'] . ' tinggal ' . $days_left . ' hari (' . $batas_rkas . ')',
                'link'    => 'rkas'
            ];
        }
    } elseif ($days_left <= 0) {
        if (!$rkas_terkini || !in_array($rkas_terkini['status'], ['pending', 'disahkan'])) {
            $notifikasi[] = [
                'type'    => 'danger',
                'message' => 'Batas waktu submit RKAS tahun ' . $tahun_ajaran_aktif['tahun_ajaran'] . ' sudah berakhir (' . $batas_rkas . ')',
                'link'    => 'rkas'
            ];
        }
    }
}

// Check deadline laporan/realisasi
if ($tahun_ajaran_aktif && !empty($tahun_ajaran_aktif['batas_submit_laporan'])) {
    $batas_laporan = $tahun_ajaran_aktif['batas_submit_laporan'];
    $today         = date('Y-m-d');
    $days_left     = (int) ceil((strtotime($batas_laporan) - strtotime($today)) / 86400);

    if ($days_left > 0 && $days_left <= 7) {
        if (!$realisasi_terkini || !in_array($realisasi_terkini['status'], ['submitted', 'terverifikasi'])) {
            $notifikasi[] = [
                'type'    => 'info',
                'message' => 'Batas submit laporan realisasi tinggal ' . $days_left . ' hari (' . $batas_laporan . ')',
                'link'    => 'realisasi'
            ];
        }
    } elseif ($days_left <= 0) {
        if (!$realisasi_terkini || !in_array($realisasi_terkini['status'], ['submitted', 'terverifikasi'])) {
            $notifikasi[] = [
                'type'    => 'danger',
                'message' => 'Batas waktu submit laporan realisasi sudah berakhir (' . $batas_laporan . ')',
                'link'    => 'realisasi'
            ];
        }
    }
}

// RKAS disahkan but no realisasi yet
if ($rkas_terkini && $rkas_terkini['status'] === 'disahkan' && !$realisasi_terkini) {
    $notifikasi[] = [
        'type'    => 'info',
        'message' => 'RKAS tahun ' . $rkas_terkini['tahun_ajaran'] . ' sudah disahkan. Silakan buat laporan realisasi.',
        'link'    => 'realisasi'
    ];
}

// No sarpras data yet for active year
if ($tahun_ajaran_aktif && !$sarpras_terkini) {
    $notifikasi[] = [
        'type'    => 'info',
        'message' => 'Belum ada data sarpras untuk tahun ajaran ' . $tahun_ajaran_aktif['tahun_ajaran'] . '. Silakan input data sarpras.',
        'link'    => 'sarpras'
    ];
}

// -------------------------------------------------------
// Build response
// -------------------------------------------------------
sendResponse([
    'info_sekolah'       => $info_sekolah,
    'tahun_ajaran_aktif' => $tahun_ajaran_aktif,
    'rkas_terkini'       => $rkas_terkini,
    'realisasi_terkini'  => $realisasi_terkini,
    'sarpras_terkini'    => $sarpras_terkini,
    'notifikasi'         => $notifikasi
]);
?>
