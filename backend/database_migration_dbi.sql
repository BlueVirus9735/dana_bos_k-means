-- Migration: Tambah tabel evaluasi_cluster untuk menyimpan hasil DBI
-- Jalankan file ini SATU KALI di phpMyAdmin atau MySQL client

USE dana_bos;

CREATE TABLE IF NOT EXISTS evaluasi_cluster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tahun_ajaran VARCHAR(20) NOT NULL,
    n_clusters INT NOT NULL DEFAULT 3,
    dbi_score DECIMAL(10, 4) NOT NULL,
    inertia DECIMAL(15, 4) NOT NULL,
    n_iterations INT NOT NULL DEFAULT 0,
    -- Sigma per cluster (JSON array)
    sigma_json TEXT NOT NULL,
    -- Matriks jarak antar centroid k×k (JSON array 2D)
    inter_distance_json TEXT NOT NULL,
    -- Centroid vektor final 11 dimensi (JSON array 2D)
    centroids_json TEXT NOT NULL,
    -- Detail per cluster: cluster_id, kategori, n_members, sigma, rij_max, centroid
    per_cluster_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_evaluasi_tahun (tahun_ajaran)
);
