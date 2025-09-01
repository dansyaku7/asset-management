// app/dashboardAsset/maintenance/page.tsx

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Maintenance, Asset } from '@prisma/client';
import MaintenanceDialog from '../components/MaintenanceDialog';
import MaintenanceTable from '../components/MaintenanceTable';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

type MaintenanceWithAsset = Maintenance & { asset: Asset };

const MaintenanceListItem = ({ maintenance }: { maintenance: MaintenanceWithAsset }) => {
    const getStatusClass = (status: string) => {
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
            <h4 className="font-bold text-blue-800">{maintenance.asset.productName}</h4>
            <p className="text-sm text-gray-500 mb-1">Petugas: {maintenance.asset.picName || '--'}</p>
            <div className="flex justify-between items-center">
                <p className="text-gray-700">{maintenance.description}</p>
                <span className={`font-semibold text-sm ${getStatusClass(maintenance.status)}`}>
                    {maintenance.status.replace('_', ' ')}
                </span>
            </div>
        </div>
    );
};

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceWithAsset[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<Maintenance | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [maintRes, assetsRes] = await Promise.all([
        fetch('/api/assets/maintenance'),
        fetch('/api/assets')
      ]);
      if (!maintRes.ok || !assetsRes.ok) throw new Error('Gagal memuat data');
      
      const maintData = await maintRes.json();
      const assetsData = await assetsRes.json();
      
      setMaintenances(maintData);
      setAssets(assetsData.assets);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMaintenances = useMemo(() => {
    if (!selectedDate) return [];
    return maintenances.filter(m => 
        m.scheduledDate && isSameDay(new Date(m.scheduledDate), selectedDate)
    );
  }, [maintenances, selectedDate]);
  
  const handleAddClick = () => { setMaintenanceToEdit(null); setIsDialogOpen(true); };
  const handleEditClick = (maintenance: Maintenance) => { setMaintenanceToEdit(maintenance); setIsDialogOpen(true); };
  const handleDeleteClick = async (id: string) => { if (confirm('Yakin ingin menghapus jadwal ini?')) { try { const response = await fetch(`/api/assets/maintenance/${id}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Gagal menghapus data'); fetchData(); } catch (error) { alert('Gagal menghapus data'); } } };
  const handleMarkAsDone = async (maintenance: MaintenanceWithAsset) => { if (confirm(`Yakin ingin menandai maintenance untuk "${maintenance.asset.productName}" sebagai Selesai?`)) { try { const response = await fetch(`/api/assets/maintenance/${maintenance.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED', completionDate: new Date().toISOString(), }), }); if (!response.ok) throw new Error('Gagal update status'); fetchData(); } catch (error) { alert('Gagal update status'); } } };
  const handleReopenTask = async (maintenance: MaintenanceWithAsset) => { if (confirm(`Yakin ingin membuka kembali maintenance untuk "${maintenance.asset.productName}"?`)) { try { const response = await fetch(`/api/assets/maintenance/${maintenance.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'IN_PROGRESS', completionDate: null, }), }); if (!response.ok) throw new Error('Gagal membuka kembali task'); fetchData(); } catch (error) { alert('Gagal membuka kembali task'); } } };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatCurrency = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined) return '--';
    return `Rp ${cost.toLocaleString('id-ID')}`;
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


  return (
    <>
      <MaintenanceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onFormSubmit={fetchData}
        maintenanceToEdit={maintenanceToEdit}
        assets={assets}
      />

      <div className="space-y-8">
        
        {/* BAGIAN ATAS: KALENDER */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Jadwal Maintenance</h3>
            {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat kalender...</p>) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-gray-50 p-4 rounded-xl flex justify-center">
                    <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={id} showOutsideDays fixedWeeks className="text-gray-800"
                        modifiers={{ scheduled: maintenances.map(m => m.scheduledDate ? new Date(m.scheduledDate) : null).filter((d): d is Date => d !== null) }}
                        modifiersStyles={{ scheduled: { fontWeight: 'bold', color: '#01449D' } }}
                    />
                </div>
                <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl">
                    <h4 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">
                        {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: id }) : 'Pilih tanggal'}
                    </h4>
                    {filteredMaintenances.length > 0 ? (
                        <div className="space-y-2">{filteredMaintenances.map(m => (<MaintenanceListItem key={m.id} maintenance={m} />))}</div>
                    ) : (<p className="text-center text-gray-500 pt-8">Tidak ada jadwal.</p>)}
                </div>
            </div>
            )}
        </div>

        {/* BAGIAN BAWAH: RIWAYAT MAINTENANCE (TABEL & KARTU) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Riwayat Maintenance</h3>
                <button
                    onClick={handleAddClick}
                    className="bg-[#01449D] text-white px-4 py-2 rounded-lg font-semibold w-full sm:w-auto"
                >
                    + Add Maintenance
                </button>
            </div>

            {isLoading ? (<p className="text-center text-gray-500 py-10">Memuat riwayat...</p>) : (
                <>
                    {/* TAMPILAN TABEL UNTUK DESKTOP (LG KE ATAS) */}
                    <div className="hidden lg:block">
                        <MaintenanceTable
                            maintenances={maintenances}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                            onMarkAsDone={handleMarkAsDone}
                            onReopen={handleReopenTask}
                        />
                    </div>

                    {/* TAMPILAN KARTU UNTUK MOBILE & TABLET (DI BAWAH LG) */}
                    <div className="block lg:hidden">
                        {maintenances.length > 0 ? (
                            <div className="space-y-4">
                                {maintenances.map(m => (
                                    <div key={m.id} className="bg-gray-50 p-4 rounded-lg shadow">
                                        <div className="border-b pb-3 mb-3">
                                            <h4 className="font-bold text-gray-900">{m.asset.productName}</h4>
                                            <p className="text-sm text-gray-600">{m.description}</p>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Status</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(m.status)}`}>{m.status.replace('_', ' ')}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Jadwal</span> <span className="text-gray-800">{formatDate(m.scheduledDate)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Selesai</span> <span className="text-gray-800">{formatDate(m.completionDate)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Biaya</span> <span className="text-gray-800 font-bold">{formatCurrency(m.cost)}</span></div>
                                        </div>
                                        <div className="flex justify-end gap-x-4 mt-4 pt-3 border-t">
                                            {(m.status !== 'COMPLETED' && m.status !== 'CANCELLED') && (<button onClick={() => handleMarkAsDone(m)} className="text-green-600 font-medium">✅ Selesai</button>)}
                                            {m.status === 'COMPLETED' && (<button onClick={() => handleReopenTask(m)} className="text-yellow-600 font-medium">↩️ Buka Lagi</button>)}
                                            <button onClick={() => handleEditClick(m)} className="text-blue-600 font-medium">✏️ Edit</button>
                                            <button onClick={() => handleDeleteClick(m.id)} className="text-red-600 font-medium">🗑️ Hapus</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">Belum ada data maintenance.</div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </>
  );
}