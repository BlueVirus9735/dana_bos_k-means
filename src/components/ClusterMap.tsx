'use client';

import { useEffect, useRef } from 'react';

interface ClusterMapProps {
  data: Array<{
    nama_kecamatan: string;
    kategori_nama: string;
    latitude: number | null;
    longitude: number | null;
    priority_score: number;
  }>;
}

export default function ClusterMap({ data }: ClusterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Tinggi':
        return '#ef4444'; // red
      case 'Sedang':
        return '#eab308'; // yellow
      case 'Rendah':
        return '#22c55e'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  // Filter data with valid coordinates
  const validData = data.filter((item) => item.latitude && item.longitude);

  if (validData.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-slate-300">
          Data koordinat tidak tersedia. Silakan tambahkan koordinat geografis untuk setiap kecamatan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-lg shadow">
        <h3 className="font-bold mb-4">Legenda</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm">Kebutuhan Tinggi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm">Kebutuhan Sedang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm">Kebutuhan Rendah</span>
          </div>
        </div>
      </div>

      <div
        ref={mapRef}
        className="bg-gray-100 rounded-lg p-4 min-h-[400px] relative"
        style={{ backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-300 mb-2">Peta Persebaran Cluster</p>
            <p className="text-sm text-slate-400">
              {validData.length} kecamatan dengan koordinat valid
            </p>
          </div>
        </div>

        {/* Simple visualization - dots positioned based on coordinates */}
        <div className="relative w-full h-full">
          {validData.map((item, index) => {
            // Normalize coordinates to fit in container (simple projection)
            const minLat = Math.min(...validData.map((d) => d.latitude!));
            const maxLat = Math.max(...validData.map((d) => d.latitude!));
            const minLng = Math.min(...validData.map((d) => d.longitude!));
            const maxLng = Math.max(...validData.map((d) => d.longitude!));

            const x = ((item.longitude! - minLng) / (maxLng - minLng || 1)) * 80 + 10;
            const y = ((item.latitude! - minLat) / (maxLat - minLat || 1)) * 80 + 10;

            const size = 10 + (item.priority_score / 100) * 20;

            return (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${item.nama_kecamatan} - ${item.kategori_nama} (Skor: ${item.priority_score})`}
              >
                <div
                  className="rounded-full transition-transform group-hover:scale-125"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: getKategoriColor(item.kategori_nama),
                    opacity: 0.7,
                  }}
                />
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {item.nama_kecamatan}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-indigo-500/10 p-4 rounded-lg text-sm text-slate-300">
        <p className="font-medium mb-1">Catatan:</p>
        <p>
          Untuk peta interaktif yang lebih detail, install library leaflet: npm install leaflet
          react-leaflet
        </p>
      </div>
    </div>
  );
}
