// File: app/(dashboard)/dashboardAsset/components/JurnalTerakhir.tsx
// Versi perbaikan dengan path API yang benar

"use client";
import React, { useState, useEffect } from 'react';

// Definisikan tipe data yang kita harapkan dari API baru
type LogWithDetails = {
    id: string;
    createdAt: Date;
    description: string;
    asset: {
        productName: string;
    };
    recordedBy: {
        fullName: string;
    } | null;
};

const formatDate = (dateString: Date) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function JurnalTerakhir() {
  const [logs, setLogs] = useState<LogWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // --- PERBAIKAN UTAMA DI SINI ---
        // Menggunakan path API yang benar
        const response = await fetch('/api/v1/assets/logs'); 
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
        Jurnal Aktivitas Terakhir
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
            <div key={log.id} className="border-b border-gray-200 pb-3 last:border-b-0">
              <p className="font-bold text-blue-700">
                {log.asset.productName}
              </p>
              <p className="text-xs text-gray-500 mb-1">{formatDate(log.createdAt)}</p>
              
              <p className="text-sm text-gray-800">
                {log.description}
                {log.recordedBy && (
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
