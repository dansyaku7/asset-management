// app/dashboardAsset/list/page.tsx

"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Asset, Location } from '@prisma/client';
import AssetForm from '../components/AssetForm';
import { QRCodeSVG } from 'qrcode.react';

// Tipe data ini penting untuk mendefinisikan struktur data yang diterima dari API
type AssetWithDetails = Omit<Asset, 'price' | 'salvageValue'> & { 
  location: Location; 
  qrCodeValue: string;
  price: number;
  salvageValue: number;
};
type ApiResponse = { 
    summary: any;
    assets: AssetWithDetails[];
};

// Fungsi untuk styling status
const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
        case 'BAIK': return 'bg-green-100 text-green-800';
        case 'RUSAK': return 'bg-red-100 text-red-800';
        case 'PERBAIKAN': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

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

// Komponen utama dipisahkan untuk menggunakan useSearchParams
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
            
            const initialLocation = locationFromUrl || selectedLocation;
            if (initialLocation === '') {
                setFilteredAssets(assetsData.assets);
            } else {
                setFilteredAssets(assetsData.assets.filter(a => a.locationId.toString() === initialLocation));
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
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
            <html><head><title>Print QR Code Aset</title><style>@page { size: 7cm 4cm; margin: 0; } body { margin: 0; padding: 0; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 4cm; overflow: hidden; } .print-container { width: 6.8cm; height: 3.8cm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0.1cm; box-sizing: border-box; } img { max-width: 2.5cm; max-height: 2.5cm; height: auto; margin-bottom: 0.2cm; } h3 { font-size: 0.3em; margin: 0; line-height: 1.1; font-weight: bold; word-break: break-word; } p { font-size: 0.2em; margin: 0; line-height: 1.1; word-break: break-word; } </style></head><body><div class="print-container"><img id="qrCodeImage" src="${qrCodeImageUrl}" alt="QR Code" onload="this.isLoaded=true;" /><h3>${asset.productName}</h3><p>Lokasi: ${asset.location.name}</p></div><script> const img = document.getElementById('qrCodeImage'); if (img && !img.isLoaded) { img.onload = () => { window.print(); window.close(); }; } else { window.print(); window.close(); } </script></body></html>
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
    const handleDeleteClick = async (assetId: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak bisa dibatalkan.")) {
            try {
                const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Gagal menghapus aset.");
                }
                fetchData();
            } catch (err: any) {
                alert(`Error: ${err.message}`);
            }
        }
    };

    // --- 1. FUNGSI BARU UNTUK NON-AKTIFKAN ASET ---
    const handleDeactivateClick = async (asset: AssetWithDetails) => {
        if (window.confirm(`Yakin ingin mengubah status "${asset.productName}" menjadi RUSAK?`)) {
            try {
                const response = await fetch(`/api/assets/${asset.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'RUSAK' }),
                });
                if (!response.ok) throw new Error('Gagal update status aset');
                fetchData(); // Refresh data di tabel
            } catch (error) {
                alert('Gagal update status aset');
            }
        }
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
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>{asset.status}</span></td>
                                            <td className="px-6 py-4">{asset.picName || <span className="text-gray-400 italic">--</span>}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-x-4">
                                                    {/* --- 2. TOMBOL BARU DI TAMPILAN DESKTOP --- */}
                                                    {asset.status !== 'RUSAK' && (
                                                        <button onClick={() => handleDeactivateClick(asset)} className="text-orange-600 hover:text-orange-900 font-medium">🚫 Non-aktif</button>
                                                    )}
                                                    <button onClick={() => handlePrintBarcode(asset)} className="text-gray-600 hover:text-gray-900 font-medium">🖨️ Print</button>
                                                    <button onClick={() => handleEditClick(asset)} className="text-blue-600 hover:text-blue-900 font-medium">✏️ Edit</button>
                                                    <button onClick={() => handleDeleteClick(asset.id)} className="text-red-600 hover:text-red-900 font-medium">🗑️ Hapus</button>
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
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Status</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>{asset.status}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">PIC</span> <span className="text-gray-800">{asset.picName || '--'}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Harga Awal</span> <span className="text-gray-800">{formatCurrency(asset.price)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Nilai Buku</span> <span className="text-gray-800 font-bold">{formatCurrency(bookValue)}</span></div>
                                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Penyusutan/Bln</span> <span className="text-gray-800">{formatCurrency(monthlyDepreciation)}</span></div>
                                        </div>
                                        <div className="flex justify-end gap-x-4 mt-4 pt-3 border-t">
                                            {/* --- 3. TOMBOL BARU DI TAMPILAN MOBILE --- */}
                                            {asset.status !== 'RUSAK' && (
                                                <button onClick={() => handleDeactivateClick(asset)} className="text-orange-600 hover:text-orange-900 font-medium">🚫 Non-aktif</button>
                                            )}
                                            <button onClick={() => handlePrintBarcode(asset)} className="text-gray-600 hover:text-gray-900 font-medium">🖨️ Print</button>
                                            <button onClick={() => handleEditClick(asset)} className="text-blue-600 hover:text-blue-900 font-medium">✏️ Edit</button>
                                            <button onClick={() => handleDeleteClick(asset.id)} className="text-red-600 hover:text-red-900 font-medium">🗑️ Hapus</button>
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