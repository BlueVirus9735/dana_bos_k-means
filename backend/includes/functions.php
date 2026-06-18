<?php
// Helper functions

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit();
}

function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function executePythonScript($scriptPath, $params = []) {
    $command = 'python ' . $scriptPath;
    
    foreach ($params as $key => $value) {
        $command .= ' ' . escapeshellarg($value);
    }
    
    $output = shell_exec($command);
    return $output;
}
?>
