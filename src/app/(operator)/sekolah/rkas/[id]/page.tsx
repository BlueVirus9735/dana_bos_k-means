'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import {
  Plus, Trash2, Save, Send, AlertTriangle, CheckCircle,
  ChevronLeft, Edit3, Clock
} from 'lucide-react';

interface RKASDetail {
  id: number;
  rkas_id: number;
  komponen_kegiatan: string;
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  jumlah: number;
}

interface RKASData {
  id: number;
  tahun_ajaran: string;
  status: 'draft' | 'pending' | 'revisi' | 'disahkan';
  catatan_revisi?: string;
  tanggal_submit?: string;
  tanggal_verifikasi?: string;
  items: RKASDetail[];
}

interface FormItem {
  id?: number;
  komponen_kegiatan: string;
  uraian: string;
  volume: string;
  satuan: string;
  harga_satuan: string;
  isNew?: boolean;
}

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_CFG = {
  draft:    { label: 'Draft',               color: '#8b949e', icon: Edit3 },
  pending:  { label: 'Menunggu Verifikasi', color: '#f59e0b', icon: Clock },
  revisi:   { label: 'Perlu Direvisi',      color: '#ef4444', icon: AlertTriangle },
  disahkan: { label: 'Disahkan',            color: '#10b981', icon: CheckCircle },
};

export default function RKASDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [rkas, setRkas] = useState<RKASData | null>(null);
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const editable = rkas?.status === 'draft' || rkas?.status === 'revisi';

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchRKAS();
  }, [id]);

  const fetchRKAS = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/rkas.php?id=${id}`, {}, router);
      if (!res.ok) { router.push('/sekolah/rkas'); return; }
      const data: RKASData = await res.json();
      setRkas(data);
      setItems(data.items.map(i => ({
        id: i.id,
        komponen_kegiatan: i.komponen_kegiatan,
        uraian: i.uraian,
        volume: String(i.volume),
        satuan: i.satuan,
        harga_satuan: String(i.harga_satuan),
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addItem = () => {
    setItems(prev => [...prev, { komponen_kegiatan: '', uraian: '', volume: '1', satuan: 'kegiatan', harga_satuan: '0', isNew: true }]);
  };

  const removeItem = async (idx: number) => {
    const item = items[idx];
    if (item.id) {
      await apiFetch(`/rkas_item.php?id=${item.id}`, { method: 'DELETE' }, router);
    }
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof FormItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const saveItems = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      for (const item of items) {
        const payload = {
          rkas_id: Number(id),
          komponen_kegiatan: item.komponen_kegiatan,
          uraian: item.uraian,
          volume: Number(item.volume) || 1,
          satuan: item.satuan,
          harga_satuan: parseFloat(item.harga_satuan.replace(/\D/g, '')) || 0,
        };
        if (item.id) {
          await apiFetch('/rkas_item.php', { method: 'PUT', body: JSON.stringify({ id: item.id, ...payload }) }, router);
        } else {
          const res = await apiFetch('/rkas_item.php', { method: 'POST', body: JSON.stringify(payload) }, router);
          if (res.ok) {
            const newItem = await res.json();
            item.id = newItem.id;
            item.isNew = false;
          }
        }
      }
      setSuccess('Data berhasil disimpan');
      await fetchRKAS();
    } catch { setError('Gagal menyimpan data'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      // Save first, then submit
      await saveItems();
      const res = await apiFetch('/rkas.php', {
        method: 'PUT',
        body: JSON.stringify({ id: Number(id), action: 'submit' }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        setSuccess('RKAS berhasil dikirim ke Dinas Pendidikan');
        await fetchRKAS();
      } else {
        setError(data.error ?? 'Gagal mengirim RKAS');
      }
    } catch { setError('Server error'); }
    finally { setSubmitting(false); }
  };

  const totalAnggaran = items.reduce((sum, item) => {
    const vol = parseFloat(item.volume) || 0;
    const harga = parseFloat(item.harga_satuan.replace(/[^0-9.]/g, '')) || 0;
    return sum + vol * harga;
  }, 0);

  if (loading || !rkas) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  const cfg = STATUS_CFG[rkas.status];
  const Icon = cfg.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + Title */}
      <div>
        <button onClick={() => router.push('/sekolah/rkas')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
          <ChevronLeft size={16} /> Kembali ke RKAS
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>RKAS {rkas.tahun_ajaran}</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`, padding: '3px 10px', borderRadius: 20 }}>
            <Icon size={12} /> {cfg.label}
          </span>
        </div>
      </div>

      {/* Catatan Revisi */}
      {rkas.status === 'revisi' && rkas.catatan_revisi && (
        <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Catatan Revisi dari Dinas Pendidikan
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rkas.catatan_revisi}</div>
        </div>
      )}

      {/* Messages */}
      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13 }}>{success}</div>}

      {/* Items Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Item Kegiatan <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({items.length} item)</span>
          </div>
          {editable && (
            <button onClick={addItem}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Tambah Item
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['No', 'Komponen Kegiatan', 'Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Jumlah', editable ? 'Aksi' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={editable ? 8 : 7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada item. Klik &quot;Tambah Item&quot; untuk memulai.</td></tr>
              ) : items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {editable ? (
                      <input value={item.komponen_kegiatan} onChange={e => updateItem(idx, 'komponen_kegiatan', e.target.value)}
                        style={{ width: '100%', minWidth: 160, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }}
                        placeholder="Nama kegiatan" />
                    ) : <span style={{ color: 'var(--text-primary)' }}>{item.komponen_kegiatan}</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editable ? (
                      <input value={item.uraian} onChange={e => updateItem(idx, 'uraian', e.target.value)}
                        style={{ width: '100%', minWidth: 120, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }}
                        placeholder="Uraian" />
                    ) : <span style={{ color: 'var(--text-secondary)' }}>{item.uraian}</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editable ? (
                      <input type="number" value={item.volume} onChange={e => updateItem(idx, 'volume', e.target.value)}
                        style={{ width: 70, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} min="1" />
                    ) : <span>{item.volume}</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editable ? (
                      <input value={item.satuan} onChange={e => updateItem(idx, 'satuan', e.target.value)}
                        style={{ width: 90, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }}
                        placeholder="unit" />
                    ) : <span>{item.satuan}</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editable ? (
                      <input type="number" value={item.harga_satuan} onChange={e => updateItem(idx, 'harga_satuan', e.target.value)}
                        style={{ width: 130, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13 }} min="0" />
                    ) : <span>{fmtRp(Number(item.harga_satuan))}</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {fmtRp((parseFloat(item.volume) || 0) * (parseFloat(item.harga_satuan) || 0))}
                  </td>
                  {editable && (
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => removeItem(idx)}
                        style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={editable ? 6 : 5} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Anggaran</td>
                  <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 700, color: 'var(--accent-hover)', whiteSpace: 'nowrap' }}>{fmtRp(totalAnggaran)}</td>
                  {editable && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Actions */}
      {editable && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={saveItems} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button onClick={handleSubmit} disabled={submitting || items.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, background: items.length === 0 ? 'var(--bg-elevated)' : 'var(--accent)', color: items.length === 0 ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}>
            <Send size={15} /> {submitting ? 'Mengirim...' : 'Kirim ke Dinas'}
          </button>
        </div>
      )}
    </div>
  );
}
