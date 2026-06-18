<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

session_start();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        /**
         * GET /data_bos.php
         *   ?tahun_ajaran=2024/2025  → semua data BOS tahun itu (per sekolah)
         *   ?years=1                 → daftar tahun ajaran yang tersedia
         *   ?sekolah_id=5&tahun_ajaran=X → satu entri spesifik
         */

        if (isset($_GET['years'])) {
            // Ambil daftar tahun ajaran yang tersedia
            $result = $conn->query("SELECT DISTINCT tahun_ajaran FROM data_sekolah ORDER BY tahun_ajaran DESC");
            $years = [];
            while ($row = $result->fetch_assoc()) {
                $years[] = $row['tahun_ajaran'];
            }
            sendResponse($years);
            break;
        }

        $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

        // Ambil semua sekolah beserta data BOS-nya, otomatis pakai tahun_ajaran dari kecamatan
        $query = "
            SELECT
                s.id            AS sekolah_id,
                s.npsn,
                s.nama_sekolah,
                s.jenjang,
                k.id            AS kecamatan_id,
                k.nama_kecamatan,
                k.tahun_ajaran,
                COALESCE(ds.id, 0)              AS data_id,
                COALESCE(ds.jumlah_siswa, 0)    AS jumlah_siswa,
                COALESCE(ds.total_dana_bos, 0)  AS total_dana_bos,
                ROUND(COALESCE(ds.total_dana_bos, 0) * 0.20, 2) AS alokasi_dana_sarpras
            FROM sekolah s
            JOIN kecamatan k ON s.kecamatan_id = k.id
            LEFT JOIN data_sekolah ds
                ON ds.sekolah_id = s.id
                AND ds.tahun_ajaran = k.tahun_ajaran
            ORDER BY k.nama_kecamatan ASC, s.nama_sekolah ASC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        sendResponse($data);
        break;

    case 'POST':
        /**
         * POST /data_bos.php
         * Body: {
         *   tahun_ajaran: "2024/2025",
         *   entries: [
         *     { sekolah_id: 1, jumlah_siswa: 200, total_dana_bos: 50000000 },
         *     ...
         *   ]
         * }
         */
        $data = json_decode(file_get_contents('php://input'), true);

        $entries      = $data['entries'] ?? [];

        if (empty($entries)) {
            sendError('Tidak ada data yang dikirim', 400);
        }

        $success_count = 0;
        $error_count   = 0;
        $errors        = [];

        $stmt = $conn->prepare("
            INSERT INTO data_sekolah (sekolah_id, tahun_ajaran, jumlah_siswa, total_dana_bos)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                jumlah_siswa  = VALUES(jumlah_siswa),
                total_dana_bos = VALUES(total_dana_bos),
                updated_at    = CURRENT_TIMESTAMP
        ");

        foreach ($entries as $entry) {
            $sekolah_id     = intval($entry['sekolah_id'] ?? 0);
            $total_dana_bos = floatval($entry['total_dana_bos'] ?? 0);
            $jumlah_siswa   = floor($total_dana_bos / 920000); // otomatis hitung jumlah siswa

            // Ambil tahun ajaran dari db jika tidak dikirim (meskipun frontend akan mengirimnya per entry)
            $tahun_ajaran_entry = sanitizeInput($entry['tahun_ajaran'] ?? '');
            if (empty($tahun_ajaran_entry)) {
                $res_thn = $conn->query("SELECT k.tahun_ajaran FROM sekolah s JOIN kecamatan k ON s.kecamatan_id = k.id WHERE s.id = $sekolah_id");
                if ($res_thn && $res_thn->num_rows > 0) {
                    $tahun_ajaran_entry = $res_thn->fetch_assoc()['tahun_ajaran'];
                } else {
                    $tahun_ajaran_entry = '2024/2025';
                }
            }

            if ($sekolah_id === 0) {
                $error_count++;
                $errors[] = "ID sekolah tidak valid";
                continue;
            }

            $stmt->bind_param("isid", $sekolah_id, $tahun_ajaran_entry, $jumlah_siswa, $total_dana_bos);

            if ($stmt->execute()) {
                $success_count++;
            } else {
                $error_count++;
                $errors[] = "Gagal menyimpan data sekolah ID $sekolah_id: " . $conn->error;
            }
        }

        // Log ke input_history (jika tabel ada)
        try {
            // Kita ambil tahun ajaran dari entry pertama sebagai perwakilan
            $thn_log = !empty($entries[0]['tahun_ajaran']) ? $entries[0]['tahun_ajaran'] : 'Global';
            $log_stmt = $conn->prepare("
                INSERT INTO input_history (admin_id, tahun_ajaran, keterangan, jumlah_data)
                VALUES (?, ?, 'Input manual data BOS', ?)
            ");
            if ($log_stmt) {
                $log_stmt->bind_param("isi", $_SESSION['admin_id'], $thn_log, $success_count);
                $log_stmt->execute();
            }
        } catch (Exception $e) {
            // Abaikan error log agar tidak merusak response JSON
        }

        sendResponse([
            'message'       => 'Data BOS berhasil disimpan',
            'tahun_ajaran'  => $thn_log ?? 'Global',
            'success_count' => $success_count,
            'error_count'   => $error_count,
            'errors'        => $errors,
        ]);
        break;

    case 'DELETE':
        /**
         * DELETE /data_bos.php?tahun_ajaran=2024/2025
         * Hapus semua data BOS untuk tahun tertentu
         */
        $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

        if (empty($tahun_ajaran)) {
            sendError('Tahun ajaran harus diisi', 400);
        }

        $stmt = $conn->prepare("DELETE FROM data_sekolah WHERE tahun_ajaran = ?");
        $stmt->bind_param("s", $tahun_ajaran);

        if ($stmt->execute()) {
            sendResponse([
                'message'        => "Data BOS tahun $tahun_ajaran berhasil dihapus",
                'rows_affected'  => $conn->affected_rows,
            ]);
        } else {
            sendError('Gagal menghapus data', 500);
        }
        break;

    default:
        sendError('Method tidak diizinkan', 405);
}
?>
