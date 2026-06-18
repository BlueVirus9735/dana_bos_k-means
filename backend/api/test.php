<?php
session_id('test');
session_start();
$_SESSION['admin_id'] = 1;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['tahun_ajaran'] = '2024/2025';
include 'x:/dana_bos_k-means/backend/api/ranking.php';
?>
