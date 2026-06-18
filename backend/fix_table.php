<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/db.php';

$sql = "
CREATE TABLE IF NOT EXISTS input_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    keterangan VARCHAR(255),
    jumlah_data INT NOT NULL DEFAULT 0,
    tanggal_input TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
);
";

try {
    if ($conn->query($sql)) {
        echo "Table input_history created successfully.\n";
    } else {
        echo "Error: " . $conn->error . "\n";
    }
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
?>
