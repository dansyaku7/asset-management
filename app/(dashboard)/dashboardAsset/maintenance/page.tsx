// File: app/(dashboard)/dashboardAsset/maintenance/page.tsx
// VERSI REFACTOR: Responsive (Mobile Cards) + Style (Icons & Calendar)

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Maintenance, Asset, MaintenanceStatus, Branch, AssetLog } from '@prisma/client';
import MaintenanceDialog from '../components/MaintenanceDialog';
import PeminjamanDialog from '../components/PeminjamanDialog';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

// --- Types & Helper (Tidak ada perubahan) ---
type Activity = {
    id: string;
    type: 'MAINTENANCE' | 'PEMINJAMAN';
    assetName: string;
    branchName: string;
    description: string;
    status: MaintenanceStatus | 'DIPINJAM' | 'DIKEMBALIKAN';
    date: string | null;
    originalData: Maintenance | (AssetLog & { assetId: string });
};

type AssetWithBranch = Asset & { branch: Branch };

const getStatusClass = (status: Activity['status']) => {
    if (status === 'DIPINJAM') return 'bg-purple-100 text-purple-800';
    if (status === 'DIKEMBALIKAN') return 'bg-gray-200 text-gray-700';
    switch (status) {
        case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
        case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
        case 'COMPLETED': return 'bg-green-100 text-green-800';
        case 'CANCELLED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Komponen Tombol Aksi Desktop (BARU) ---
const TooltipIconButton = ({ 
  onClick, 
  icon, 
  tooltip, 
  colorClass // e.g., "text-blue-600 hover:text-blue-900"
}: { 
  onClick: () => void; 
  icon: string; // Font Awesome class, e.g., "fas fa-pencil-alt"
  tooltip: string;
  colorClass: string;
}) => (
  <button onClick={onClick} className={`group relative ${colorClass} p-2 rounded-md hover:bg-gray-100 transition-colors`}>
    <i className={`fa-fw ${icon}`}></i>
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
      {tooltip}
      {/* Tooltip Arrow */}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
    </span>
  </button>
);

export default function ActivityPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [activities, setActivities] = useState<Activity[]>([]);
    const [assets, setAssets] = useState<AssetWithBranch[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
    const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
    const [maintenanceToEdit, setMaintenanceToEdit] = useState<Maintenance | null>(null);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [activitiesRes, assetsRes, branchesRes] = await Promise.all([
                fetch('/api/v1/assets/activities'),
                fetch('/api/v1/assets'),
                fetch('/api/v1/management/branches') 
            ]);

            if (!activitiesRes.ok || !assetsRes.ok || !branchesRes.ok) {
                throw new Error('Gagal memuat data dari server.');
            }
            
            setActivities(await activitiesRes.json());
            setAssets((await assetsRes.json()).assets);
            setBranches(await branchesRes.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredActivitiesForCalendar = useMemo(() => {
        if (!selectedDate) return [];
        return activities.filter(act => act.date && isSameDay(new Date(act.date), selectedDate));
    }, [activities, selectedDate]);

    const handleAddMaintenanceClick = () => { setMaintenanceToEdit(null); setIsMaintenanceDialogOpen(true); };
    const handleEditMaintenanceClick = (maintenance: Maintenance) => { setMaintenanceToEdit(maintenance); setIsMaintenanceDialogOpen(true); };

    const createApiCall = async (url: string, method: 'DELETE' | 'PUT' | 'POST', body?: object) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("Anda harus login terlebih dahulu.");
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal melakukan aksi.');
        }
        return response.json();
    };
    
    const handleDeleteMaintenanceClick = (maint: Maintenance) => { 
        setConfirmation({
            title: 'Konfirmasi Hapus',
            message: `Yakin ingin menghapus jadwal ini?`,
            onConfirm: async () => {
                try {
                    await createApiCall(`/api/v1/assets/maintenance/${maint.id}`, 'DELETE');
                    fetchData();
                } catch (e: any) { alert(`Error: ${e.message}`); }
            }
        });
     };

    const handleUpdateMaintenanceStatus = (maint: Maintenance, newStatus: 'COMPLETED' | 'CANCELLED') => {
        const isCompleting = newStatus === 'COMPLETED';
        const actionText = isCompleting ? 'menyelesaikan' : 'membatalkan';

        setConfirmation({
            title: `Konfirmasi ${isCompleting ? 'Penyelesaian' : 'Pembatalan'}`,
            message: `Yakin ingin ${actionText} maintenance? Status aset akan diupdate.`,
            onConfirm: async () => {
                try {
                    await createApiCall(`/api/v1/assets/maintenance/${maint.id}`, 'PUT', { status: newStatus });
                    fetchData();
                } catch (error: any) {
                    alert(`Error: ${error.message}`);
                }
            }
        });
    };

    const handleReturnClick = (activity: Activity) => {
        setConfirmation({
            title: 'Konfirmasi Pengembalian Aset',
            message: `Yakin ingin mengembalikan aset "${activity.assetName}"? Status aset akan menjadi BAIK dan lokasi akan dikembalikan ke cabang asal.`,
            onConfirm: async () => {
                try {
                    const assetId = (activity.originalData as AssetLog).assetId;
                    if (!assetId) throw new Error("ID Aset tidak ditemukan pada log.");
                    
                    await createApiCall('/api/v1/assets/return', 'POST', { assetId });
                    fetchData();
                } catch (e: any) {
                    alert(`Error: ${e.message}`);
                }
            }
        });
    };
    
    if (error) return <div className="bg-red-100 p-4 rounded-md">{error}</div>;

    return (
        <>
            <MaintenanceDialog isOpen={isMaintenanceDialogOpen} onClose={() => setIsMaintenanceDialogOpen(false)} onFormSubmit={fetchData} maintenanceToEdit={maintenanceToEdit} assets={assets} />
            <PeminjamanDialog isOpen={isBorrowDialogOpen} onClose={() => setIsBorrowDialogOpen(false)} onFormSubmit={fetchData} assets={assets} branches={branches} />
            {confirmation && <ConfirmationDialog isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} />}

            <div className="space-y-8">
                {/* --- PERUBAHAN: Blok Kalender --- */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Jadwal Aktivitas Aset</h3>
                    {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat kalender...</p>) : (
                        // Breakpoint diubah ke 'md' (tablet)
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Kalender dibuat col-span-1 (lebih ramping) */}
                            <div className="md:col-span-1 bg-gray-50 p-4 rounded-xl flex justify-center border border-gray-200">
                                <DayPicker 
                                    mode="single" 
                                    selected={selectedDate} 
                                    onSelect={setSelectedDate} 
                                    locale={id}
                                    modifiers={{ scheduled: activities.map(act => act.date ? new Date(act.date) : new Date()).filter(Boolean) }}
                                    modifiersStyles={{ scheduled: { fontWeight: 'bold', color: '#01449D' } }}
                                />
                            </div>
                            {/* List jadwal dibuat col-span-2 (lebih lebar) */}
                            <div className="md:col-span-2 bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-lg mb-4 text-gray-800 border-b border-gray-300 pb-2">
                                    {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: id }) : 'Pilih tanggal'}
                                </h4>
                                {/* PERUBAHAN: Tampilan list jadwal dibuat lebih rapi */}
                                {filteredActivitiesForCalendar.length > 0 ? (
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {filteredActivitiesForCalendar.map(act => (
                                            <div key={act.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-900">{act.assetName}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(act.status)}`}>{act.status.replace('_', ' ')}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (<p className="text-center text-gray-500 pt-8">Tidak ada aktivitas terjadwal.</p>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- PERUBAHAN: Blok Riwayat --- */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-2xl font-bold text-gray-900">Riwayat Aktivitas</h3>
                        {/* Tombol diberi icon */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button onClick={() => setIsBorrowDialogOpen(true)} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                                <i className="fas fa-hand-holding-hand fa-fw"></i>
                                <span>Peminjaman Aset</span>
                            </button>
                            <button onClick={handleAddMaintenanceClick} className="flex items-center justify-center gap-2 bg-[#01449D] text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-semibold">
                                <i className="fas fa-plus fa-fw"></i>
                                <span>Tambah Maintenance</span>
                            </button>
                        </div>
                    </div>
                    {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat riwayat...</p>) : (
                        <>
                            {/* --- PERUBAHAN: Tabel Desktop (hidden di HP) --- */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Nama Aset</th>
                                            <th className="px-6 py-3">Aktivitas</th>
                                            <th className="px-6 py-3">Cabang</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Tanggal</th>
                                            <th className="px-6 py-3">Detail</th>
                                            <th className="px-6 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.length > 0 ? (activities.map(act => (
                                            <tr key={act.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{act.assetName}</td>
                                                <td className="px-6 py-4 font-semibold">{act.type.replace('_', ' ')}</td>
                                                <td className="px-6 py-4">{act.branchName}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(act.status)}`}>{act.status.replace('_', ' ')}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap">{formatDate(act.date)}</td>
                                                <td className="px-6 py-4 max-w-xs break-words">{act.description}</td>
                                                {/* PERUBAHAN: Aksi diganti icon + tooltip */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-x-1">
                                                        {act.type === 'PEMINJAMAN' && act.status === 'DIPINJAM' && (
                                                            <TooltipIconButton
                                                                onClick={() => handleReturnClick(act)}
                                                                icon="fas fa-undo-alt"
                                                                tooltip="Kembalikan Aset"
                                                                colorClass="text-green-600 hover:text-green-900"
                                                            />
                                                        )}
                                                        {act.type === 'MAINTENANCE' && (
                                                            <>
                                                                <TooltipIconButton
                                                                    onClick={() => handleEditMaintenanceClick(act.originalData as Maintenance)}
                                                                    icon="fas fa-pencil-alt"
                                                                    tooltip="Edit"
                                                                    colorClass="text-blue-600 hover:text-blue-900"
                                                                />
                                                                <TooltipIconButton
                                                                    onClick={() => handleDeleteMaintenanceClick(act.originalData as Maintenance)}
                                                                    icon="fas fa-trash-alt"
                                                                    tooltip="Hapus"
                                                                    colorClass="text-red-600 hover:text-red-900"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))) : (<tr><td colSpan={7} className="text-center py-10 text-gray-500">Belum ada riwayat aktivitas.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* --- PERUBAHAN: Tampilan Card Mobile (BARU) --- */}
                            <div className="block md:hidden space-y-4">
                                {activities.length > 0 ? (activities.map(act => (
                                    <div key={act.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{act.assetName}</h4>
                                                <p className="text-sm text-gray-500">{act.branchName}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(act.status)}`}>{act.status.replace('_', ' ')}</span>
                                        </div>
                                        
                                        {/* Card Body */}
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Aktivitas</span> 
                                                <span className="text-gray-800 font-semibold">{act.type.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Tanggal</span> 
                                                <span className="text-gray-700">{formatDate(act.date)}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-600 block mb-1">Detail</span> 
                                                <p className="text-gray-700 text-xs break-words">{act.description}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Card Footer (Actions) */}
                                        <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                            {act.type === 'PEMINJAMAN' && act.status === 'DIPINJAM' && (
                                                <button onClick={() => handleReturnClick(act)} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    Kembalikan
                                                </button>
                                            )}
                                            {act.type === 'MAINTENANCE' && (
                                                <>
                                                    <button onClick={() => handleEditMaintenanceClick(act.originalData as Maintenance)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteMaintenanceClick(act.originalData as Maintenance)} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                        Hapus
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))) : (
                                    <div className="text-center py-10 text-gray-500">Belum ada riwayat aktivitas.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}