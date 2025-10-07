// File: app/dashboardAsset/components/AuthGuard.tsx

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Komponen untuk tampilan loading
const FullPageLoader = () => (
  <div className="fixed inset-0 bg-white flex justify-center items-center z-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    <p className="ml-4 text-lg text-gray-700">Memverifikasi Sesi...</p>
  </div>
);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('authToken');

      // 1. Jika tidak ada token sama sekali, langsung tendang ke login
      if (!token) {
        router.replace('/'); // Ganti '/login' dengan halaman login lu
        return;
      }

      try {
        // 2. Kirim token ke API untuk diverifikasi
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        // 3. Jika API bilang token tidak valid, hapus token rusak & tendang ke login
        if (!response.ok || !data.isValid) {
          localStorage.removeItem('authToken');
          router.replace('/'); // Ganti '/login' dengan halaman login lu
        } else {
          // 4. Jika valid, izinkan halaman untuk ditampilkan
          setIsVerified(true);
        }
      } catch (error) {
        console.error("Gagal memverifikasi sesi:", error);
        localStorage.removeItem('authToken');
        router.replace('/'); // Ganti '/login' dengan halaman login lu
      }
    };

    verifySession();
  }, [router]);

  // Selama proses verifikasi, tampilkan loading.
  // Jangan tampilkan isi halaman (children) sebelum verifikasi selesai.
  if (!isVerified) {
    return <FullPageLoader />;
  }

  // Jika sudah terverifikasi, baru tampilkan isi halamannya.
  return <>{children}</>;
}
