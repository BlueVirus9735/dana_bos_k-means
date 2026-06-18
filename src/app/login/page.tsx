"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  ArrowRight,
  ShieldCheck,
  Database,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/login.php", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("admin", JSON.stringify(data.admin));
        router.push("/dashboard");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Dynamic Ambient Background */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"
        style={{ animationDuration: "10s", animationDelay: "1s" }}
      />
      <div
        className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-violet-600/20 blur-[100px] animate-pulse"
        style={{ animationDuration: "7s", animationDelay: "2s" }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50" />

      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Left Section - Hero/Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-10 p-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_0_15px_rgba(79,70,229,0.1)]">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-ping absolute"></span>
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] relative"></span>
            <span className="text-sm font-medium text-slate-300">
              Sistem Pintar Analisis Dana BOS
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Optimasi{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                Pendidikan
              </span>
              <br />
              Lebih Tepat Sasaran.
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              Platform analisis kebutuhan sarana dan prasarana pendidikan dasar
              menggunakan algoritma K-Means tingkat lanjut untuk alokasi Dana
              BOS yang presisi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              {
                icon: Database,
                title: "Data Terpusat",
                desc: "Integrasi menyeluruh",
              },
              { icon: Zap, title: "Proses Instan", desc: "K-Means Clustering" },
              {
                icon: ShieldCheck,
                title: "Akurasi Tinggi",
                desc: "Validasi Indikator",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <feature.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="relative group">
            {/* Animated border glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 rounded-[2rem] opacity-20 group-hover:opacity-40 blur transition duration-1000 group-hover:duration-200"></div>

            {/* Glassmorphism Card */}
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl">
              {/* Logo & Header */}
              <div className="flex flex-col items-center text-center mb-10">
                <div className="h-20 w-20 rounded-2xl bg-white p-1.5 shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20 mb-6 transform transition-transform hover:scale-105 duration-300">
                  <img
                    src="/Logo%20Disdik.jpg"
                    alt="Logo Disdik"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Selamat Datang
                </h2>
                <p className="text-slate-400 text-sm">
                  Masuk untuk melanjutkan ke dashboard admin
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle
                    size={18}
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-200 leading-tight">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="Masukkan username"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all pr-12"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group mt-8 overflow-hidden rounded-xl p-[1px]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <div className="relative flex items-center justify-center gap-2 bg-slate-950/20 backdrop-blur-sm px-4 py-3.5 rounded-xl transition-all duration-300 group-hover:bg-transparent">
                    {loading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-semibold text-white">
                          Memverifikasi...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-white text-base">
                          Masuk Sekarang
                        </span>
                        <ArrowRight
                          size={18}
                          className="text-white group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </div>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
