'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Save, Plus, Search, CheckCircle2,
  AlertCircle, RefreshCw, Trash2, Info,
} from 'lucide-react';

interface SekolahEntry {
  sekolah_id: number;
  npsn: string;
  nama_sekolah: string;
  jenjang: string;
  kecamatan_id: number;
  nama_kecamatan: string;
  data_id: number;
  jumlah_siswa: number;
  total_dana_bos: number;
  alokasi_dana_sarpras: number;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

const formatRupiah = (val: number) =>
  val > 0 ? 'Rp ' + val.toLocaleString('id-ID') : '—';

export default function InputDataBOSPage() {
  const router = useRouter();

  // Data state
  const [entries, setEntries] = useState<SekolahEntry[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [search, setSearch] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');

  // Edit buffer — stores changes user makes before saving
  const [edited, setEdited] = useState<Record<number, { jumlah_siswa: string; total_dana_bos: string }>>({});

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) { router.push('/login'); return; }
    fetchData();
  }, [router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setEdited({});
    try {
      const res = await fetch(`http://localhost:8000/data_bos.php`, {
        credentials: 'include',
      });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data sekolah', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update edited buffer
  const setField = (sekolahId: number, value: string) => {
    setEdited(prev => ({
      ...prev,
      [sekolahId]: {
        total_dana_bos:  value,
        jumlah_siswa:    String(Math.floor(Number(value) / 920000)),
      },
    }));
  };

  const getVal = (sekolahId: number, field: 'jumlah_siswa' | 'total_dana_bos') => {
    if (edited[sekolahId]?.[field] !== undefined) return edited[sekolahId][field];
    const entry = entries.find(e => e.sekolah_id === sekolahId);
    return String(entry?.[field] ?? '');
  };

  const getSarpras = (sekolahId: number) => {
    const bos = parseFloat(getVal(sekolahId, 'total_dana_bos')) || 0;
    return bos * 0.2;
  };

  const handleSave = async () => {
    // Build payload dari edited + existing
    const payload = entries
      .filter(e => {
        // Sertakan yang ada perubahan, atau yang sudah punya data (data_id > 0)
        const hasEdit  = edited[e.sekolah_id] !== undefined;
        const hasData  = e.data_id > 0;
        const hasInput = Number(getVal(e.sekolah_id, 'total_dana_bos')) > 0 ||
                         Number(getVal(e.sekolah_id, 'jumlah_siswa'))   > 0;
        return hasEdit || hasData || hasInput;
      })
      .map(e => ({
        sekolah_id:    e.sekolah_id,
        tahun_ajaran:  e.tahun_ajaran, // Ditarik dari backend berdasarkan data_bos GET
        jumlah_siswa:  Number(getVal(e.sekolah_id, 'jumlah_siswa'))   || 0,
        total_dana_bos: Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0,
      }));

    if (payload.length === 0) {
      showToast('Tidak ada data yang diisi. Masukkan dana BOS minimal untuk satu sekolah.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/data_bos.php', {
        credentials: 'include',
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entries: payload }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`✓ ${data.success_count} data berhasil disimpan`, 'success');
        fetchData();
        setEdited({});
      } else {
        showToast('Gagal menyimpan: ' + (data?.error || res.statusText), 'error');
      }
    } catch (err: unknown) {
      showToast('Error: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Derived list
  const kecamatanList = [...new Set(entries.map(e => e.nama_kecamatan))].sort();

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return (
      (e.nama_sekolah.toLowerCase().includes(q) || e.npsn.includes(q)) &&
      (filterJenjang   ? e.jenjang        === filterJenjang   : true) &&
      (filterKecamatan ? e.nama_kecamatan === filterKecamatan : true)
    );
  });

  const editedCount = Object.keys(edited).length;
  const totalBos    = filtered.reduce((s, e) => s + (Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0), 0);
  const totalSarpras = totalBos * 0.2;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <DollarSign size={20} />
            </span>
            Input Data Dana BOS
          </h1>
          <p className="page-subtitle mt-1">Masukkan jumlah siswa & dana BOS per sekolah per tahun ajaran</p>
        </div>
        {entries.length > 0 && (
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? (
              <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
            ) : (
              <><Save size={18}/>{editedCount > 0 ? `Simpan (${editedCount} perubahan)` : 'Simpan Semua'}</>
            )}
          </button>
        )}
      </div>

      {/* Info: alokasi_sarpras */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>Jumlah Siswa</strong> dihitung otomatis: <strong>Total Dana BOS / Rp 920.000</strong>.
          </span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>Dana Sarpras</strong> dihitung otomatis sebagai <strong>20%</strong> dari Dana BOS.
          </span>
        </div>
      </div>

      {/* Ringkasan (muncul kalau ada data) */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Sekolah', value: entries.length, suffix: 'sekolah', color: 'text-indigo-400' },
            { label: 'Sudah Diisi', value: entries.filter(e => e.data_id > 0).length, suffix: 'sekolah', color: 'text-emerald-400' },
            { label: 'Total Dana BOS', value: formatRupiah(totalBos), suffix: '', color: 'text-slate-100' },
            { label: 'Dana Sarpras (20%)', value: formatRupiah(totalSarpras), suffix: '', color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}{s.suffix && <span className="text-sm font-normal text-slate-400 ml-1">{s.suffix}</span>}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + Tabel */}
      <div className="card overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-white/10 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                type="text"
                placeholder="Cari nama atau NPSN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input pl-9 py-2 text-sm"
              />
            </div>
            <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="form-input py-2 text-sm w-auto">
              <option value="">Semua Jenjang</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
            </select>
            <select value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)} className="form-input py-2 text-sm w-auto">
              <option value="">Semua Kecamatan</option>
              {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-12 w-full"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <DollarSign size={36} className="mx-auto text-slate-300 mb-3"/>
              <p className="text-slate-400 font-medium">
                {entries.length === 0 ? 'Tidak ada sekolah terdaftar. Tambah sekolah terlebih dahulu.' : 'Tidak ada hasil filter'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Nama Sekolah</th>
                    <th>NPSN</th>
                    <th>Kecamatan</th>
                    <th>Tahun Ajaran</th>
                    <th style={{ minWidth: 170 }}>Total Dana BOS</th>
                    <th style={{ minWidth: 110 }}>Jumlah Siswa (auto)</th>
                    <th style={{ minWidth: 160 }}>Dana Sarpras 20% (auto)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => {
                    const sarpras  = getSarpras(item.sekolah_id);
                    const isEdited = edited[item.sekolah_id] !== undefined;
                    return (
                      <tr key={item.sekolah_id} className={isEdited ? 'bg-amber-500/10' : ''}>
                        <td className="text-slate-400 text-sm">{i + 1}</td>
                        <td>
                          <span className="font-semibold text-slate-100">{item.nama_sekolah}</span>
                          {isEdited && <span className="ml-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">DIUBAH</span>}
                        </td>
                        <td className="font-mono text-sm text-slate-300">{item.npsn}</td>
                        <td><span className="badge bg-violet-500/10 text-violet-400">{item.nama_kecamatan}</span></td>
                        <td><span className="badge bg-slate-800/50 text-slate-300">{item.tahun_ajaran || '—'}</span></td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={getVal(item.sekolah_id, 'total_dana_bos')}
                            onChange={e => setField(item.sekolah_id, e.target.value)}
                            className="form-input py-1.5 text-sm tabular-nums w-full"
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-200 text-sm font-semibold tabular-nums text-center">
                            {Number(getVal(item.sekolah_id, 'jumlah_siswa')) > 0 
                              ? Number(getVal(item.sekolah_id, 'jumlah_siswa')).toLocaleString('id-ID') 
                              : <span className="text-slate-400 font-normal">—</span>}
                          </div>
                        </td>
                        <td>
                          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold tabular-nums">
                            {sarpras > 0 ? 'Rp ' + sarpras.toLocaleString('id-ID') : <span className="text-slate-400 font-normal">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer simpan */}
          {filtered.length > 0 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-800/50/50">
              <p className="text-xs text-slate-400">
                Menampilkan {filtered.length} dari {entries.length} sekolah
                {editedCount > 0 && <span className="ml-2 text-amber-600 font-semibold">· {editedCount} perubahan belum disimpan</span>}
              </p>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving
                  ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
                  : <><Save size={16}/>Simpan Data</>
                }
              </button>
            </div>
          )}
        </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          {toast.message}
        </div>
      )}
    </div>
  );
}
