// app/dashboardAsset/components/MaintenanceDialog.tsx

"use client";
import React from 'react';
// --- PERBAIKAN DI SINI ---
// 'import type' diubah menjadi 'import' agar enum MaintenanceStatus bisa digunakan
import { Asset, Maintenance, MaintenanceStatus } from '@prisma/client';

type MaintenanceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  maintenanceToEdit: Maintenance | null;
  assets: Asset[];
};

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

export default function MaintenanceDialog({ isOpen, onClose, onFormSubmit, maintenanceToEdit, assets }: MaintenanceDialogProps) {
  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const url = maintenanceToEdit ? `/api/assets/maintenance/${maintenanceToEdit.id}` : '/api/assets/maintenance';
    const method = maintenanceToEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Gagal menyimpan data');
      onFormSubmit();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan data');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">{maintenanceToEdit ? 'Edit' : 'Tambah'} Jadwal Maintenance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="assetId" className="block text-sm font-medium text-gray-700">Aset</label>
            <select
              id="assetId"
              name="assetId"
              required
              defaultValue={maintenanceToEdit?.assetId || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="" disabled>Pilih Aset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.productName}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi Masalah</label>
            <textarea
              id="description"
              name="description"
              required
              defaultValue={maintenanceToEdit?.description || ''}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            ></textarea>
          </div>

          {maintenanceToEdit && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                name="status"
                defaultValue={maintenanceToEdit?.status || 'SCHEDULED'}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                {(Object.keys(MaintenanceStatus) as Array<keyof typeof MaintenanceStatus>).map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">Tgl. Dijadwalkan</label>
              <input type="date" id="scheduledDate" name="scheduledDate" defaultValue={formatDateForInput(maintenanceToEdit?.scheduledDate)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            {maintenanceToEdit && (
                <div>
                  <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700">Tgl. Sselesai</label>
                  <input type="date" id="completionDate" name="completionDate" defaultValue={formatDateForInput(maintenanceToEdit?.completionDate)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
            )}
             <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Biaya (Rp)</label>
                <input type="number" id="cost" name="cost" defaultValue={maintenanceToEdit?.cost || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan</label>
            <textarea id="notes" name="notes" defaultValue={maintenanceToEdit?.notes || ''} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Batal</button>
            <button type="submit" className="px-4 py-2 bg-[#01449D] text-white rounded-lg">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}