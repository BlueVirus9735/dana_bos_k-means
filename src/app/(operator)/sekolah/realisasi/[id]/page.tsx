'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { Plus, Trash2, Save, Send, AlertTriangle, ChevronLeft } from 'lucide-react';

interface RealisasiItem {
  id: number;
  realisasi_id: number;
  rkas_detail_id?: number;
  komponen_kegiatan: string;
  uraian: string;
  anggaran: number;
  realisasi: number;
  keterangan: string;
}

interface BKUEntry {
  id: number;
  tanggal: string;
  uraian: string;
  penerimaan: number;
  pengeluaran: number;
  saldo: number;
}

interface RealisasiData {
  id: number;
  tahun_ajaran: string;
  status: 'draft' | 'submitted' | 'pembinaan' | 'terverifikasi';
  catatan_validasi?: string;
  total_penerimaan: number;
  total_pengeluaran: number;
  saldo: number;
  items: RealisasiItem[];
  bku: BKUEntry[];
}

type Tab = 'realisasi' | 'bku';

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) { return new Intl.NumberFormat('id-ID').format(n); }

export default function RealisasiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RealisasiData | null>(null);
  const [tab, setTab] = useState<Tab>('realisasi');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Realisasi item form state
  const [items, setItems] = useState<(Omit<RealisasiItem, 'id' | 'realisasi_id'> & { id?: number })[]>([]);
  // BKU form state
  const [bkuEntries, setBkuEntries] = useState<(Omit<BKUEntry, 'id' | 'saldo'> & { id?: number })[]>([]);
  const [penerimaan, setPenerimaan] = useState('');

  const editable = data?.status === 'draft' || data?.status === 'pembinaan';

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/realisasi.php?id=${id}`, {}, router);
      if (!res.ok) { router.push('/sekolah/realisasi'); return; }
      const d: RealisasiData = await res.json();
      setData(d);
      setPenerimaan(String(d.total_penerimaan));
      setItems(d.items.map(i => ({ id: i.id, komponen_kegiatan: i.komponen_kegiatan, uraian: i.uraian, anggaran: i.anggaran, realisasi: i.realisasi, keterangan: i.keterangan })));
      setBkuEntries(d.bku.map(b => ({ id: b.id, tanggal: b.tanggal, uraian: b.uraian, penerimaan: b.penerimaan, pengeluaran: b.pengeluaran })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addItem = () => setItems(prev => [...prev, { komponen_kegiatan: '', uraian: '', anggaran: 0, realisasi: 0, keterangan: '' }]);
  const removeItem = async (idx: number) => {
    const item = items[idx];
    if (item.id) await apiFetch(`/realisasi_item.php?id=${item.id}`, { method: 'DELETE' }, router);
    setItems(prev => prev.filter((_, i) => i !== idx));
  };
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addBku = () => setBkuEntries(prev => [...prev, { tanggal: new Date().toISOString().slice(0, 10), uraian: '', penerimaan: 0, pengeluaran: 0 }]);
  const removeBku = async (idx: number) => {
    const entry = bkuEntries[idx];
    if (entry.id) await apiFetch(`/bku.php?id=${entry.id}`, { method: 'DELETE' }, router);
    setBkuEntries(prev => prev.filter((_, i) => i !== idx));
  };
  const updateBku = (idx: number, field: string, value: string | number) => {
    setBkuEntries(prev => prev.map((entry, i) => i === idx ? { ...entry, [field]: value } : entry));
  };

  const saveAll = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      // Update penerimaan
      await apiFetch('/realisasi.php', { method: 'PUT', body: JSON.stringify({ id: Number(id), total_penerimaan: parseFloat(penerimaan) || 0 }) }, router);

      // Save items
      for (const item of items) {
        const payload = { realisasi_id: Number(id), komponen_kegiatan: item.komponen_kegiatan, uraian: item.uraian, anggaran: Number(item.anggaran), realisasi: Number(item.realisasi), keterangan: item.keterangan };
        if (item.id) await apiFetch('/realisasi_item.php', { method: 'PUT', body: JSON.stringify({ id: item.id, ...payload }) }, router);
        else {
          const res = await apiFetch('/realisasi_item.php', { method: 'POST', body: JSON.stringify(payload) }, router);
          if (res.ok) { const d = await res.json(); item.id = d.id; }
        }
      }

      // Save BKU
      for (const entry of bkuEntries) {
        const payload = { realisasi_id: Number(id), tanggal: entry.tanggal, uraian: entry.uraian, penerimaan: Number(entry.penerimaan), pengeluaran: Number(entry.pengeluaran) };
        if (entry.id) await apiFetch('/bku.php', { method: 'PUT', body: JSON.stringify({ id: entry.id, ...payload }) }, router);
        else {
          const res = await apiFetch('/bku.php', { method: 'POST', body: JSON.stringify(payload) }, router);
          if (res.ok) { const d = await res.json(); entry.id = d.id; }
        }
      }

      setSuccess('Data berhasil disimpan');
      await fetchData();
    } catch { setError('Gagal menyimpan data'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      await saveAll();
      const res = await apiFetch('/realisasi_validasi.php', { method: 'PUT', body: JSON.stringify({ id: Number(id), action: 'submit' }) }, router);
      const d = await res.json();
      if (res.ok) { setSuccess('Laporan berhasil dikirim ke Dinas Pendidikan'); await fetchData(); }
      else setError(d.error ?? 'Gagal mengirim laporan');
    } catch { setError('Server error'); }
    finally { setSaving(false); }
  };

  if (loading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  const totalRealisasi = items.reduce((s, i) => s + (Number(i.realisasi) || 0), 0);

  const TAB_STYLE = (active: boolean) => ({
    padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--accent-hover)' : 'var(--text-muted)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <button onClick={() => router.push('/sekolah/realisasi')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Realisasi Dana BOS {data.tahun_ajaran}</h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Penerimaan', value: data.total_penerimaan, color: 'var(--green)' },
          { label: 'Total Pengeluaran', value: data.total_pengeluaran, color: 'var(--amber)' },
          { label: 'Saldo', value: data.saldo, color: data.saldo >= 0 ? 'var(--green)' : '#ef4444' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{fmtRp(c.value)}</div>
          </div>
        ))}
      </div>

      {data.status === 'pembinaan' && data.catatan_validasi && (
        <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Catatan Pembinaan dari Dinas Pendidikan
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{data.catatan_validasi}</div>
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13 }}>{success}</div>}

      {/* Total Penerimaan input */}
      {editable && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Total Penerimaan Dana BOS (Rp)</label>
          <input type="number" value={penerimaan} onChange={e => setPenerimaan(e.target.value)} min="0"
            style={{ width: '100%', maxWidth: 300, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }} />
        </div>
      )}

      {/* Tabs */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 4px' }}>
          <button style={TAB_STYLE(tab === 'realisasi')} onClick={() => setTab('realisasi')}>Item Realisasi</button>
          <button style={TAB_STYLE(tab === 'bku')} onClick={() => setTab('bku')}>Buku Kas Umum (BKU)</button>
        </div>

        {tab === 'realisasi' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Item Realisasi</span>
              {editable && <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 12, border: 'none', cursor: 'pointer' }}><Plus size={14} /> Tambah</button>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg-elevated)' }}>
                  {['No','Komponen Kegiatan','Uraian','Anggaran (Rp)','Realisasi (Rp)','Keterangan', editable ? 'Aksi' : ''].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada item realisasi</td></tr>
                  ) : items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      {(['komponen_kegiatan','uraian'] as const).map(field => (
                        <td key={field} style={{ padding: '8px 12px' }}>
                          {editable ? <input value={item[field]} onChange={e => updateItem(idx, field, e.target.value)} style={{ width: '100%', minWidth: 120, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} /> : <span>{item[field]}</span>}
                        </td>
                      ))}
                      {(['anggaran','realisasi'] as const).map(field => (
                        <td key={field} style={{ padding: '8px 12px' }}>
                          {editable ? <input type="number" value={item[field]} onChange={e => updateItem(idx, field, parseFloat(e.target.value) || 0)} style={{ width: 130, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} min="0" /> : <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{fmtRp(item[field])}</span>}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        {editable ? <input value={item.keterangan} onChange={e => updateItem(idx, 'keterangan', e.target.value)} style={{ width: '100%', minWidth: 100, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} /> : <span style={{ color: 'var(--text-secondary)' }}>{item.keterangan}</span>}
                      </td>
                      {editable && (
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => removeItem(idx)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {items.length > 0 && (
                  <tfoot><tr style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={editable ? 4 : 3} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Realisasi</td>
                    <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{fmtRp(totalRealisasi)}</td>
                    <td colSpan={editable ? 2 : 1} />
                  </tr></tfoot>
                )}
              </table>
            </div>
          </>
        )}

        {tab === 'bku' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Buku Kas Umum</span>
              {editable && <button onClick={addBku} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 12, border: 'none', cursor: 'pointer' }}><Plus size={14} /> Tambah</button>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg-elevated)' }}>
                  {['No','Tanggal','Uraian','Penerimaan','Pengeluaran','Saldo',editable?'Aksi':''].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {bkuEntries.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada entri BKU</td></tr>
                  ) : bkuEntries.map((entry, idx) => {
                    // Running saldo
                    let runSaldo = 0;
                    for (let i = 0; i <= idx; i++) runSaldo += (Number(bkuEntries[i].penerimaan) || 0) - (Number(bkuEntries[i].pengeluaran) || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {editable ? <input type="date" value={entry.tanggal} onChange={e => updateBku(idx, 'tanggal', e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} /> : <span>{entry.tanggal}</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {editable ? <input value={entry.uraian} onChange={e => updateBku(idx, 'uraian', e.target.value)} style={{ width: '100%', minWidth: 140, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} /> : <span>{entry.uraian}</span>}
                        </td>
                        {(['penerimaan','pengeluaran'] as const).map(field => (
                          <td key={field} style={{ padding: '8px 12px' }}>
                            {editable ? <input type="number" value={entry[field]} onChange={e => updateBku(idx, field, parseFloat(e.target.value) || 0)} style={{ width: 120, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} min="0" /> : <span style={{ color: field === 'penerimaan' ? 'var(--green)' : 'var(--amber)' }}>{fmtRp(entry[field])}</span>}
                          </td>
                        ))}
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: runSaldo >= 0 ? 'var(--text-primary)' : '#ef4444', whiteSpace: 'nowrap' }}>{fmtRp(runSaldo)}</td>
                        {editable && (
                          <td style={{ padding: '8px 12px' }}>
                            <button onClick={() => removeBku(idx)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editable && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={saveAll} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            <Send size={15} /> Kirim Laporan ke Dinas
          </button>
        </div>
      )}
    </div>
  );
}
