# Dana Bos Application

Aplikasi Dana Bos dengan backend PHP native dan K-means clustering menggunakan Python.

## Struktur Project

```
dana_bos_k-means/
├── backend/                    # Backend PHP Native
│   ├── api/                   # API endpoints
│   ├── config/                # Konfigurasi (database, config)
│   ├── models/                # Model data
│   ├── controllers/           # Controller logic
│   ├── includes/              # Helper functions & database connection
│   └── public/                # Public accessible files
├── python/                    # Python K-means
│   ├── kmeans.py             # Script K-means clustering
│   └── requirements.txt      # Python dependencies
└── README.md                 # Dokumentasi
```

## Setup Backend PHP

1. Konfigurasi database di `backend/config/database.php`
2. Setup web server (Apache/Nginx) untuk pointing ke folder `backend/public`
3. Pastikan PHP terinstall (versi 7.4 atau lebih tinggi)

## Setup Python K-means

1. Install Python 3.8 atau lebih tinggi
2. Install dependencies:

```bash
cd python
pip install -r requirements.txt
```

## Dependencies Python

- numpy==1.24.3
- pandas==2.0.3
- scikit-learn==1.3.0
- matplotlib==3.7.2

## Integrasi PHP dengan Python

Backend PHP dapat memanggil script Python K-means menggunakan fungsi `executePythonScript()` yang tersedia di `backend/includes/functions.php`.

Contoh penggunaan:
```php
require_once '../includes/functions.php';

$data = [[1, 2], [3, 4], [5, 6]];
$params = json_encode(['data' => $data, 'n_clusters' => 2]);
$result = executePythonScript(PYTHON_SCRIPT_PATH, [$params]);
```

## Cara Menjalankan Aplikasi

### 1. Setup Database
```bash
# Import file SQL ke MySQL
mysql -u root -p < backend/database.sql
```

### 2. Setup Backend PHP
```bash
cd backend
composer install
```

Konfigurasi database di `backend/config/database.php` sesuai dengan environment Anda.

### 3. Setup Python K-means
```bash
cd python
pip install -r requirements.txt
```

### 4. Setup Frontend Next.js
```bash
npm install
npm run dev
```

Frontend akan berjalan di http://localhost:3000

### 5. Konfigurasi Web Server
Setup web server (Apache/Nginx) untuk pointing ke folder `backend/public` agar API dapat diakses.

## Struktur API

- `POST /backend/api/login.php` - Login admin
- `GET /backend/api/kecamatan.php` - Get semua kecamatan
- `POST /backend/api/kecamatan.php` - Tambah kecamatan
- `PUT /backend/api/kecamatan.php` - Update kecamatan
- `DELETE /backend/api/kecamatan.php` - Hapus kecamatan
- `GET /backend/api/sekolah.php` - Get semua sekolah
- `POST /backend/api/sekolah.php` - Tambah sekolah
- `PUT /backend/api/sekolah.php` - Update sekolah
- `DELETE /backend/api/sekolah.php` - Hapus sekolah
- `POST /backend/api/upload_excel.php` - Upload data Excel
- `POST /backend/api/clustering.php` - Jalankan clustering
- `GET /backend/api/clustering.php` - Get hasil clustering
- `GET /backend/api/dashboard.php` - Get dashboard statistics
- `GET /backend/api/grafik.php` - Get data grafik
- `GET /backend/api/laporan.php` - Generate laporan PDF

## Fitur Aplikasi

1. **Login Admin** - Autentikasi admin untuk mengakses sistem
2. **Manajemen Data Kecamatan** - CRUD data kecamatan
3. **Manajemen Data Sekolah** - CRUD data sekolah
4. **Upload Data Excel** - Import data dari file Excel
5. **Proses Clustering K-Means** - Jalankan algoritma clustering
6. **Dashboard Statistik** - Lihat statistik dan ringkasan data
7. **Hasil Clustering** - Lihat hasil analisis per kecamatan
8. **Grafik Hasil Clustering** - Visualisasi data clustering
9. **Cetak Laporan PDF** - Generate laporan dalam format PDF

## Default Login

- Username: admin
- Password: admin123

## Catatan Penting

- Pastikan Python terinstall dan script K-means dapat dijalankan dari PHP
- Pastikan PhpSpreadsheet dan TCPDF terinstall via Composer
- Sesuaikan path Python script di `backend/config/config.php` jika perlu
- Format file Excel untuk upload: NPSN, Nama Sekolah, Kecamatan, Jenjang, Jumlah Siswa, Ruang Kelas, Fasilitas, Dana BOS, Alokasi Dana
