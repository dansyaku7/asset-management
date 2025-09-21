"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Maintenance, Asset, MaintenanceStatus } from '@prisma/client';
import MaintenanceDialog from '../components/MaintenanceDialog';
import PeminjamanDialog from '../components/PeminjamanDialog';
// --- PERUBAHAN 1: Import dialog konfirmasi baru ---
import ConfirmationDialog from '../components/ConfirmationDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

type Activity = {
  id: string; type: 'MAINTENANCE' | 'PEMINJAMAN'; assetName: string;
  description: string; status: MaintenanceStatus | 'DIPINJAM'; date: string | Date;
  asset: Asset; originalMaintenance: Maintenance | null;
};

const ActivityListItem = ({ activity }: { activity: Activity }) => {
    const getStatusClass = (status: string) => {
        if (status === 'DIPINJAM') return 'text-purple-600';
        switch (status) {
            case 'SCHEDULED': return 'text-blue-600';
            case 'IN_PROGRESS': return 'text-yellow-600';
            case 'COMPLETED': return 'text-green-600';
            case 'CANCELLED': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };
    return (
        <div className="border-b py-4">
            <h4 className="font-bold text-blue-800">{activity.assetName}</h4>
            <div className="flex justify-between items-center">
                <p className="text-gray-700 text-sm">{activity.description}</p>
                <span className={`font-semibold text-sm ${getStatusClass(activity.status)}`}>
                    {activity.status.replace('_', ' ')}
                </span>
            </div>
        </div>
    );
};

export default function MaintenancePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<Maintenance | null>(null);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);

  // --- PERUBAHAN 2: State baru untuk mengontrol dialog konfirmasi ---
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [activitiesRes, assetsRes] = await Promise.all([
            fetch('/api/assets/activities'),
            fetch('/api/assets')
        ]);
        if (!activitiesRes.ok || !assetsRes.ok) throw new Error('Gagal memuat data');
        
        const activitiesData = await activitiesRes.json();
        const assetsData = await assetsRes.json();
        
        setActivities(activitiesData);
        setAssets(assetsData.assets);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);
  const filteredActivities = useMemo(() => {
    if (!selectedDate) return [];
    return activities.filter(act => 
        act.date && isSameDay(new Date(act.date), selectedDate)
    );
  }, [activities, selectedDate]);
  
  const handleEditMaintenanceClick = (maintenance: Maintenance) => { setMaintenanceToEdit(maintenance); setIsMaintenanceDialogOpen(true); };
  const handleAddMaintenanceClick = () => { setMaintenanceToEdit(null); setIsMaintenanceDialogOpen(true); };

  // --- PERUBAHAN 3: Semua fungsi 'handle' diubah untuk menggunakan dialog baru ---
  const handleDeleteMaintenanceClick = (maint: Maintenance) => {
    setConfirmation({
      title: 'Konfirmasi Hapus',
      message: `Yakin ingin menghapus jadwal maintenance untuk "${(maint as any).asset?.productName || 'aset ini'}"? Aksi ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/assets/maintenance/${maint.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Gagal menghapus');
          fetchData();
        } catch (e) { alert('Gagal menghapus data'); }
      }
    });
  };

  const handleReturnClick = async (asset: Asset) => {
    setConfirmation({
        title: 'Konfirmasi Pengembalian',
        message: `Pastikan aset "${asset.productName}" sudah diterima dalam kondisi baik sebelum melanjutkan.`,
        onConfirm: async () => {
            try { 
                const res = await fetch('/api/assets/return', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: asset.id }) }); 
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); } 
                fetchData(); 
            } catch (e: any) { alert(`Error: ${e.message}`); }
        }
    });
  };

  const handleUpdateMaintenanceStatus = async (maint: Maintenance, newStatus: 'COMPLETED' | 'CANCELLED') => {
    const isCompleting = newStatus === 'COMPLETED';
    const actionText = isCompleting ? 'menyelesaikan' : 'menggagalkan';
    const assetName = (maint as any).asset?.productName || 'aset ini';

    setConfirmation({
        title: `Konfirmasi ${isCompleting ? 'Penyelesaian' : 'Pembatalan'}`,
        message: `Yakin ingin ${actionText} maintenance untuk "${assetName}"? Status aset akan diupdate sesuai aksi ini.`,
        onConfirm: async () => {
            try {
                const response = await fetch(`/api/assets/maintenance/${maint.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal update status');
                }
                fetchData();
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            }
        }
    });
  };

  const formatDate = (date: any) => !date ? '--' : new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const getStatusClass = (status: string) => {
    if (status === 'DIPINJAM') return 'bg-purple-100 text-purple-800';
    switch (status) {
        case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
        case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
        case 'COMPLETED': return 'bg-green-100 text-green-800';
        case 'CANCELLED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <MaintenanceDialog isOpen={isMaintenanceDialogOpen} onClose={() => setIsMaintenanceDialogOpen(false)} onFormSubmit={fetchData} maintenanceToEdit={maintenanceToEdit} assets={assets} />
      <PeminjamanDialog isOpen={isBorrowDialogOpen} onClose={() => setIsBorrowDialogOpen(false)} onFormSubmit={fetchData} assets={assets} />
      {/* --- PERUBAHAN 4: Render dialog konfirmasi --- */}
      {confirmation && (
        <ConfirmationDialog
            isOpen={!!confirmation}
            onClose={() => setConfirmation(null)}
            onConfirm={confirmation.onConfirm}
            title={confirmation.title}
            message={confirmation.message}
        />
      )}

      <div className="space-y-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Jadwal Aktivitas Aset</h3>
            {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat kalender...</p>) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-gray-50 p-4 rounded-xl flex justify-center">
                    <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={id}
                        modifiers={{ scheduled: activities.map(act => new Date(act.date)) }}
                        modifiersStyles={{ scheduled: { fontWeight: 'bold', color: '#01449D' } }}/>
                </div>
                <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl">
                    <h4 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">{selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: id }) : 'Pilih tanggal'}</h4>
                    {filteredActivities.length > 0 ? (<div className="space-y-2">{filteredActivities.map(act => (<ActivityListItem key={act.id} activity={act} />))}</div>) : (<p className="text-center text-gray-500 pt-8">Tidak ada aktivitas.</p>)}
                </div>
            </div>
            )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Riwayat Aktivitas</h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsBorrowDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">Peminjaman Aset</button>
                    <button onClick={handleAddMaintenanceClick} className="bg-[#01449D] hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold">+ Add Maintenance</button>
                </div>
            </div>
            {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat riwayat...</p>) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Nama Aset</th>
                                <th className="px-6 py-3">Aktivitas</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Tanggal</th>
                                <th className="px-6 py-3">Detail</th>
                                <th className="px-6 py-3 min-w-[240px]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.length > 0 ? (activities.map(act => (
                                <tr key={act.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{act.assetName}</td>
                                    <td className="px-6 py-4 font-semibold">{act.type === 'MAINTENANCE' ? 'Maintenance' : 'Peminjaman'}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(act.status)}`}>{act.status.replace('_', ' ')}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(act.date)}</td>
                                    <td className="px-6 py-4">{act.description}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-x-4">
                                            {act.type === 'PEMINJAMAN' && act.asset.status === 'DIPINJAM' && (
                                                <button onClick={() => handleReturnClick(act.asset)} className="font-medium text-blue-600 hover:text-blue-800">Kembalikan</button>
                                            )}
                                            {act.type === 'MAINTENANCE' && act.originalMaintenance && (act.status === 'SCHEDULED' || act.status === 'IN_PROGRESS') && (
                                                <>
                                                    <button onClick={() => handleUpdateMaintenanceStatus(act.originalMaintenance!, 'COMPLETED')} className="text-green-600 hover:text-green-800 font-medium">✅ Selesai</button>
                                                    <button onClick={() => handleUpdateMaintenanceStatus(act.originalMaintenance!, 'CANCELLED')} className="text-orange-600 hover:text-orange-800 font-medium">❌ Gagal</button>
                                                </>
                                            )}
                                            {act.type === 'MAINTENANCE' && act.originalMaintenance && (
                                                <>
                                                    <button onClick={() => handleEditMaintenanceClick(act.originalMaintenance!)} className="text-blue-600 hover:text-blue-800 font-medium">✏️ Edit</button>
                                                    {/* --- PERUBAHAN 5: Panggil fungsi delete yang baru --- */}
                                                    <button onClick={() => handleDeleteMaintenanceClick(act.originalMaintenance!)} className="text-red-600 hover:text-red-800 font-medium">🗑️ Hapus</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))) : (<tr><td colSpan={6} className="text-center py-10 text-gray-500">Belum ada aktivitas.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </>
  );
}

