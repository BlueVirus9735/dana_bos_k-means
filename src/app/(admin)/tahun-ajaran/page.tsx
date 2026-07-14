'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { Plus, CalendarRange, CheckCircle, Lock, Archive, Trash2, Edit } from 'lucide-react';

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  status: 'aktif' | 'tutup' | 'arsip';
  batas_submit_rkas: string | null;
  batas_submit_laporan: string | null;
  created_at: string;
}

const STATUS_CFG = {
  aktif:  { label: 'Aktif',  color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  tutup:  { label: 'Tutup',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Lock },
  arsip:  { label: 'Arsip',  color: '#8b949e', bg: 'rgba(139,148,158,0.1)', icon: Archive },
};

export default function TahunAjaranPage() {
  const router = useRouter();
  const [list, setList] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TahunAjaran | null>(null);
  const [form, setForm] = useState({ tahun_ajaran: '', status: 'aktif', batas_submit_rkas: '', batas_submit_laporan: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/tahun_ajaran.php', {}, router);
      if (res.ok) {
        const json = await res.json();
        setList(json.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ tahun_ajaran: '', status: 'aktif', batas_submit_rkas: '', batas_submit_laporan: '' });
    setShowForm(true);
  };

  const openEdit = (item: TahunAjaran) => {
    setEditItem(item);
    setForm({ tahun_ajaran: item.tahun_ajaran, status: item.status, batas_submit_rkas: item.batas_submit_rkas ?? '', batas_submit_laporan: item.batas_submit_laporan ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await apiFetch('/tahun_ajaran.php', { method, body: JSON.stringify(body) }, router);
      const data = await res.json();
      if (res.ok) { setShowForm(false); await fetchData(); }
      else setError(data.error ?? 'Gagal menyimpan');
    } catch { setError('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus tahun ajaran ini?')) return;
    await apiFetch(`/tahun_ajaran.php?id=${id}`, { method: 'DELETE' }, router);
    await fetchData();
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Manajemen Tahun Ajaran</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Kelola periode tahun ajaran aktif</p>
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Tahun Ajaran
        </button>
      </div>

      {/* Form Modal Overlay */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '24px 28px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
              {editItem ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
            </h2>
            {error && <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Tahun Ajaran</label>
                <input value={form.tahun_ajaran} onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                  placeholder="2024/2025"
                  disabled={!!editItem}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }}>
                  <option value="aktif">Aktif</option>
                  <option value="tutup">Tutup</option>
                  <option value="arsip">Arsip</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Batas Submit RKAS</label>
                <input type="date" value={form.batas_submit_rkas} onChange={e => setForm(p => ({ ...p, batas_submit_rkas: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Batas Submit Laporan</label>
                <input type="date" value={form.batas_submit_laporan} onChange={e => setForm(p => ({ ...p, batas_submit_laporan: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <CalendarRange size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada tahun ajaran</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--bg-elevated)' }}>
              {['Tahun Ajaran','Status','Batas RKAS','Batas Laporan','Aksi'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map(item => {
                const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.tutup;
                const Icon = cfg.icon;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.tahun_ajaran}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`, padding: '3px 10px', borderRadius: 20 }}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.batas_submit_rkas ?? '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.batas_submit_laporan ?? '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(item)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Edit size={13} /> Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Trash2 size={13} /> Hapus</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
