"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch, getDashboardUrl, UserRole } from "@/lib/api";
import {
  AlertCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to appropriate dashboard
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.role) router.push(getDashboardUrl(u.role as UserRole));
      } catch {
        /* ignore */
      }
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
        setError(data.error || "Username atau password tidak sesuai");
      }
    } catch {
      setError("Server tidak merespons. Pastikan sistem terhubung.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#09090b",
      }}
    >
      {/* Subtle Ambient Background Accent */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Glass Login Card */}
      <div
        className="animate-in"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "440px",
          background: "rgba(24, 24, 27, 0.8)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "24px",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.06)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo & Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: "#ffffff",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
              marginBottom: 16,
            }}
          >
            <Image
              src="/Logo Disdik.jpg"
              alt="Logo Disdik Cirebon"
              width={64}
              height={64}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}
          >
            Sistem Informasi Dana BOS
          </h1>
          <p style={{ fontSize: "13px", color: "#a1a1aa", fontWeight: 500 }}>
            Dinas Pendidikan Kabupaten Cirebon
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              marginBottom: 24,
              padding: "12px 14px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#f87171",
              fontSize: "13px",
              fontWeight: 500,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Username Input */}
          <div>
            <label
              htmlFor="username-input"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#a1a1aa",
                marginBottom: 8,
              }}
            >
              Username
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#71717a",
                  display: "flex",
                  pointerEvents: "none",
                }}
              >
                <User size={18} />
              </div>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                required
                autoComplete="username"
                style={{
                  width: "100%",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "12px",
                  padding: "12px 14px 12px 42px",
                  color: "#fafafa",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.15s ease",
                  boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.4)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(99, 102, 241, 0.25), inset 0 1px 2px rgba(0, 0, 0, 0.4)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#27272a";
                  e.target.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.4)";
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password-input"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#a1a1aa",
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#71717a",
                  display: "flex",
                  pointerEvents: "none",
                }}
              >
                <Lock size={18} />
              </div>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "12px",
                  padding: "12px 44px 12px 42px",
                  color: "#fafafa",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.15s ease",
                  boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.4)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(99, 102, 241, 0.25), inset 0 1px 2px rgba(0, 0, 0, 0.4)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#27272a";
                  e.target.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.4)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "13px 20px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow:
                "0 4px 14px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              opacity: loading ? 0.75 : 1,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center",
            fontSize: "12px",
            color: "#71717a",
          }}
        >
          © 2026 Dinas Pendidikan Kabupaten Cirebon
        </div>
      </div>
    </div>
  );
}

