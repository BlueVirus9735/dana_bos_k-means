'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import {
  Plus, CalendarRange, CheckCircle2, Lock, Archive,
  Trash2, Edit3, X, Clock, AlertCircle, Sparkles,
} from 'lucide-react';

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  status: 'aktif' | 'tutup' | 'arsip';
  batas_submit_rkas: string | null;
  batas_submit_laporan: string | null;
  created_at: string;
}

const STATUS_CFG = {
  aktif: {
    label: 'Aktif Berjalan',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: CheckCircle2,
  },
  tutup: {
    label: 'Ditutup',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: Lock,
  },
  arsip: {
    label: 'Diarsipkan',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: Archive,
  },
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function TahunAjaranPage() {
  const router = useRouter();
  const [list, setList] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TahunAjaran | null>(null);
  const [form, setForm] = useState({
    tahun_ajaran: '',
    status: 'aktif',
    batas_submit_rkas: '',
    batas_submit_laporan: '',
  });
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
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: TahunAjaran) => {
    setEditItem(item);
    setForm({
      tahun_ajaran: item.tahun_ajaran,
      status: item.status,
      batas_submit_rkas: item.batas_submit_rkas ?? '',
      batas_submit_laporan: item.batas_submit_laporan ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.tahun_ajaran.trim()) {
      setError('Tahun ajaran wajib diisi (contoh: 2024/2025)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await apiFetch('/tahun_ajaran.php', { method, body: JSON.stringify(body) }, router);
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        await fetchData();
      } else {
        setError(data.error ?? 'Gagal menyimpan data');
      }
    } catch {
      setError('Terjadi kendala saat menghubungkan ke server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus periode tahun ajaran ${nama}?`)) return;
    await apiFetch(`/tahun_ajaran.php?id=${id}`, { method: 'DELETE' }, router);
    await fetchData();
  };

  const activePeriod = list.find(i => i.status === 'aktif');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 12 }}>
        <div style={{ width: 24, height: 24, border: '2.5px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Memuat data tahun ajaran...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em', margin: 0 }}>
            Tahun Ajaran & Periode
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 }}>
            Atur siklus pelaporan BOS, tenggat submit RKAS, dan pembagian arsip data
          </p>
        </div>

        <button
          onClick={openCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 9,
            background: '#2563eb', color: '#ffffff',
            fontSize: 13, fontWeight: 600, border: 'none',
            boxShadow: '0 1px 2px 0 rgba(37,99,235,0.25)',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
        >
          <Plus size={16} /> Tambah Tahun Ajaran
        </button>
      </div>

      {/* ── Active Period Spotlight Card ─────────────────────────────────── */}
      {activePeriod && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 24px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#10b981' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#15803d" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803d' }}>
                  Periode Operasional Aktif
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 2 }}>
                Tahun Ajaran {activePeriod.tahun_ajaran}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> Batas Submit RKAS:
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {formatDate(activePeriod.batas_submit_rkas)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> Batas Laporan Realisasi:
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {formatDate(activePeriod.batas_submit_laporan)}
              </div>
            </div>
            <button
              onClick={() => openEdit(activePeriod)}
              style={{
                fontSize: 12, fontWeight: 600, color: '#2563eb',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Ubah Pengaturan
            </button>
          </div>
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '56px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <CalendarRange size={42} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Belum Ada Tahun Ajaran</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Klik tombol "Tambah Tahun Ajaran" di kanan atas untuk memulai.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Daftar Riwayat Tahun Ajaran</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {list.length} Periode
            </span>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Tahun Ajaran', 'Status Siklus', 'Batas RKAS', 'Batas Laporan', 'Tindakan'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 18px',
                        textAlign: i === 4 ? 'right' : 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(item => {
                  const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.tutup;
                  const Icon = cfg.icon;
                  const isCurActive = item.status === 'aktif';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isCurActive ? '#fafffd' : '#ffffff',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isCurActive ? '#fafffd' : '#ffffff'; }}
                    >
                      {/* Tahun Ajaran */}
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                          {item.tahun_ajaran}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '13px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 700,
                            color: cfg.color, background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            padding: '3px 10px', borderRadius: 20,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Icon size={12} /> {cfg.label}
                        </span>
                      </td>

                      {/* Batas RKAS */}
                      <td style={{ padding: '13px 18px', color: item.batas_submit_rkas ? '#0f172a' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(item.batas_submit_rkas)}
                      </td>

                      {/* Batas Laporan */}
                      <td style={{ padding: '13px 18px', color: item.batas_submit_laporan ? '#0f172a' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(item.batas_submit_laporan)}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit Tahun Ajaran"
                            style={{
                              padding: '5px 10px', borderRadius: 7,
                              background: '#ffffff', border: '1px solid #cbd5e1',
                              color: '#334155', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 600,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.id, item.tahun_ajaran)}
                            title="Hapus Tahun Ajaran"
                            style={{
                              padding: '5px 10px', borderRadius: 7,
                              background: '#fef2f2', border: '1px solid #fecaca',
                              color: '#dc2626', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 600,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Form Modal Dialog ────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 460,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editItem ? 'Edit Periode Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
                </h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                  {editItem ? `Memperbarui konfigurasi ${editItem.tahun_ajaran}` : 'Masukkan format tahun ajaran baru'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{ margin: '14px 22px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontSize: 12, fontWeight: 500 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Tahun Ajaran <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.tahun_ajaran}
                  onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                  placeholder="Contoh: 2024/2025"
                  disabled={!!editItem}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: editItem ? '#f8fafc' : '#ffffff',
                    border: '1px solid #cbd5e1', borderRadius: 8,
                    color: '#0f172a', fontSize: 13, outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; }}
                />
                {editItem && <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>Nama tahun ajaran tidak dapat diubah setelah dibuat.</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Status Periode
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    borderRadius: 8, color: '#0f172a', fontSize: 13,
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="aktif">Aktif (Operasional Sedang Berjalan)</option>
                  <option value="tutup">Tutup (Penginputan Ditutup)</option>
                  <option value="arsip">Arsip (Hanya Dapat Dilihat)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Batas Submit RKAS
                  </label>
                  <input
                    type="date"
                    value={form.batas_submit_rkas}
                    onChange={e => setForm(p => ({ ...p, batas_submit_rkas: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px',
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: 8, color: '#0f172a', fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Batas Submit Laporan
                  </label>
                  <input
                    type="date"
                    value={form.batas_submit_laporan}
                    onChange={e => setForm(p => ({ ...p, batas_submit_laporan: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px',
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: 8, color: '#0f172a', fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#475569', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: '#2563eb', border: 'none',
                  color: '#ffffff', fontSize: 13, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

