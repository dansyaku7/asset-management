// File: app/(dashboard)/dashboardAsset/master-data/components/BranchTable.tsx

"use client";
import React from 'react';
import type { Branch } from '@prisma/client';
import type { BranchWithFinancials } from '../page';

type TableProps = {
  branches: BranchWithFinancials[];
  isLoading: boolean;
  onViewAssets: (branchId: number) => void;
  onEditBranch: (branch: Branch) => void;
  onDeleteBranch: (branch: BranchWithFinancials) => void;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export default function BranchTable({ branches, isLoading, onViewAssets, onEditBranch, onDeleteBranch }: TableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Memuat data...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">Nama Cabang</th>
            <th scope="col" className="px-6 py-3">Jumlah Aset</th>
            <th scope="col" className="px-6 py-3">Nilai Buku Aset</th>
            <th scope="col" className="px-6 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {branches.length > 0 ? (
            branches.map(branch => (
              <tr key={branch.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                <td className="px-6 py-4">{branch.assetCount} Aset</td>
                <td className="px-6 py-4 font-semibold">{formatCurrency(branch.totalCurrentValue)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-x-4">
                    <button onClick={() => onViewAssets(branch.id)} className="text-green-600 hover:text-green-800 font-medium">Lihat Aset</button>
                    <button onClick={() => onEditBranch(branch)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button 
                      onClick={() => onDeleteBranch(branch)} 
                      disabled={branch.assetCount > 0}
                      className="text-red-600 hover:text-red-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={branch.assetCount > 0 ? "Hapus semua aset di cabang ini terlebih dahulu" : "Hapus cabang"}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={4} className="text-center py-10 text-gray-500">Belum ada cabang yang ditambahkan.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
