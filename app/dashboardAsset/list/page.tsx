"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Asset, Location, AssetStatus } from '@prisma/client';
import AssetForm from '../components/AssetForm';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { QRCodeSVG } from 'qrcode.react';

// Tipe data diupdate untuk menyertakan notifikasi
type AssetWithDetails = Omit<Asset, 'price' | 'salvageValue'> & { 
  location: Location; 
  qrCodeValue: string;
  price: number;
  salvageValue: number;
  notification: { type: 'warning' | 'error', message: string } | null;
};
type ApiResponse = { 
    summary: any;
    assets: AssetWithDetails[];
};

// Komponen Ikon untuk Notifikasi dengan Tooltip
const WarningIcon = ({ message }: { message: string }) => (
    <div className="relative group">
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
        </svg>
        <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs text-center rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
            {message}
            <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
    </div>
);

const ErrorIcon = ({ message }: { message: string }) => (
    <div className="relative group">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
        </svg>
        <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs text-center rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
            {message}
            <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
    </div>
);


const getStatusClass = (status: AssetStatus | string) => {
    switch (status) {
        case 'BAIK': return 'bg-green-100 text-green-800';
        case 'RUSAK': return 'bg-red-100 text-red-800';
        case 'PERBAIKAN': return 'bg-yellow-100 text-yellow-800';
        case 'DIPINJAM': return 'bg-purple-100 text-purple-800';
        case 'KALIBRASI_EXPIRED': return 'bg-red-200 text-red-900 font-bold';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatCurrency = (value: number): string => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const calculateDepreciation = (asset: AssetWithDetails) => {
    const price = asset.price;
    const salvage = asset.salvageValue;
    const lifeInMonths = asset.usefulLife * 12;

    if (lifeInMonths <= 0) {
        return { monthlyDepreciation: 0, bookValue: price };
    }

    const monthlyDepreciation = (price - salvage) / lifeInMonths;
    const ageInMonths = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * (365.25 / 12));
    
    let accumulatedDepreciation = monthlyDepreciation * ageInMonths;
    if (accumulatedDepreciation > (price - salvage)) {
        accumulatedDepreciation = price - salvage;
    }
    
    const bookValue = price - accumulatedDepreciation;

    return {
        monthlyDepreciation: bookValue > salvage ? monthlyDepreciation : 0,
        bookValue: bookValue < salvage ? salvage : bookValue,
    };
};

function AssetListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationFromUrl = searchParams.get('location');

    const [allAssets, setAllAssets] = useState<AssetWithDetails[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState(locationFromUrl || '');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<AssetWithDetails | null>(null);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; confirmText?: string; } | null>(null);

    const fetchData = async () => {
        try {
            const [assetsRes, locationsRes] = await Promise.all([
                fetch('/api/assets'),
                fetch('/api/assets/locations')
            ]);
            if (!assetsRes.ok || !locationsRes.ok) throw new Error('Gagal memuat data dari server');
            
            const assetsData: ApiResponse = await assetsRes.json();
            const locationsData = await locationsRes.json();

            setAllAssets(assetsData.assets);
            setLocations(locationsData);
            
            // Re-apply filter after fetching new data
            const currentFilter = locationFromUrl || selectedLocation;
            if (currentFilter === '') {
                setFilteredAssets(assetsData.assets);
            } else {
                setFilteredAssets(assetsData.assets.filter(a => a.locationId.toString() === currentFilter));
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        setIsLoading(true);
        fetchData();
    }, []);

    useEffect(() => {
        const newUrl = selectedLocation ? `/dashboardAsset/list?location=${selectedLocation}` : '/dashboardAsset/list';
        router.replace(newUrl, { scroll: false });

        if (selectedLocation === '') {
            setFilteredAssets(allAssets);
        } else {
            setFilteredAssets(allAssets.filter(asset => asset.locationId === parseInt(selectedLocation)));
        }
    }, [selectedLocation, allAssets, router]);

    const handlePrintBarcode = (asset: AssetWithDetails) => {
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(asset.qrCodeValue)}`;
        const printContent = `
            <html><head><title>Print QR Code Aset</title><style>@page { size: 7cm 4cm; margin: 0; } body { margin: 0; padding: 0; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 4cm; overflow: hidden; } .print-container { width: 6.8cm; height: 3.8cm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0.1cm; box-sizing: border-box; } img { max-width: 2.5cm; max-height: 2.5cm; height: auto; margin-bottom: 0.2cm; } h3 { font-size: 12pt; margin: 0; line-height: 1.1; font-weight: bold; word-break: break-word; } p { font-size: 9pt; margin: 0; line-height: 1.1; word-break: break-word; } </style></head><body><div class="print-container"><img id="qrCodeImage" src="${qrCodeImageUrl}" alt="QR Code" onload="this.isLoaded=true;" /><h3>${asset.productName}</h3><p>Lokasi: ${asset.location.name}</p></div><script> const img = document.getElementById('qrCodeImage'); function doPrint() { window.print(); window.close(); } if (img && !img.isLoaded) { img.onload = doPrint; } else { doPrint(); } </script></body></html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
        }
    };

    const handleAddClick = () => { setAssetToEdit(null); setIsModalOpen(true); };
    const handleEditClick = (asset: AssetWithDetails) => { setAssetToEdit(asset); setIsModalOpen(true); };

    const handleDeleteClick = (asset: AssetWithDetails) => {
        setConfirmation({
            title: 'Konfirmasi Hapus',
            message: `Yakin ingin menghapus aset "${asset.productName}"? Semua data terkait (log, maintenance) akan ikut terhapus. Aksi ini tidak dapat dibatalkan.`,
            confirmText: "Ya, Hapus",
            onConfirm: async () => {
                try {
                    const response = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Gagal menghapus aset.");
                    }
                    fetchData();
                } catch (err: any) {
                    alert(`Error: ${err.message}`);
                }
            }
        });
    };

    const handleDeactivateClick = (asset: AssetWithDetails) => {
        setConfirmation({
            title: 'Konfirmasi Non-aktifkan',
            message: `Yakin ingin mengubah status "${asset.productName}" menjadi RUSAK?`,
            confirmText: "Ya, Non-aktifkan",
            onConfirm: async () => {
                try {
                    const response = await fetch(`/api/assets/${asset.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'RUSAK' }),
                    });
                    if (!response.ok) throw new Error('Gagal update status aset');
                    fetchData();
                } catch (error) {
                    alert('Gagal update status aset');
                }
            }
        });
    };

    if (isLoading) return <div className="text-center p-8 text-gray-500">Loading data aset...</div>;
    if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">Error: {error}</div>;

    return (
        <>
            <AssetForm 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onFormSubmit={fetchData}
                assetToEdit={assetToEdit}
            />
            {confirmation && (
                <ConfirmationDialog
                    isOpen={!!confirmation}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText={confirmation.confirmText}
                />
            )}
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-2xl font-bold text-gray-800 self-start md:self-center">Daftar Semua Aset</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="block w-full sm:w-56 rounded-md border-gray-300 shadow-sm h-10 focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Filter Berdasarkan Lokasi</option>
                            {locations.map(loc => ( <option key={loc.id} value={loc.id}>{loc.name}</option> ))}
                        </select>
                        <button onClick={handleAddClick} className="bg-[#01449D] text-white px-4 py-2 rounded-lg hover:bg-blue-800 whitespace-nowrap h-10 font-semibold">
                            + Tambah Aset Baru
                        </button>
                    </div>
                </div>

                {/* TAMPILAN TABEL UNTUK DESKTOP (MD KE ATAS) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">QR Code</th>
                                <th scope="col" className="px-6 py-3">Nama Produk</th>
                                <th scope="col" className="px-6 py-3">Harga Awal</th>
                                <th scope="col" className="px-6 py-3">Nilai Buku</th>
                                <th scope="col" className="px-6 py-3">Penyusutan/Bln</th>
                                <th scope="col" className="px-6 py-3">Lokasi</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">PIC</th>
                                <th scope="col" className="px-6 py-3 min-w-[280px]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssets.length > 0 ? (
                                filteredAssets.map(asset => {
                                    const { bookValue, monthlyDepreciation } = calculateDepreciation(asset);
                                    return (
                                        <tr key={asset.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4"><div className="p-1 border inline-block bg-white"><QRCodeSVG value={asset.qrCodeValue} size={64} /></div></td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{asset.productName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(asset.price)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrency(bookValue)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(monthlyDepreciation)}</td>
                                            <td className="px-6 py-4">{asset.location.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>
                                                        {asset.status.replace('_', ' ')}
                                                    </span>
                                                    {asset.notification?.type === 'warning' && <WarningIcon message={asset.notification.message} />}
                                                    {asset.notification?.type === 'error' && <ErrorIcon message={asset.notification.message} />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{asset.picName || <span className="text-gray-400 italic">--</span>}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-x-4">
                                                    {asset.status !== 'RUSAK' && asset.status !== 'KALIBRASI_EXPIRED' && (
                                                        <button onClick={() => handleDeactivateClick(asset)} className="text-orange-600 hover:text-orange-900 font-medium">🚫 Non-aktif</button>
                                                    )}
                                                    <button onClick={() => handlePrintBarcode(asset)} className="text-gray-600 hover:text-gray-900 font-medium">🖨️ Print</button>
                                                    <button onClick={() => handleEditClick(asset)} className="text-blue-600 hover:text-blue-900 font-medium">✏️ Edit</button>
                                                    <button onClick={() => handleDeleteClick(asset)} className="text-red-600 hover:text-red-900 font-medium">🗑️ Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-500">Tidak ada aset yang ditemukan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TAMPILAN KARTU UNTUK MOBILE (DI BAWAH MD) */}
                <div className="block md:hidden">
                    {filteredAssets.length > 0 ? (
                        <div className="space-y-4">
                            {filteredAssets.map(asset => {
                                const { bookValue, monthlyDepreciation } = calculateDepreciation(asset);
                                return (
                                    <div key={asset.id} className="bg-gray-50 p-4 rounded-lg shadow">
                                        <div className="flex justify-between items-start border-b pb-3 mb-3">
                                            <div className="flex-grow"><h4 className="font-bold text-gray-900">{asset.productName}</h4><p className="text-sm text-gray-500">{asset.location.name}</p></div>
                                            <div className="p-1 border inline-block bg-white ml-2"><QRCodeSVG value={asset.qrCodeValue} size={50} /></div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-600">Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>
                                                        {asset.status.replace('_', ' ')}
                                                    </span>
                                                    {asset.notification?.type === 'warning' && <WarningIcon message={asset.notification.message} />}
                                                    {asset.notification?.type === 'error' && <ErrorIcon message={asset.notification.message} />}
                                                </div>
                                            </div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">PIC</span> <span className="text-gray-800">{asset.picName || '--'}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Harga Awal</span> <span className="text-gray-800">{formatCurrency(asset.price)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Nilai Buku</span> <span className="text-gray-800 font-bold">{formatCurrency(bookValue)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Penyusutan/Bln</span> <span className="text-gray-800">{formatCurrency(monthlyDepreciation)}</span></div>
                                        </div>
                                        <div className="flex justify-end gap-x-4 mt-4 pt-3 border-t">
                                            {asset.status !== 'RUSAK' && asset.status !== 'KALIBRASI_EXPIRED' && (
                                                <button onClick={() => handleDeactivateClick(asset)} className="text-orange-600 hover:text-orange-900 font-medium">🚫 Non-aktif</button>
                                            )}
                                            <button onClick={() => handlePrintBarcode(asset)} className="text-gray-600 hover:text-gray-900 font-medium">🖨️ Print</button>
                                            <button onClick={() => handleEditClick(asset)} className="text-blue-600 hover:text-blue-900 font-medium">✏️ Edit</button>
                                            <button onClick={() => handleDeleteClick(asset)} className="text-red-600 hover:text-red-900 font-medium">🗑️ Hapus</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">Tidak ada aset yang ditemukan.</div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function AssetListPageWrapper() {
    return (
        <Suspense fallback={<div className="text-center p-8">Memuat halaman...</div>}>
            <AssetListContent />
        </Suspense>
    );
}

