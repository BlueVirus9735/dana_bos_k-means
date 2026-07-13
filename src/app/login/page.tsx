"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getDashboardUrl, UserRole } from "@/lib/api";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    // If already logged in, redirect to appropriate dashboard
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.role) router.push(getDashboardUrl(u.role as UserRole));
      } catch { /* ignore */ }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/login.php", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save unified user object (support both old 'admin' key and new 'user' key)
        const userObj = { ...data.user, role: data.role };
        localStorage.setItem("user", JSON.stringify(userObj));
        // Legacy compat for existing admin pages
        if (data.role === "admin") {
          localStorage.setItem("admin", JSON.stringify(data.user));
        }
        router.push(getDashboardUrl(data.role as UserRole));
      } else {
        setError(data.error || "Kredensial tidak valid");
      }
    } catch {
      setError("Server tidak merespons. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 420,
        padding: '36px 28px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40,
            background: '#fff',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <img
              src="/Logo%20Disdik.jpg"
              alt="Logo Disdik"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Sistem Dana BOS
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Dinas Pendidikan Kab. Cirebon
            </p>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
          Masuk sebagai <strong style={{ color: 'var(--text-secondary)' }}>Admin Dinas</strong> atau{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>Operator Sekolah</strong>
        </p>

        {error && (
          <div style={{
            marginBottom: 20,
            padding: '10px 14px',
            background: 'var(--red-bg)',
            border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--red)',
            fontSize: 13,
            fontWeight: 500,
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Masukkan username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: 8, justifyContent: 'center', padding: '10px' }}
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
