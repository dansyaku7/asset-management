// File: app/(dashboard)/dashboardMain/page.tsx
// VERSI REFACTOR: Sisi kiri disamakan dengan halaman login

"use client";
import Link from "next/link";
import React from "react";
// --- CATATAN: ---
// Jika path gambar "/images/3d-doctor-klinik.png" tidak muncul,
// pastikan file gambar itu ada di dalam folder /public/images/
// Jika kamu mau pakai <Image> dari next/image, jangan lupa import:
// import Image from "next/image";

type ModuleCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  disabled?: boolean;
};

// --- Style Kartu Modul (Tidak ada perubahan) ---
const ModuleCard = ({
  title,
  description,
  icon,
  href,
  disabled,
}: ModuleCardProps) => (
  <Link href={disabled ? "#" : href} legacyBehavior>
    <a
      className={`block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.03] transition-all duration-300 ease-in-out ${
        disabled
          ? "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-lg"
          : "cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 bg-blue-50 text-blue-600 p-4 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  </Link>
);

// --- Icon (Tidak ada perubahan) ---
const AssetIcon = () => <i className="fas fa-boxes-stacked fa-fw"></i>;
const AccountingIcon = () => <i className="fas fa-calculator fa-fw"></i>;
const ClinicIcon = () => <i className="fas fa-file-medical fa-fw"></i>;

export default function DashboardMainPage() {
  return (
    // --- Layout Utama (Tidak ada perubahan) ---
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      
      {/* // VVVV--- INI BAGIAN YANG DIGANTI ---VVVV
      // Sisi kiri sekarang diambil dari app/page.tsx
      // Kelas responsif (w-full md:w-1/2) dan padding (p-8 md:p-12) tetap dipakai
      // dari dashboardMain/page.tsx agar layout konsisten.
      */}
      <div
        className="w-full md:w-1/2 flex flex-col items-center justify-center text-white p-8 md:p-12 relative overflow-hidden"
        style={{ backgroundColor: "#01449D" }}
      >
        {/* Pola Wavy SVG dari app/page.tsx */}
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="wavy"
              patternUnits="userSpaceOnUse"
              width="40"
              height="80"
              patternTransform="rotate(45)"
            >
              <path
                d="M 0 20 Q 10 10, 20 20 T 40 20"
                stroke="#ffffff"
                strokeWidth="1"
                fill="none"
                strokeOpacity="0.1"
              />
              <path
                d="M 0 60 Q 10 50, 20 60 T 40 60"
                stroke="#ffffff"
                strokeWidth="1"
                fill="none"
                strokeOpacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wavy)" />
        </svg>

        {/* Konten (Gambar & Teks) dari app/page.tsx */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <img
            src="/images/3d-doctor-klinik.png"
            alt="3D Illustration of a doctor"
            width={500}
            height={500}
            className="mb-8 object-contain"
          />
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Welcome to the new era of clinical management.
          </h2>
          <p className="mt-4" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
            Access your clinical information system for faster and modern
            services.
          </p>
        </div>
      </div>
      {/* ^^^^--- AKHIR BAGIAN YANG DIGANTI ---^^^^ */}


      {/* --- SISI KANAN (Putih/Abu) - Tidak ada perubahan --- */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
            Select a Module
          </h2>
          <div className="space-y-6">
            <ModuleCard
              title="Asset Management"
              description="Manage all company assets."
              icon={<AssetIcon />}
              href="/dashboardAsset"
            />
            <ModuleCard
              title="Accounting"
              description="Access financial records and reports."
              icon={<AccountingIcon />}
              href="/dashboardAccounting"
            />
            <ModuleCard
              title="SIM Klinik"
              description="Clinical information system."
              icon={<ClinicIcon />}
              href="/dashboardSimKlinik"
            />
          </div>
        </div>
      </div>
    </div>
  );
}