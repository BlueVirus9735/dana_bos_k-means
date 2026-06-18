<?php
require 'x:/dana_bos_k-means/backend/includes/db.php';
$conn->query("INSERT IGNORE INTO hasil_cluster (kecamatan_id, tahun_ajaran, cluster_kategori, nilai_cluster, jumlah_siswa_total) VALUES (1, '2024/2025', 1, 100, 50)");
?>
