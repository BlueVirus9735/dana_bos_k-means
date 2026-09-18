#!/usr/bin/env python3
import os
import sys
import json
import numpy as np

# Tambahkan path root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from python.kmeans import (
    FEATURE_TYPES,
    normalize_features,
    perform_kmeans_custom
)

# Kode Warna ANSI untuk Terminal Windows / Linux
RESET   = "\033[0m"
BOLD    = "\033[1m"
RED     = "\033[91;1m"    # Klaster 3 (Tinggi)
YELLOW  = "\033[93;1m"    # Klaster 2 (Sedang)
GREEN   = "\033[92;1m"    # Klaster 1 (Rendah)
CYAN    = "\033[96;1m"    # Sumbu / Frame
MAGENTA = "\033[95;1m"    # Centroid
GRAY    = "\033[90m"      # Grid garis
WHITE   = "\033[97;1m"

def compute_pca_2d(X):
    """Proyeksi 11 variabel ke 2 Dimensi (PCA) untuk koordinat sumbu X dan Y"""
    mean_vec = np.mean(X, axis=0)
    X_centered = X - mean_vec
    _, _, Vt = np.linalg.svd(X_centered, full_matrices=False)
    X_2d = np.dot(X_centered, Vt[:2].T)
    return X_2d, Vt[:2], mean_vec
print(f"{BOLD}{CYAN}╔══════════════════════════════════════════════════════════════════════════════════╗{RESET}")
print(f"{BOLD}{CYAN}║     SIMULASI PENGUJIAN K-MEANS CLUSTERING (40 KECAMATAN KABUPATEN CIREBON)       ║{RESET}")
print(f"{BOLD}{CYAN}╚══════════════════════════════════════════════════════════════════════════════════╝{RESET}")
def draw_terminal_scatter_plot(points_2d, clusters, centroids_2d, width=64, height=20):
    """
    Menggambar DIAGRAM SCATTER PLOT 2D BERWARNA LANGSUNG DI LAYAR TERMINAL
    lengkap dengan Sumbu X, Sumbu Y, Titik Data Berwarna, Grid, dan Centroid.
    """
    x = points_2d[:, 0]
    y = points_2d[:, 1]
    
    # Range koordinat dengan padding
    x_min, x_max = np.min(x) - 0.15, np.max(x) + 0.15
    y_min, y_max = np.min(y) - 0.15, np.max(y) + 0.15

    # Buat kanvas matriks
    canvas = [[" " for _ in range(width)] for _ in range(height)]
    
    # 1. Gambar Grid halus di background
    for r in range(height):
        for c in range(width):
            if r % 5 == 0 or c % 12 == 0:
                canvas[r][c] = f"{GRAY}·{RESET}"

    # 2. Gambar Titik-Titik Data (Scatter Points) Berwarna
    # Warna: Merah = Klaster 3, Kuning = Klaster 2, Hijau = Klaster 1
    point_colors = {
        3: f"{RED}●{RESET}",
        2: f"{YELLOW}●{RESET}",
        1: f"{GREEN}●{RESET}"
    }

    for i in range(len(points_2d)):
        col = int((points_2d[i, 0] - x_min) / (x_max - x_min) * (width - 1))
        row = int((points_2d[i, 1] - y_min) / (y_max - y_min) * (height - 1))
        row = height - 1 - row  # Invert Y agar atas bernilai positif
        
        col = max(0, min(width - 1, col))
        row = max(0, min(height - 1, row))
        
        cid = clusters[i]
        canvas[row][col] = point_colors[cid]

    # 3. Gambar Titik Centroid (Tanda Silang Tebal 'X')
    for idx, cpos in enumerate(centroids_2d):
        col = int((cpos[0] - x_min) / (x_max - x_min) * (width - 1))
        row = int((cpos[1] - y_min) / (y_max - y_min) * (height - 1))
        row = height - 1 - row
        
        col = max(0, min(width - 1, col))
        row = max(0, min(height - 1, row))
        
        canvas[row][col] = f"{MAGENTA}●{RESET}"

    for r in range(height):
        # Ticks sumbu Y
        if r == 0:
            y_label = f"{CYAN}{y_max:>5.1f} ┤{RESET}"
        elif r == height // 2:
            y_label = f"{CYAN}{0.0:>5.1f} ┤{RESET}"
        elif r == height - 1:
            y_label = f"{CYAN}{y_min:>5.1f} ┤{RESET}"
        else:
            y_label = f"{CYAN}      │{RESET}"
            
        row_str = "".join(canvas[r])
        print(f"{y_label}{row_str}")

    # Sumbu X di bagian bawah
    x_axis_line = "─" * width
    print(f"{CYAN}      └{x_axis_line}{RESET}")
    print(f"       {CYAN}{x_min:<8.1f}{RESET}{CYAN}{0.0:^{width-16}.1f}{RESET}{CYAN}{x_max:>8.1f}{RESET}")

    # Legenda Diagram Berwarna
    print("\n" + f"{BOLD}Keterangan Titik Plot:{RESET}")
    print(f"  {RED}●{RESET} {BOLD}Klaster 3 {RESET}  : Kebutuhan TINGGI  (Prioritas Utama Bantuan)")
    print(f"  {YELLOW}●{RESET} {BOLD}Klaster 2 {RESET}  : Kebutuhan SEDANG  (Kebutuhan Berkala)")
    print(f"  {GREEN}●{RESET} {BOLD}Klaster 1 {RESET}  : Kebutuhan RENDAH  (Fasilitas Mandiri/Lengkap)")
    print(f"  {MAGENTA}●{RESET} {BOLD}Centroid {RESET}   : Titik Pusat Klaster\n")

def main():
    # 1. Load Data
    data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "database", "exact_seed_data.json")
    if not os.path.exists(data_file):
        print(f"{RED}[ERROR] File dataset {data_file} tidak ditemukan!{RESET}")
        return

    with open(data_file, "r", encoding="utf-8") as f:
        seed = json.load(f)

    kec_list = seed.get("kecamatan", [])
    kecamatan_names = []
    data_raw = []

    for k in kec_list:
        kecamatan_names.append(k["nama"])
        data_raw.append([
            k["siswa"], k["bos"], k["sarpras"], k["rombel"],
            k["perpus"], k["ibadah"], k["toilet"], k["uks"],
            k["baik"], k["rusak_ringan"], k["rusak_berat"]
        ])

    # 2. Eksekusi K-Means
    results = perform_kmeans_custom(data_raw, kecamatan_names)
    X_norm, _, _ = normalize_features(data_raw, FEATURE_TYPES)

    # 3. PCA 2D
    X_2d, components, mean_vec = compute_pca_2d(X_norm)
    centroids = np.array(results["cluster_centers_normalized"])
    centroids_2d = np.dot(centroids - mean_vec, components.T)
    
    kec_results = results["kecamatan_results"]
    summary = results["summary"]
    clusters = [r["cluster_id"] for r in kec_results]


    # 4. GAMBAR DIAGRAM SCATTER PLOT DI TERMINAL
    draw_terminal_scatter_plot(X_2d, clusters, centroids_2d)

    # 5. TABEL LENGKAP 40 KECAMATAN PER PRIORITAS
    cluster_configs = [
        (3, "KLASTER 3: KEBUTUHAN TINGGI (PRIORITAS 1)", RED, summary["c3_tinggi"]),
        (2, "KLASTER 2: KEBUTUHAN SEDANG (PRIORITAS 2)", YELLOW, summary["c2_sedang"]),
        (1, "KLASTER 1: KEBUTUHAN RENDAH (PRIORITAS 3)", GREEN, summary["c1_rendah"])
    ]

    for cid, title, color, count in cluster_configs:
        sub = [r for r in kec_results if r["cluster_id"] == cid]
        sub.sort(key=lambda x: x["nilai_cluster"])

        print(f"{BOLD}{color}▶ {title} [{count} Kecamatan]{RESET}")
        print(f"┌────┬──────────────────┬──────────────┬────────────────────┬────────────────────┬──────────────┐")
        print(f"│ No │ Kecamatan        │ Jumlah Siswa │ Total Dana BOS     │ Alokasi Sarpras 20%│Jarak Centroid│")
        print(f"├────┼──────────────────┼──────────────┼────────────────────┼────────────────────┼──────────────┤")
        for i, item in enumerate(sub, 1):
            raw = item["data"]
            siswa = f"{int(raw[0]):,}"
            bos = f"Rp {raw[1]:,.0f}"
            sarpras = f"Rp {raw[2]:,.0f}"
            dist = f"{item['nilai_cluster']:.4f}"
            print(f"│ {i:>2} │ {item['kecamatan']:<16} │ {siswa:>12} │ {bos:>18} │ {sarpras:>18} │ {dist:>12} │")
        print(f"└────┴──────────────────┴──────────────┴────────────────────┴────────────────────┴──────────────┘\n")

if __name__ == "__main__":
    main()
