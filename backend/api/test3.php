<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['tahun_ajaran'] = '2024/2025';
session_start();
$_SESSION['admin_id'] = 1;
require 'x:/dana_bos_k-means/backend/api/ranking.php';
