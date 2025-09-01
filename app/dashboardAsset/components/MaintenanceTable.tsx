// app/dashboardAsset/components/MaintenanceTable.tsx

"use client";
import React from 'react';
import type { Maintenance, Asset } from '@prisma/client';

type MaintenanceWithAsset = Maintenance & { asset: Asset };

type MaintenanceTableProps = {
  maintenances: MaintenanceWithAsset[];
  onEdit: (maintenance: Maintenance) => void;
  onDelete: (id: string) => void;
  onMarkAsDone: (maintenance: MaintenanceWithAsset) => void;
  onReopen: (maintenance: MaintenanceWithAsset) => void;
};

const getStatusClass = (status: string) => {
    switch (status) {
        case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
        case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
        case 'COMPLETED': return 'bg-green-100 text-green-800';
        case 'CANCELLED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '--';
    // --- PERBAIKAN DI SINI ---
    // Nama fungsi yang salah 'toLocaleDateDateString' diubah menjadi 'toLocaleDateString'
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const formatCurrency = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined) return '--';
    return `Rp ${cost.toLocaleString('id-ID')}`;
}

export default function MaintenanceTable({ maintenances, onEdit, onDelete, onMarkAsDone, onReopen }: MaintenanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">Nama Aset</th>
            <th scope="col" className="px-6 py-3">Deskripsi</th>
            <th scope="col" className="px-6 py-3">Status</th>
            <th scope="col" className="px-6 py-3">Jadwal</th>
            <th scope="col" className="px-6 py-3">Selesai</th>
            <th scope="col" className="px-6 py-3">Biaya</th>
            <th scope="col" className="px-6 py-3 min-w-[240px]">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {maintenances.length > 0 ? (
            maintenances.map(m => (
              <tr key={m.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{m.asset.productName}</td>
                <td className="px-6 py-4">{m.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(m.status)}`}>
                    {m.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(m.scheduledDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(m.completionDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(m.cost)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-x-4">
                    {(m.status !== 'COMPLETED' && m.status !== 'CANCELLED') && (
                      <button 
                        onClick={() => onMarkAsDone(m)} 
                        className="text-green-600 hover:text-green-800 font-medium"
                        title="Tandai sebagai Selesai"
                      >
                        ✅ Selesai
                      </button>
                    )}
                    
                    {m.status === 'COMPLETED' && (
                        <button
                            onClick={() => onReopen(m)}
                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                            title="Buka Kembali Task"
                        >
                            ↩️ Buka Lagi
                        </button>
                    )}
                    
                    <button onClick={() => onEdit(m)} className="text-blue-600 hover:text-blue-800 font-medium">✏️ Edit</button>
                    <button onClick={() => onDelete(m.id)} className="text-red-600 hover:text-red-800 font-medium">🗑️ Hapus</button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={7} className="text-center py-10 text-gray-500">Belum ada data maintenance.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}