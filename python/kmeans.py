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

    # Hitung Davies-Bouldin Index dari data final
    dbi_result = compute_dbi(X_norm, final_clusters, centroids, n_clusters=3)
    results['dbi'] = dbi_result

    return results



def compute_dbi(X_norm, final_clusters, centroids, n_clusters=3):
    """
    Menghitung Davies-Bouldin Index (DBI) secara manual.

    DBI = (1/k) * sum_i [ max_{j != i} ( (sigma_i + sigma_j) / d(ci, cj) ) ]

    Di mana:
    - sigma_i = rata-rata jarak titik dalam cluster i ke centroid-nya
    - d(ci, cj) = jarak Euclidean antar centroid i dan j

    Returns dict berisi score, sigma per cluster, matriks jarak antar centroid,
    detail per cluster (Rij_max), dan centroid final.
    """
    k = n_clusters
    X_norm = np.array(X_norm, dtype=float)

    # 1. Hitung sigma_i: rata-rata jarak intra-cluster tiap cluster
    sigma = np.zeros(k, dtype=float)
    for i in range(k):
        cluster_id = i + 1  # cluster id 1-based
        mask = (final_clusters == cluster_id)
        members = X_norm[mask]
        if len(members) == 0:
            sigma[i] = 0.0
        else:
            dists = np.sqrt(np.sum((members - centroids[i]) ** 2, axis=1))
            sigma[i] = float(np.mean(dists))

    # 2. Hitung matriks jarak antar centroid d(ci, cj)
    inter_dist = np.zeros((k, k), dtype=float)
    for i in range(k):
        for j in range(k):
            if i != j:
                diff = centroids[i] - centroids[j]
                inter_dist[i, j] = float(np.sqrt(np.sum(diff ** 2)))

    # 3. Hitung R_ij dan cari R_max tiap cluster
    R_max = np.zeros(k, dtype=float)
    for i in range(k):
        max_val = 0.0
        for j in range(k):
            if i != j and inter_dist[i, j] > 0:
                r_ij = (sigma[i] + sigma[j]) / inter_dist[i, j]
                if r_ij > max_val:
                    max_val = r_ij
        R_max[i] = max_val

    # 4. DBI = rata-rata R_max
    dbi_score = float(np.mean(R_max))

    # 5. Hitung jumlah anggota tiap cluster
    n_members = [int(np.sum(final_clusters == (i + 1))) for i in range(k)]

    # Nama kategori
    cat_names = {1: 'Rendah', 2: 'Sedang', 3: 'Tinggi'}

    per_cluster = []
    for i in range(k):
        per_cluster.append({
            'cluster_id': i + 1,
            'kategori': cat_names.get(i + 1, f'C{i+1}'),
            'n_members': n_members[i],
            'sigma': round(sigma[i], 4),
            'rij_max': round(float(R_max[i]), 4),
            'centroid': np.round(centroids[i], 4).tolist(),
        })

    # Matriks jarak sebagai list 2D
    inter_dist_list = np.round(inter_dist, 4).tolist()

    return {
        'score': round(dbi_score, 4),
        'sigma': [round(float(s), 4) for s in sigma],
        'inter_distances': inter_dist_list,
        'per_cluster': per_cluster,
        'centroids_final': np.round(centroids, 4).tolist(),
    }


def perform_kmeans_sekolah(data, sekolah_names, max_iter=100):
    """
    K-Means clustering pada level sekolah dalam satu kecamatan.

    Perbedaan dari perform_kmeans_custom:
    - Inisialisasi centroid otomatis: sort by skor kebutuhan (sum normalized),
      pilih indeks rendah / tengah / tinggi sebagai C1/C2/C3
    - Handle edge case: jika sekolah < 3, gunakan k = n_sekolah
    - Label: Mandiri / Perlu Perhatian / Prioritas Utama
    """
    X_raw = np.array(data, dtype=float)
    n_samples, n_features = X_raw.shape

    # Tentukan k berdasarkan jumlah sekolah
    k = min(3, n_samples)
    if k < 2:
        # Hanya 1 sekolah, masukkan ke klaster Prioritas Utama secara default
        cat_map_single = {1: ('Mandiri', 1), 2: ('Perlu Perhatian', 2), 3: ('Prioritas Utama', 3)}
        cat_name, cat_id = ('Prioritas Utama', 3)
        return {
            'sekolah_results': [{
                'nama': sekolah_names[0],
                'cluster_id': 3,
                'kategori': 'Prioritas Utama',
                'data': X_raw[0].tolist(),
                'data_normalized': [0.0] * n_features,
                'distances': [0.0, 0.0, 0.0],
                'nilai_cluster': 0.0,
            }],
            'n_clusters': 1,
            'n_iterations': 0,
            'inertia': 0.0,
            'summary': {'c1_mandiri': 0, 'c2_perhatian': 0, 'c3_prioritas': 1},
            'dbi': {'score': 0.0, 'sigma': [0.0], 'inter_distances': [[0.0]], 'per_cluster': [], 'centroids_final': []},
        }

    # 1. Normalisasi Min-Max (Benefit vs Cost) — sama seperti kecamatan
    X_norm, min_vals, max_vals = normalize_features(X_raw, FEATURE_TYPES)

    # 2. Inisialisasi centroid: sort by sum of normalized (proxy skor kebutuhan)
    #    Skor tinggi = kebutuhan tinggi → C3 (Prioritas Utama)
    #    Skor rendah = kebutuhan rendah → C1 (Mandiri)
    need_scores = np.sum(X_norm, axis=1)
    sorted_idx = np.argsort(need_scores)

    if k == 3:
        idx_c1 = sorted_idx[0]               # Kebutuhan terendah → Mandiri
        idx_c2 = sorted_idx[len(sorted_idx) // 2]  # Menengah
        idx_c3 = sorted_idx[-1]              # Kebutuhan tertinggi → Prioritas
        centroids = np.array([
            X_norm[idx_c1].copy(),
            X_norm[idx_c2].copy(),
            X_norm[idx_c3].copy(),
        ], dtype=float)
    else:  # k == 2
        idx_c1 = sorted_idx[0]
        idx_c3 = sorted_idx[-1]
        centroids = np.array([
            X_norm[idx_c1].copy(),
            X_norm[idx_c3].copy(),
        ], dtype=float)

    # 3. Iterasi K-Means
    iteration_history = []
    prev_clusters = np.zeros(n_samples, dtype=int)
    final_clusters = np.zeros(n_samples, dtype=int)
    final_distances = np.zeros((n_samples, k), dtype=float)

    for it in range(1, max_iter + 1):
        centroids_before = centroids.copy()

        # Hitung jarak ke tiap centroid
        distances = np.zeros((n_samples, k), dtype=float)
        for ki in range(k):
            diff = X_norm - centroids[ki]
            distances[:, ki] = np.sqrt(np.sum(diff ** 2, axis=1))

        # Penugasan cluster (1-based)
        current_clusters = np.argmin(distances, axis=1) + 1

        counts = {ki + 1: int(np.sum(current_clusters == ki + 1)) for ki in range(k)}
        delta_a = n_samples if it == 1 else int(np.sum(current_clusters != prev_clusters))

        iteration_history.append({
            'iterasi': it,
            'centroids': np.round(centroids_before, 4).tolist(),
            'cluster_counts': counts,
            'delta_anggota': delta_a,
        })

        final_clusters = current_clusters.copy()
        final_distances = distances.copy()

        if it > 1 and delta_a == 0:
            break

        # Update centroid
        new_centroids = np.zeros((k, n_features), dtype=float)
        for ki in range(k):
            mask = (current_clusters == (ki + 1))
            if np.sum(mask) > 0:
                new_centroids[ki] = np.round(np.mean(X_norm[mask], axis=0), 4)
            else:
                new_centroids[ki] = centroids[ki]

        centroids = new_centroids
        prev_clusters = current_clusters.copy()

    # 4. Mapping kategori
    #    Urutkan centroid berdasarkan skor kebutuhan rata-rata untuk dapat label yg konsisten
    #    Cluster dengan centroid sum terkecil → Mandiri (1)
    #    Cluster dengan centroid sum terbesar → Prioritas Utama (k)
    centroid_sums = np.sum(centroids, axis=1)
    centroid_rank_order = np.argsort(centroid_sums)  # ascending: [rendah, ..., tinggi]

    # Map: cluster lama (1-based) → label baru
    if k == 3:
        cat_labels = ['Mandiri', 'Perlu Perhatian', 'Prioritas Utama']
    else:  # k == 2
        cat_labels = ['Mandiri', 'Prioritas Utama']

    # Buat mapping: cluster_id_lama → (label, kategori_id_baru)
    old_to_new = {}
    for new_rank, old_cluster_idx in enumerate(centroid_rank_order):
        old_cluster_id = old_cluster_idx + 1  # 1-based
        old_to_new[old_cluster_id] = {
            'kategori': new_rank + 1,
            'nama': cat_labels[new_rank],
        }

    # Pastikan k=3 label: Mandiri=1, Perlu Perhatian=2, Prioritas Utama=3
    # Pastikan k=2 label: Mandiri=1, Prioritas Utama=3 (skip 2)
    if k == 2:
        for cid, info in old_to_new.items():
            if info['kategori'] == 2:
                old_to_new[cid] = {'kategori': 3, 'nama': 'Prioritas Utama'}

    # 5. Hitung inertia
    inertia = 0.0
    for i in range(n_samples):
        cid = final_clusters[i]
        c_idx = cid - 1
        inertia += float(np.sum((X_norm[i] - centroids[c_idx]) ** 2))

    # 6. Susun hasil per sekolah
    sekolah_results = []
    for i, name in enumerate(sekolah_names):
        cid = int(final_clusters[i])
        c_idx = cid - 1
        dist_to_centroid = float(final_distances[i, c_idx])
        mapped = old_to_new.get(cid, {'kategori': 1, 'nama': 'Mandiri'})

        sekolah_results.append({
            'nama': name,
            'cluster_id': mapped['kategori'],
            'kategori': mapped['nama'],
            'data': X_raw[i].tolist(),
            'data_normalized': X_norm[i].tolist(),
            'distances': [float(final_distances[i, ki]) for ki in range(k)],
            'nilai_cluster': round(dist_to_centroid, 4),
        })

    # 7. Summary
    summary = {
        'c1_mandiri': sum(1 for r in sekolah_results if r['cluster_id'] == 1),
        'c2_perhatian': sum(1 for r in sekolah_results if r['cluster_id'] == 2),
        'c3_prioritas': sum(1 for r in sekolah_results if r['cluster_id'] == 3),
    }

    # 8. DBI
    # Remap final_clusters ke cluster_id baru untuk DBI
    remapped_clusters = np.array([old_to_new.get(int(c), {'kategori': 1})['kategori'] for c in final_clusters])
    # Susun ulang centroid sesuai urutan baru (1,2,3)
    sorted_centroids = np.zeros((k, n_features), dtype=float)
    for old_idx, info in old_to_new.items():
        new_cat = info['kategori']
        new_idx = new_cat - 1
        if new_idx < k:
            sorted_centroids[new_idx] = centroids[old_idx - 1]

    dbi_result = compute_dbi(X_norm, remapped_clusters, sorted_centroids[:k], n_clusters=k)

    return {
        'sekolah_results': sekolah_results,
        'cluster_centers_normalized': np.round(centroids, 4).tolist(),
        'iterations': iteration_history,
        'n_clusters': k,
        'n_iterations': len(iteration_history),
        'inertia': round(inertia, 4),
        'feature_names': FEATURE_NAMES,
        'feature_labels': FEATURE_LABELS,
        'feature_types': FEATURE_TYPES,
        'summary': summary,
        'dbi': dbi_result,
    }


def main():

    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input data provided'}))
        sys.exit(1)

    try:
        input_data_b64 = sys.argv[1]
        input_data = json.loads(base64.b64decode(input_data_b64).decode('utf-8'))

        mode = input_data.get('mode', 'kecamatan')
        data = input_data.get('data', [])

        if not data:
            print(json.dumps({'error': 'Data array is empty'}))
            sys.exit(1)

        if mode == 'sekolah':
            names = input_data.get('sekolah_names', [])
            if len(data) != len(names):
                print(json.dumps({'error': f'Length mismatch: data ({len(data)}) vs names ({len(names)})'}))
                sys.exit(1)
            results = perform_kmeans_sekolah(data, names)
        else:
            names = input_data.get('kecamatan_names', [])
            if len(data) != len(names):
                print(json.dumps({'error': f'Length mismatch: data ({len(data)}) vs names ({len(names)})'}))
                sys.exit(1)
            results = perform_kmeans_custom(data, names)

        print(json.dumps(results))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
