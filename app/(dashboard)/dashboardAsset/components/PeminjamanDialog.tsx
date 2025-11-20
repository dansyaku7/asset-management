// File: app/(dashboard)/dashboardAsset/components/PeminjamanDialog.tsx
// Kode dengan tambahan dropdown cabang tujuan

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, AssetStatus, Branch } from '@prisma/client';

type AssetWithBranch = Asset & { branch: Branch };

type PeminjamanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  assets: AssetWithBranch[];
  branches: Branch[]; // Tambah prop untuk daftar semua cabang
};

export default function PeminjamanDialog({ isOpen, onClose, onFormSubmit, assets, branches }: PeminjamanDialogProps) {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedAssetBranch, setSelectedAssetBranch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableAssets = useMemo(() => {
    return assets.filter(asset => asset.status === AssetStatus.BAIK);
  }, [assets]);

  useEffect(() => {
    if (!isOpen) {
        setSelectedAssetId('');
        setSelectedAssetBranch('');
        setError(null);
    }
  }, [isOpen]);

  const handleAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const assetId = event.target.value;
    setSelectedAssetId(assetId);
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
        setSelectedAssetBranch(asset.branch.name);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem('authToken');
    if (!token) {
        setError("Otentikasi gagal. Silakan login kembali.");
        setIsSubmitting(false);
        return;
    }
    
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/v1/assets/borrow', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal meminjam aset');
      }

      onFormSubmit();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-6">Form Peminjaman Aset</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label htmlFor="assetId" className="block text-sm font-medium text-gray-700">Aset yang Dipinjam</label>
            <select id="assetId" name="assetId" required value={selectedAssetId} onChange={handleAssetChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="" disabled>Pilih Aset yang Tersedia (Status BAIK)</option>
              {availableAssets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.productName} ({asset.barcode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Dari Cabang (Asal)</label>
                <input type="text" value={selectedAssetBranch || 'Pilih aset terlebih dahulu'} readOnly className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm" />
            </div>
            <div>
                <label htmlFor="destinationBranchId" className="block text-sm font-medium text-gray-700">Untuk Cabang (Tujuan)</label>
                <select id="destinationBranchId" name="destinationBranchId" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="" disabled>Pilih cabang tujuan...</option>
                    {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                </select>
            </div>
          </div>
          
          <div>
              <label htmlFor="giverName" className="block text-sm font-medium text-gray-700">Diserahkan oleh (PIC)</label>
              <input 
                  type="text" 
                  id="giverName"
                  name="giverName"
                  required
                  placeholder="Nama staf yang menyerahkan"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <hr/>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="picName" className="block text-sm font-medium text-gray-700">Nama Peminjam</label>
                <input type="text" id="picName" name="picName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="picContact" className="block text-sm font-medium text-gray-700">Kontak Peminjam</label>
                <input type="text" id="picContact" name="picContact" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Alasan Meminjam</label>
            <textarea id="reason" name="reason" rows={3} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
          </div>

          <div>
            <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700">Tanggal Pengembalian (Estimasi)</label>
            <input type="date" id="returnDate" name="returnDate" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Batal</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                {isSubmitting ? 'Memproses...' : 'Pinjam Aset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}