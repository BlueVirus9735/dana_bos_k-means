import type { Metadata } from "next";
import "./theme.css";

export const metadata: Metadata = {
  title: "Sistem Dana BOS — K-Means Clustering",
  description: "Analisis kebutuhan sarana prasarana sekolah berbasis K-Means Clustering",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
