// File: app/(dashboard)/dashboardAsset/master-data/components/AddBranchDialog.tsx

"use client";
import React, { useState, useEffect } from 'react';
import { Branch } from '@prisma/client';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchToEdit: Branch | null;
};

export function AddBranchDialog({ isOpen, onClose, onSuccess, branchToEdit }: DialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchToEdit) {
      setName(branchToEdit.name);
      setAddress(branchToEdit.address || '');
      setPhone(branchToEdit.phone || '');
    } else {
      setName('');
      setAddress('');
      setPhone('');
    }
  }, [branchToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const url = branchToEdit ? `/api/v1/management/branches/${branchToEdit.id}` : '/api/v1/management/branches';
    const method = branchToEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menyimpan data.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{branchToEdit ? 'Edit' : 'Tambah'} Cabang Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Cabang</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Alamat</label>
            <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
          </div>
           <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">No. Telepon</label>
            <input id="phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Batal</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
