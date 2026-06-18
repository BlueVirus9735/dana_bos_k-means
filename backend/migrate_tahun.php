<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/db.php';

$queries = [
    "ALTER TABLE kecamatan ADD COLUMN tahun_ajaran VARCHAR(20) NOT NULL DEFAULT '2024/2025'",
];

foreach ($queries as $q) {
    try {
        if (!$conn->query($q)) {
            echo "Failed or skipped: " . $conn->error . "\n";
        } else {
            echo "Success: $q\n";
        }
    } catch (Exception $e) {
        echo "Exception (skipped): " . $e->getMessage() . "\n";
    }
}
echo "Migration finished.\n";
?>
