<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? date('Y'));
    $format = sanitizeInput($_GET['format'] ?? 'json');
    
    if ($format === 'pdf') {
        // Generate PDF report
        require '../vendor/autoload.php';
        
        // Get clustering results
        $query = "
            SELECT 
                hc.*,
                k.nama_kecamatan
            FROM hasil_cluster hc
            JOIN kecamatan k ON hc.kecamatan_id = k.id
            WHERE hc.tahun_ajaran = ?
            ORDER BY hc.cluster_kategori DESC, k.nama_kecamatan ASC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $results = [];
        while ($row = $result->fetch_assoc()) {
            $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
            $results[] = $row;
        }
        
        // Create PDF
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        
        $pdf->SetCreator('Dana Bos Application');
        $pdf->SetAuthor('Dinas Pendidikan');
        $pdf->SetTitle('Laporan Analisis Kebutuhan Sarana Prasarana');
        
        $pdf->AddPage();
        
        // Title
        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, 'Laporan Analisis Kebutuhan Sarana Prasarana', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(0, 10, 'Tahun Ajaran: ' . $tahun_ajaran, 0, 1, 'C');
        $pdf->Ln(10);
        
        // Summary table
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 10, 'Ringkasan Hasil Clustering', 0, 1, 'L');
        $pdf->Ln(5);
        
        // Table header
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(30, 7, 'No', 1, 0, 'C');
        $pdf->Cell(50, 7, 'Kecamatan', 1, 0, 'C');
        $pdf->Cell(30, 7, 'Kategori', 1, 0, 'C');
        $pdf->Cell(25, 7, 'Siswa', 1, 0, 'C');
        $pdf->Cell(25, 7, 'R. Kelas', 1, 0, 'C');
        $pdf->Cell(25, 7, 'Fasilitas', 1, 0, 'C');
        $pdf->Cell(30, 7, 'Dana BOS', 1, 0, 'C');
        $pdf->Cell(30, 7, 'Alokasi', 1, 1, 'C');
        
        // Table data
        $pdf->SetFont('helvetica', '', 9);
        foreach ($results as $index => $row) {
            $pdf->Cell(30, 7, ($index + 1), 1, 0, 'C');
            $pdf->Cell(50, 7, $row['nama_kecamatan'], 1, 0, 'L');
            $pdf->Cell(30, 7, $row['kategori_nama'], 1, 0, 'C');
            $pdf->Cell(25, 7, number_format($row['jumlah_siswa_total']), 1, 0, 'C');
            $pdf->Cell(25, 7, number_format($row['jumlah_ruang_kelas_total']), 1, 0, 'C');
            $total_fasilitas = intval($row['fasilitas_lapangan_olahraga_total']) + intval($row['fasilitas_perpustakaan_total']) + intval($row['fasilitas_uks_total']) + intval($row['fasilitas_toilet_total']) + intval($row['fasilitas_tempat_ibadah_total']);
            $pdf->Cell(25, 7, number_format($total_fasilitas), 1, 0, 'C');
            $pdf->Cell(30, 7, 'Rp ' . number_format($row['total_dana_bos_total'], 0, ',', '.'), 1, 0, 'C');
            $pdf->Cell(30, 7, 'Rp ' . number_format($row['alokasi_dana_sarpras_total'], 0, ',', '.'), 1, 1, 'C');
        }
        
        // Output PDF
        $pdf->Output('laporan_clustering_' . $tahun_ajaran . '.pdf', 'D');
        exit();
        
    } else {
        // Return JSON data
        $query = "
            SELECT 
                hc.*,
                k.nama_kecamatan
            FROM hasil_cluster hc
            JOIN kecamatan k ON hc.kecamatan_id = k.id
            WHERE hc.tahun_ajaran = ?
            ORDER BY hc.cluster_kategori DESC, k.nama_kecamatan ASC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $results = [];
        while ($row = $result->fetch_assoc()) {
            $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
            $results[] = $row;
        }
        
        sendResponse($results);
    }
}
?>
