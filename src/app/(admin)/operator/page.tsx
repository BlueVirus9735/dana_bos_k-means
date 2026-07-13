'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { Plus, Trash2, Edit, Users, Eye, EyeOff } from 'lucide-react';

interface Operator {
  id: number;
  username: string;
  nama: string;
  email: string;
  sekolah_id: number;
  nama_sekolah: string;
  nama_kecamatan: string;
  is_active: number;
  created_at: string;
}

interface Sekolah {
  id: number;
  nama_sekolah: string;
  npsn: string;
  nama_kecamatan: string;
  jenjang: string;
}

export default function OperatorPage() {
  const router = useRouter();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Operator | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', nama: '', email: '', sekolah_id: '', is_active: '1' });
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
      const [oRes, sRes] = await Promise.all([
        apiFetch('/operator.php', {}, router),
        apiFetch('/sekolah.php', {}, router),
      ]);
      if (oRes.ok) setOperators(await oRes.json());
      if (sRes.ok) setSekolahList(await sRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ username: '', password: '', nama: '', email: '', sekolah_id: '', is_active: '1' });
    setShowForm(true);
  };

  const openEdit = (op: Operator) => {
    setEditItem(op);
    setForm({ username: op.username, password: '', nama: op.nama, email: op.email, sekolah_id: String(op.sekolah_id), is_active: String(op.is_active) });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await apiFetch('/operator.php', { method, body: JSON.stringify(body) }, router);
      const data = await res.json();
      if (res.ok) { setShowForm(false); await fetchData(); }
      else setError(data.error ?? 'Gagal menyimpan');
    } catch { setError('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus akun operator "${nama}"?`)) return;
    await apiFetch(`/operator.php?id=${id}`, { method: 'DELETE' }, router);
    await fetchData();
  };

  // Sekolah that already have operators (for filtering in create form)
  const usedSekolahIds = new Set(operators.filter(o => !editItem || o.id !== editItem.id).map(o => o.sekolah_id));
  const availableSekolah = sekolahList.filter(s => !usedSekolahIds.has(s.id));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Kelola Operator Sekolah</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{operators.length} operator terdaftar</p>
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> Tambah Operator
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
              {editItem ? 'Edit Operator' : 'Tambah Operator Baru'}
            </h2>
            {error && <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'nama', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama operator' },
                { key: 'username', label: 'Username', type: 'text', placeholder: 'Username login' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'email@sekolah.sch.id' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{field.label}</label>
                  <input type={field.type} value={(form as Record<string, string>)[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Password {editItem && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(kosongkan jika tidak diubah)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '7px 36px 7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Sekolah</label>
                <select value={form.sekolah_id} onChange={e => setForm(p => ({ ...p, sekolah_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }}>
                  <option value="">-- Pilih Sekolah --</option>
                  {(editItem ? sekolahList : availableSekolah).map(s => (
                    <option key={s.id} value={s.id}>{s.nama_sekolah} ({s.npsn})</option>
                  ))}
                </select>
              </div>
              {editItem && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                  <select value={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }}>
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              )}
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

      {/* Table */}
      {operators.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada operator terdaftar</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--bg-elevated)' }}>
              {['Nama','Username','Sekolah','Kecamatan','Status','Aksi'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {operators.map(op => (
                <tr key={op.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{op.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{op.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{op.username}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{op.nama_sekolah}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{op.nama_kecamatan}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: op.is_active ? '#10b981' : '#8b949e', background: op.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(139,148,158,0.1)', border: `1px solid ${op.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(139,148,158,0.3)'}` }}>
                      {op.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(op)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Edit size={13} /> Edit</button>
                      <button onClick={() => handleDelete(op.id, op.nama)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Trash2 size={13} /> Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
