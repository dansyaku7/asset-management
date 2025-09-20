// File: app/dashboardAsset/components/PeminjamanDialog.tsx

"use client";
import React, { useMemo } from 'react';
import { Asset, AssetStatus } from '@prisma/client';

type PeminjamanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  assets: Asset[];
};

export default function PeminjamanDialog({ isOpen, onClose, onFormSubmit, assets }: PeminjamanDialogProps) {
  if (!isOpen) return null;

  // Filter aset yang hanya bisa dipinjam (statusnya BAIK)
  const availableAssets = useMemo(() => {
    return assets.filter(asset => asset.status === AssetStatus.BAIK);
  }, [assets]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      assetId: formData.get('assetId'),
      picName: formData.get('picName'),
      picContact: formData.get('picContact'),
      reason: formData.get('reason'),
      returnDate: formData.get('returnDate'),
    };

    try {
      const response = await fetch('/api/assets/borrow', { // Kita akan buat API route ini
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal meminjam aset');
      }
      onFormSubmit();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Form Peminjaman Aset</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label htmlFor="assetId" className="block text-sm font-medium text-gray-700">Aset yang Dipinjam</label>
            <select id="assetId" name="assetId" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="" disabled>Pilih Aset yang Tersedia</option>
              {availableAssets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.productName} ({asset.barcode})</option>
              ))}
            </select>
          </div>

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

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Batal</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Pinjam Aset</button>
          </div>
        </form>
      </div>
    </div>
  );
}