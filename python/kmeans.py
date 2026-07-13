#!/usr/bin/env python3
"""
K-Means Clustering for Dana Bos Application
This script handles K-means clustering for educational facility needs analysis
Features per kecamatan: jumlah_siswa (total), ruang_kelas_baik, ruang_kelas_rusak_ringan, ruang_kelas_rusak_berat, jumlah_ruang_kelas, fasilitas_lapangan_olahraga, fasilitas_perpustakaan, fasilitas_uks, fasilitas_toilet, fasilitas_tempat_ibadah, jumlah_rombongan_belajar
"""

import sys
import json
import base64
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, MinMaxScaler


def perform_kmeans(data, kecamatan_names, n_clusters=3):
    """
    Perform K-means clustering on kecamatan data
    
    Args:
        data: List of data points per kecamatan [jumlah_siswa, ruang_kelas_baik, ruang_kelas_rusak_ringan, ruang_kelas_rusak_berat, jumlah_ruang_kelas, fasilitas_lapangan_olahraga, fasilitas_perpustakaan, fasilitas_uks, fasilitas_toilet, fasilitas_tempat_ibadah, jumlah_rombongan_belajar, alokasi_sarpras]
        kecamatan_names: List of kecamatan names corresponding to data
        n_clusters: Number of clusters (default: 3)
    
    Returns:
        Dictionary with clustering results including cluster categories
    """
    # Validasi: n_clusters tidak boleh lebih besar dari jumlah data
    if n_clusters > len(data):
        raise ValueError(f'n_clusters ({n_clusters}) tidak boleh lebih besar dari jumlah kecamatan ({len(data)})')

    # Convert to numpy array
    X_full = np.array(data)
    
    # Cluster berdasarkan 4 indikator utama:
    # Index 11: Alokasi Sarpras, Index 1: Kelas Baik, Index 2: Kelas Rusak Ringan, Index 3: Kelas Rusak Berat
    X_cluster = X_full[:, [11, 1, 2, 3]]
    
    # Normalize the features (MinMaxScaler for better interpretation)
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X_cluster)
    
    # Perform K-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
    clusters = kmeans.fit_predict(X_scaled)
    
    # Get cluster centers (normalized)
    centers_scaled = kmeans.cluster_centers_
    
    # Get cluster centers (original scale)
    centers = scaler.inverse_transform(centers_scaled)
    
    # Calculate cluster priorities based on centers
    # Higher sum of normalized center values → higher need cluster
    cluster_sums = np.sum(centers_scaled, axis=1)
    cluster_ranking = np.argsort(cluster_sums)[::-1]  # Descending order
    
    # Map cluster labels to categories: 3=Tinggi, 2=Sedang, 1=Rendah
    cluster_mapping = {}
    for rank, cluster_id in enumerate(cluster_ranking):
        cid = int(cluster_id)
        if rank == 0:
            cluster_mapping[cid] = 3  # Kebutuhan Tinggi
        elif rank == 1:
            cluster_mapping[cid] = 2  # Kebutuhan Sedang
        else:
            cluster_mapping[cid] = 1  # Kebutuhan Rendah
    
    # Hitung jarak Euclidean tiap kecamatan ke centroid clusternya
    # Nilai ini unik per kecamatan dan dipakai untuk ranking dalam satu cluster
    euclidean_distances = []
    for i, cluster_id in enumerate(clusters):
        cid = int(cluster_id)
        center = centers_scaled[cid]
        dist = float(np.linalg.norm(X_scaled[i] - center))
        euclidean_distances.append(dist)

    # Map each kecamatan to its category
    kecamatan_results = []
    for i, (kecamatan, cluster_id) in enumerate(zip(kecamatan_names, clusters)):
        cid = int(cluster_id)
        kecamatan_results.append({
            'kecamatan': kecamatan,
            'cluster_id': cid,
            'kategori': cluster_mapping[cid],
            'kategori_nama': ['Rendah', 'Sedang', 'Tinggi'][cluster_mapping[cid] - 1],
            'data': data[i],
            # nilai_cluster = jarak Euclidean ke centroid (unik per kecamatan)
            # semakin besar = semakin jauh dari pusat cluster = lebih "ekstrem"
            'nilai_cluster': euclidean_distances[i]
        })
    
    # Prepare results
    results = {
        'kecamatan_results': kecamatan_results,
        'cluster_centers': centers.tolist(),
        'cluster_centers_normalized': centers_scaled.tolist(),
        'cluster_mapping': cluster_mapping,
        'n_clusters': n_clusters,
        'inertia': float(kmeans.inertia_),
        'feature_names': [
            'alokasi_sarpras', 'ruang_kelas_baik', 'ruang_kelas_rusak_ringan', 'ruang_kelas_rusak_berat'
        ]
    }
    
    return results


def main():
    """Main function to handle command line execution"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No data provided'}))
        sys.exit(1)
    
    try:
        # Parse input
        input_data_b64 = sys.argv[1]
        input_data = json.loads(base64.b64decode(input_data_b64).decode('utf-8'))
        data = input_data.get('data', [])
        kecamatan_names = input_data.get('kecamatan_names', [])
        n_clusters = input_data.get('n_clusters', 3)
        
        if not data:
            print(json.dumps({'error': 'No data points provided'}))
            sys.exit(1)
        
        if len(data) != len(kecamatan_names):
            print(json.dumps({'error': 'Data and kecamatan_names length mismatch'}))
            sys.exit(1)
        
        # Perform clustering
        results = perform_kmeans(data, kecamatan_names, n_clusters)
        
        # Output results as JSON
        print(json.dumps(results))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
