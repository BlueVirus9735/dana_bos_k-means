<?php
// General Configuration
define('BASE_URL', 'http://localhost/dana_bos/backend');
define('PYTHON_SCRIPT_PATH', __DIR__ . '/../../python/kmeans.py');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost:3000';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
