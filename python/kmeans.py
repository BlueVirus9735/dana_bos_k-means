#!/usr/bin/env python3
"""
K-Means Clustering for Dana BOS & Sarpras Analysis
11 Features:
1. Jumlah Siswa (benefit)
2. Total BOS (cost)
3. Dana Sarpras (cost)
4. Rombel (benefit)
5. Perpustakaan (cost)
6. Tempat Ibadah (cost)
7. Toilet (cost)
8. UKS (cost)
9. Ruang Kelas Baik (cost)
10. Ruang Kelas Rusak Ringan (benefit)
11. Ruang Kelas Rusak Berat (benefit)
"""

import sys
import json
import base64
import numpy as np

FEATURE_NAMES = [
    'jumlah_siswa',
    'total_dana_bos',
    'alokasi_sarpras',
    'jumlah_rombongan_belajar',
    'fasilitas_perpustakaan',
    'fasilitas_tempat_ibadah',
    'fasilitas_toilet',
    'fasilitas_uks',
    'ruang_kelas_baik',
    'ruang_kelas_rusak_ringan',
    'ruang_kelas_rusak_berat'
]

FEATURE_LABELS = [
    'Jumlah Siswa',
    'Total BOS',
    'Dana Sarpras',
    'Rombel',
    'Perpustakaan',
    'Tempat Ibadah',
    'Toilet',
    'UKS',
    'Ruang Kelas Baik',
    'Ruang Kelas Rusak Ringan',
    'Ruang Kelas Rusak Berat'
]

FEATURE_TYPES = [
    'benefit',
    'cost',
    'cost',
    'benefit',
    'cost',
    'cost',
    'cost',
    'cost',
    'cost',
    'benefit',
    'benefit'
]


def normalize_features(X_raw, feature_types=FEATURE_TYPES):
    """
    Normalisasi Min-Max dengan pemisahan kriteria Benefit dan Cost.
    - Benefit : (X - min) / (max - min)
    - Cost    : (max - X) / (max - min)
    """
    X_raw = np.array(X_raw, dtype=float)
    n_samples, n_features = X_raw.shape
    
    min_vals = np.min(X_raw, axis=0)
    max_vals = np.max(X_raw, axis=0)
    
    X_norm = np.zeros_like(X_raw)
    
    for j in range(n_features):
        range_val = max_vals[j] - min_vals[j]
        if range_val == 0:
            X_norm[:, j] = 0.0
            continue
            
        if feature_types[j] == 'benefit':
            # Benefit: semakin besar semakin tinggi nilai normalisasinya
            X_norm[:, j] = (X_raw[:, j] - min_vals[j]) / range_val
        else:
            # Cost: semakin kecil ketersediaannya semakin tinggi nilai kekurangannya
            X_norm[:, j] = (max_vals[j] - X_raw[:, j]) / range_val
            
    # Pembulatan 4 desimal seperti di Excel
    X_norm = np.round(X_norm, 4)
    
    return X_norm, min_vals, max_vals


def initialize_centroids(X_norm, kecamatan_names):
    """
    Inisialisasi centroid awal sesuai file Excel:
    - C1 (Rendah) = SUMBER
    - C2 (Sedang) = GEGESIK
    - C3 (Tinggi) = PANGENAN
    """
    n_samples, n_features = X_norm.shape
    kec_upper = [str(k).strip().upper() for k in kecamatan_names]
    
    # Cari index Sumber, Gegesik, Pangenan
    idx_c1 = None
    idx_c2 = None
    idx_c3 = None
    
    for i, name in enumerate(kec_upper):
        if 'SUMBER' in name and idx_c1 is None:
            idx_c1 = i
        elif 'GEGESIK' in name and idx_c2 is None:
            idx_c2 = i
        elif 'PANGENAN' in name and idx_c3 is None:
            idx_c3 = i
            
    # Fallback jika nama tidak ditemukan
    if idx_c1 is None:
        idx_c1 = 0
    if idx_c2 is None:
        idx_c2 = min(1, n_samples - 1)
    if idx_c3 is None:
        idx_c3 = min(2, n_samples - 1)
        
    c1 = X_norm[idx_c1].copy()
    c2 = X_norm[idx_c2].copy()
    c3 = X_norm[idx_c3].copy()
    
    centroids = np.array([c1, c2, c3], dtype=float)
    return centroids


def perform_kmeans_custom(data, kecamatan_names, max_iter=100):
    """
    Menjalankan algoritma K-Means 11 variabel murni sesuai lembar kerja Excel.
    """
    X_raw = np.array(data, dtype=float)
    n_samples, n_features = X_raw.shape
    
    # 1. Normalisasi Min-Max (Benefit vs Cost)
    X_norm, min_vals, max_vals = normalize_features(X_raw, FEATURE_TYPES)
    
    # 2. Inisialisasi Centroid Awal
    centroids = initialize_centroids(X_norm, kecamatan_names)
    
    # Riwayat iterasi
    iteration_history = []
    prev_clusters = np.zeros(n_samples, dtype=int)
    final_clusters = np.zeros(n_samples, dtype=int)
    final_distances = np.zeros((n_samples, 3), dtype=float)
    
    for it in range(1, max_iter + 1):
        # Simpan centroid sebelum iterasi ini
        centroids_before = centroids.copy()
        
        # Hitung jarak Euclidean tiap data ke tiap centroid: D = sqrt(sum((X - C)^2))
        distances = np.zeros((n_samples, 3), dtype=float)
        for k in range(3):
            diff = X_norm - centroids[k]
            distances[:, k] = np.sqrt(np.sum(diff ** 2, axis=1))
            
        # Penentuan klaster: klaster dengan jarak terpendek (1-based: 1, 2, 3)
        current_clusters = np.argmin(distances, axis=1) + 1
        
        # Hitung jumlah anggota per klaster
        counts = {
            1: int(np.sum(current_clusters == 1)),
            2: int(np.sum(current_clusters == 2)),
            3: int(np.sum(current_clusters == 3))
        }
        
        # Hitung perubahan anggota dibanding iterasi sebelumnya
        if it == 1:
            delta_a = n_samples
        else:
            delta_a = int(np.sum(current_clusters != prev_clusters))
            
        # Catat detail iterasi
        iter_record = {
            'iterasi': it,
            'centroids': np.round(centroids_before, 4).tolist(),
            'cluster_counts': counts,
            'delta_anggota': delta_a,
            'distances': np.round(distances, 4).tolist(),
            'clusters': current_clusters.tolist()
        }
        iteration_history.append(iter_record)
        
        final_clusters = current_clusters.copy()
        final_distances = distances.copy()
        
        # Cek kondisi berhenti: delta_a == 0 (konvergen)
        if it > 1 and delta_a == 0:
            break
            
        # Update centroid baru (rata-rata nilai anggota klaster)
        new_centroids = np.zeros((3, n_features), dtype=float)
        for k in range(3):
            cluster_mask = (current_clusters == (k + 1))
            if np.sum(cluster_mask) > 0:
                # Dibulatkan 4 desimal seperti Excel
                new_centroids[k] = np.round(np.mean(X_norm[cluster_mask], axis=0), 4)
            else:
                new_centroids[k] = centroids[k]
                
        centroids = new_centroids
        prev_clusters = current_clusters.copy()
        
    # Kategori mapping (Sesuai Konfigurasi):
    # Cluster 1 = Rendah
    # Cluster 2 = Sedang
    # Cluster 3 = Tinggi
    category_mapping = {
        1: {'kategori': 1, 'nama': 'Rendah', 'deskripsi': 'Kebutuhan Sarpras Rendah (Mandiri)'},
        2: {'kategori': 2, 'nama': 'Sedang', 'deskripsi': 'Kebutuhan Sarpras Sedang'},
        3: {'kategori': 3, 'nama': 'Tinggi', 'deskripsi': 'Kebutuhan Sarpras Tinggi (Prioritas Bantuan)'}
    }
    
    # Hitung nilai inertia (Total Within-Cluster Sum of Squares)
    inertia = 0.0
    for i in range(n_samples):
        cid = final_clusters[i]
        c_idx = cid - 1
        inertia += float(np.sum((X_norm[i] - centroids[c_idx]) ** 2))
        
    # Susun hasil per kecamatan
    kecamatan_results = []
    for i, name in enumerate(kecamatan_names):
        cid = int(final_clusters[i])
        c_idx = cid - 1
        dist_to_centroid = float(final_distances[i, c_idx])
        
        kecamatan_results.append({
            'kecamatan': name,
            'cluster_id': cid,
            'kategori': category_mapping[cid]['kategori'],
            'kategori_nama': category_mapping[cid]['nama'],
            'keterangan': category_mapping[cid]['deskripsi'],
            'data': X_raw[i].tolist(),
            'data_normalized': X_norm[i].tolist(),
            'distances': [float(final_distances[i, 0]), float(final_distances[i, 1]), float(final_distances[i, 2])],
            'nilai_cluster': round(dist_to_centroid, 4)
        })
        
    # Tabel Min-Max untuk keperluan tampilan di web
    min_max_table = []
    for j in range(n_features):
        min_max_table.append({
            'no': j + 1,
            'variabel': FEATURE_NAMES[j],
            'label': FEATURE_LABELS[j],
            'jenis': FEATURE_TYPES[j],
            'min': float(min_vals[j]),
            'max': float(max_vals[j]),
            'range': float(max_vals[j] - min_vals[j])
        })
        
    results = {
        'kecamatan_results': kecamatan_results,
        'cluster_centers_normalized': np.round(centroids, 4).tolist(),
        'iterations': iteration_history,
        'min_max_table': min_max_table,
        'n_clusters': 3,
        'n_iterations': len(iteration_history),
        'inertia': round(inertia, 4),
        'feature_names': FEATURE_NAMES,
        'feature_labels': FEATURE_LABELS,
        'feature_types': FEATURE_TYPES,
        'summary': {
            'c1_rendah': int(np.sum(final_clusters == 1)),
            'c2_sedang': int(np.sum(final_clusters == 2)),
            'c3_tinggi': int(np.sum(final_clusters == 3))
        }
    }
    
    return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input data provided'}))
        sys.exit(1)
        
    try:
        input_data_b64 = sys.argv[1]
        input_data = json.loads(base64.b64decode(input_data_b64).decode('utf-8'))
        
        data = input_data.get('data', [])
        kecamatan_names = input_data.get('kecamatan_names', [])
        
        if not data:
            print(json.dumps({'error': 'Data array is empty'}))
            sys.exit(1)
            
        if len(data) != len(kecamatan_names):
            print(json.dumps({'error': f'Length mismatch: data ({len(data)}) vs names ({len(kecamatan_names)})'}))
            sys.exit(1)
            
        results = perform_kmeans_custom(data, kecamatan_names)
        print(json.dumps(results))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()

