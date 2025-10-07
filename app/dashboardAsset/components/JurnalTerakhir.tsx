// File: app/dashboardAsset/components/JurnalTerakhir.tsx

"use client";

import React, { useState, useEffect } from 'react';
import type { AssetLogWithAsset } from '@/lib/data';

const formatDate = (dateString: Date) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function JurnalTerakhir() {
  const [logs, setLogs] = useState<AssetLogWithAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/assets/logs'); 
        if (!response.ok) {
          throw new Error('Gagal mengambil data log');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Jurnal Terakhir
      </h3>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {isLoading ? (
          <p className="text-sm text-gray-500 text-center pt-8">Memuat jurnal...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center pt-8">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center pt-8">
            Belum ada aktivitas terbaru.
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border-b border-gray-200 pb-2 last:border-b-0">
              <p className="font-bold text-[#01449D] uppercase">
                {log.asset.productName}
              </p>
              <p className="text-sm text-gray-500">{formatDate(log.createdAt)}</p>
              
              <p className="text-sm text-gray-800">
                {log.description}
                {/* Cek apakah ada data user, jika ada, tampilkan namanya */}
                {log.recordedBy && (
                  // --- PERBAIKAN DI SINI ---
                  // Menggunakan 'fullName' sesuai dengan data dari API
                  <span className="text-gray-500"> oleh {log.recordedBy.fullName}</span>
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

