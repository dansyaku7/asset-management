// File: app/(dashboard)/dashboardAsset/list/page.tsx
// VERSI REFACTOR: Dibuat lebih rapi (Mobile Cards + Desktop Action Buttons)

"use client";
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Asset, Branch, AssetStatus } from '@prisma/client';
import AssetForm from '../components/AssetForm';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { QRCodeSVG } from 'qrcode.react';

// --- Type, Icon, dan Helper (Tidak ada perubahan) ---
type AssetWithDetails = Omit<Asset, 'price' | 'salvageValue'> & { 
  branch: Branch; 
  qrCodeValue: string;
  price: number;
  salvageValue: number;
  accessories?: string | null;
  position?: string | null;
  notification: { type: 'warning' | 'error', message: string } | null;
};
type ApiResponse = { 
    summary: any;
    assets: AssetWithDetails[];
};

const WarningIcon = ({ message }: { message: string }) => ( <div className="relative group"> <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"> <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" /> </svg> <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs text-center rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"> {message} <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg> </div> </div> );
const ErrorIcon = ({ message }: { message: string }) => ( <div className="relative group"> <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"> <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /> </svg> <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs text-center rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"> {message} <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg> </div> </div> );
const getStatusClass = (status: AssetStatus | string) => { switch (status) { case 'BAIK': return 'bg-green-100 text-green-800'; case 'RUSAK': return 'bg-red-100 text-red-800'; case 'PERBAIKAN': return 'bg-yellow-100 text-yellow-800'; case 'DIPINJAM': return 'bg-purple-100 text-purple-800'; case 'KALIBRASI_EXPIRED': return 'bg-red-200 text-red-900 font-bold'; default: return 'bg-gray-100 text-gray-800'; } };
const formatCurrency = (value: number): string => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
const calculateDepreciation = (asset: AssetWithDetails) => {
    const price = asset.price;
    const salvage = asset.salvageValue;
    const lifeInMonths = asset.usefulLife;
    if (lifeInMonths <= 0) return { monthlyDepreciation: 0, bookValue: price };
    const monthlyDepreciation = (price - salvage) / lifeInMonths;
    const ageInMonths = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * (365.25 / 12));
    let accumulatedDepreciation = monthlyDepreciation * ageInMonths;
    if (accumulatedDepreciation > (price - salvage)) accumulatedDepreciation = price - salvage;
    const bookValue = price - accumulatedDepreciation;
    return { monthlyDepreciation: bookValue > salvage ? monthlyDepreciation : 0, bookValue: bookValue < salvage ? salvage : bookValue };
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


function AssetListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchFromUrl = searchParams.get('branch');

  // --- State, Fetching, Logic (Tidak ada perubahan) ---
  const [allAssets, setAllAssets] = useState<AssetWithDetails[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branchFromUrl || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<AssetWithDetails | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; confirmText?: string; } | null>(null);

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
          const [assetsRes, branchesRes] = await Promise.all([
              fetch('/api/v1/assets'),
              fetch('/api/v1/management/branches')
          ]);

          if (!assetsRes.ok || !branchesRes.ok) {
              throw new Error('Gagal memuat data dari server.');
          }
          const assetsData = await assetsRes.json();
          const branchesData = await branchesRes.json();

          setAllAssets(assetsData.assets);
          setBranches(branchesData);

      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      fetchData();
  }, [fetchData]);

  useEffect(() => {
      const newUrl = selectedBranch ? `/dashboardAsset/list?branch=${selectedBranch}` : '/dashboardAsset/list';
      router.replace(newUrl, { scroll: false });

      if (selectedBranch === '') {
          setFilteredAssets(allAssets);
      } else {
          setFilteredAssets(allAssets.filter(asset => asset.branchId === parseInt(selectedBranch)));
      }
  }, [selectedBranch, allAssets, router]);

  const createApiCall = async (url: string, method: 'DELETE' | 'PUT', body?: object) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
          throw new Error("Anda harus login terlebih dahulu.");
      }
      
      const response = await fetch(url, {
          method,
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal melakukan aksi.');
      }
      return response.json();
  };

  const handlePrintBarcode = (asset: AssetWithDetails) => {
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(asset.qrCodeValue)}`;
      const positionLine = asset.position ? `<p>${asset.position}</p>` : '';
      const printContent = `
          <html><head><title>Print QR Code</title>
          <style>@page{size:7cm 4cm;margin:0}body{margin:0;padding:0;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:4cm;overflow:hidden}.print-container{width:6.8cm;height:3.8cm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0.1cm;box-sizing:border-box}img{max-width:2.5cm;max-height:2.5cm;height:auto;margin-bottom:0.02cm}h3{font-size:9pt;margin:0;line-height:1.1;font-weight:bold;word-break:break-word}p{font-size:6pt;margin:0.01cm 0;line-height:1.1;word-break:break-word}</style>
          </head><body>
          <div class="print-container">
              <img id="qrCodeImage" src="${qrCodeImageUrl}" alt="QR Code" onload="this.isLoaded=true;" />
              <h3>${asset.productName}</h3>
              <p>${asset.branch.name}</p>
              ${positionLine}
          </div>
          <script>const img=document.getElementById('qrCodeImage');function doPrint(){window.print();window.close()}if(img&&!img.isLoaded){img.onload=doPrint}else{doPrint()}</script>
          </body></html>`;
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
          message: `Yakin ingin menghapus aset "${asset.productName}"? Semua data terkait (log, maintenance) akan ikut terhapus.`,
          confirmText: "Ya, Hapus",
          onConfirm: async () => {
              try {
                  await createApiCall(`/api/v1/assets/${asset.id}`, 'DELETE');
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
                  await createApiCall(`/api/v1/assets/${asset.id}`, 'PUT', { status: 'RUSAK' });
                  fetchData();
              } catch (error: any) {
                  alert(`Gagal update status aset: ${error.message}`);
              }
          }
      });
  };
  // --- End of Logic ---


  if (isLoading) return <div className="text-center p-8 text-gray-500">Loading data aset...</div>;
  if (error) return <div className="bg-red-100 p-4 rounded-md">{error}</div>;

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
          
          {/* --- PERUBAHAN: Header Konten --- */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
              {/* Flex-col di HP, md:flex-row di desktop */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="text-2xl font-bold text-gray-900">Daftar Semua Aset</h3>
                  {/* Flex-col di HP, sm:flex-row di tablet */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                      <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          // Tambah form-select biar konsisten
                          className="form-select block w-full sm:w-56 rounded-lg border-gray-300 shadow-sm h-10"
                      >
                          <option value="">Filter Berdasarkan Cabang</option>
                          {branches.map(branch => ( <option key={branch.id} value={branch.id}>{branch.name}</option> ))}
                      </select>
                      {/* Tambah icon di tombol */}
                      <button onClick={handleAddClick} className="flex items-center justify-center gap-2 bg-[#01449D] text-white px-4 py-2 rounded-lg hover:bg-blue-800 h-10 font-semibold w-full sm:w-auto">
                          <i className="fas fa-plus fa-fw"></i>
                          <span>Tambah Aset</span>
                      </button>
                  </div>
              </div>

              {/* --- PERUBAHAN: Tabel Desktop --- */}
              {/* Dibuat lebih rapi, padding di-adjust */}
              <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                          <tr>
                              <th scope="col" className="px-4 py-3">QR</th>
                              <th scope="col" className="px-4 py-3">Nama Produk</th>
                              <th scope="col" className="px-4 py-3">Harga Awal & Penyusutan/Bln</th>
                              <th scope="col" className="px-4 py-3">Nilai Buku</th>
                              <th scope="col" className="px-4 py-3">Cabang</th>
                              <th scope="col" className="px-4 py-3">Posisi</th>
                              <th scope="col" className="px-4 py-3">Status</th>
                              <th scope="col" className="px-4 py-3">PIC</th>
                              <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredAssets.length > 0 ? (
                              filteredAssets.map(asset => {
                                  const { bookValue, monthlyDepreciation } = calculateDepreciation(asset);
                                  return (
                                      <tr key={asset.id} className="bg-white border-b hover:bg-gray-50">
                                          <td className="px-4 py-3"><div className="p-1 border inline-block bg-white"><QRCodeSVG value={asset.qrCodeValue} size={64} /></div></td>
                                          <td className="px-4 py-3 font-medium text-gray-900">{asset.productName}</td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                              <div><span className="text-xs text-gray-500">Harga Awal:</span><p>{formatCurrency(asset.price)}</p></div>
                                              <div className="mt-1"><span className="text-xs text-gray-500">Penyusutan/Bln:</span><p>{formatCurrency(monthlyDepreciation)}</p></div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900">{formatCurrency(bookValue)}</td>
                                          <td className="px-4 py-3">{asset.branch.name}</td>
                                          <td className="px-4 py-3">{asset.position || '--'}</td>
                                          <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>{asset.status.replace('_', ' ')}</span>
                                                  {asset.notification?.type === 'warning' && <WarningIcon message={asset.notification.message} />}
                                                  {asset.notification?.type === 'error' && <ErrorIcon message={asset.notification.message} />}
                                              </div>
                                          </td>
                                          <td className="px-4 py-3">{asset.picName || <span className="text-gray-400 italic">--</span>}</td>
                                          
                                          {/* --- PERUBAHAN: Tombol Aksi Desktop --- */}
                                          {/* Emoji diganti icon + tooltip */}
                                          <td className="px-4 py-3">
                                              <div className="flex items-center justify-center gap-x-1">
                                                  {asset.status !== 'RUSAK' && asset.status !== 'KALIBRASI_EXPIRED' && (
                                                      <TooltipIconButton 
                                                          onClick={() => handleDeactivateClick(asset)} 
                                                          icon="fas fa-ban" 
                                                          tooltip="Non-aktifkan" 
                                                          colorClass="text-orange-500 hover:text-orange-700"
                                                      />
                                                  )}
                                                  <TooltipIconButton 
                                                      onClick={() => handlePrintBarcode(asset)} 
                                                      icon="fas fa-print" 
                                                      tooltip="Print Barcode" 
                                                      colorClass="text-gray-500 hover:text-gray-800"
                                                  />
                                                  <TooltipIconButton 
                                                      onClick={() => handleEditClick(asset)} 
                                                      icon="fas fa-pencil-alt" 
                                                      tooltip="Edit" 
                                                      colorClass="text-blue-600 hover:text-blue-900"
                                                  />
                                                  <TooltipIconButton 
                                                      onClick={() => handleDeleteClick(asset)} 
                                                      icon="fas fa-trash-alt" 
                                                      tooltip="Hapus" 
                                                      colorClass="text-red-600 hover:text-red-900"
                                                  />
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })
                          ) : (
                              <tr><td colSpan={10} className="text-center py-10 text-gray-500">Tidak ada aset yang ditemukan.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              
              {/* --- PERUBAHAN: Tampilan Card Mobile --- */}
              {/* Dibuat lebih rapi, pakai bg-white, border, dan pill buttons */}
              <div className="block md:hidden space-y-4">
                  {filteredAssets.length > 0 ? (
                      filteredAssets.map(asset => {
                          const { bookValue } = calculateDepreciation(asset);
                          return (
                              <div key={asset.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                  {/* Card Header */}
                                  <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                                      <div>
                                          <h4 className="font-bold text-gray-900">{asset.productName}</h4>
                                          <p className="text-sm text-gray-500">{asset.branch.name}</p>
                                      </div>
                                      <div className="p-1 border bg-white rounded-md flex-shrink-0">
                                          <QRCodeSVG value={asset.qrCodeValue} size={50} />
                                      </div>
                                  </div>
                                  
                                  {/* Card Body */}
                                  <div className="space-y-2 text-sm mb-4">
                                      <div className="flex justify-between items-center">
                                          <span className="font-semibold text-gray-600">Status</span>
                                          <div className="flex items-center gap-2">
                                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(asset.status)}`}>{asset.status.replace('_', ' ')}</span>
                                              {asset.notification?.type === 'warning' && <WarningIcon message={asset.notification.message} />}
                                              {asset.notification?.type === 'error' && <ErrorIcon message={asset.notification.message} />}
                                          </div>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="font-semibold text-gray-600">Nilai Buku</span> 
                                          <span className="text-gray-900 font-bold">{formatCurrency(bookValue)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="font-semibold text-gray-600">Posisi</span> 
                                          <span className="text-gray-700">{asset.position || '--'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="font-semibold text-gray-600">PIC</span> 
                                          <span className="text-gray-700">{asset.picName || '--'}</span>
                                      </div>
                                  </div>
                                  
                                  {/* Card Footer (Pill Buttons) */}
                                  <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                      {asset.status !== 'RUSAK' && (
                                          <button 
                                              onClick={() => handleDeactivateClick(asset)} 
                                              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold"
                                          >
                                              Non-aktif
                                          </button>
                                      )}
                                      <button 
                                          onClick={() => handleEditClick(asset)} 
                                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"
                                      >
                                          Edit
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteClick(asset)} 
                                          className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"
                                      >
                                          Hapus
                                      </button>
                                  </div>
                              </div>
                          );
                      })
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
      <Suspense fallback={<div className="text-center p-8 text-gray-500">Memuat halaman...</div>}>
          <AssetListContent />
      </Suspense>
  );
}