"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// import BranchTable from "./components/BranchTable"; // DIHAPUS: Logika di-inline
import { AddBranchDialog } from "./components/AddBranchDialog";
import ConfirmationDialog from "../components/ConfirmationDialog"; 
import type { Branch } from "@prisma/client";

// Tipe data (Tidak ada perubahan)
export type BranchWithFinancials = Branch & {
  assetCount: number;
  totalInitialValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
};

// --- HELPER BARU: Format Mata Uang ---
const formatCurrency = (value: number): string => 
  new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(value);

// --- HELPER BARU: Tombol Aksi Desktop ---
const TooltipIconButton = ({ 
  onClick, 
  icon, 
  tooltip, 
  colorClass
}: { 
  onClick: () => void; 
  icon: string;
  tooltip: string;
  colorClass: string;
}) => (
  <button onClick={onClick} className={`group relative ${colorClass} p-2 rounded-md hover:bg-gray-100 transition-colors`}>
    <i className={`fa-fw ${icon}`}></i>
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
      {tooltip}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
    </span>
  </button>
);

export default function MasterDataPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchWithFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // --- TAMBAHAN: Error handling
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null); // --- TAMBAHAN: Reset error
    try {
      const res = await fetch("/api/v1/management/branches"); 
      if (!res.ok) throw new Error("Gagal memuat data cabang.");
      const data = await res.json();
      setBranches(data);
    } catch (err: any) {
      setError(err.message); // --- TAMBAHAN: Set error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // --- Logic Handler (Tidak ada perubahan) ---
  const handleViewAssets = (branchId: number) => {
    router.push(`/dashboardAsset/list?branch=${branchId}`);
  };

  const handleEditBranch = (branch: Branch) => {
    setBranchToEdit(branch);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setBranchToEdit(null);
  };

  const handleDeleteBranch = (branch: BranchWithFinancials) => {
    setConfirmation({
      title: "Konfirmasi Hapus Cabang",
      message: `Yakin ingin menghapus cabang "${branch.name}"? Aksi ini hanya bisa dilakukan jika tidak ada aset (${branch.assetCount} aset) yang terdaftar di cabang ini.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/management/branches/${branch.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Gagal menghapus cabang.");
          }
          fetchBranches();
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      },
    });
  };

  return (
    <div className="space-y-8">
      <AddBranchDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={fetchBranches}
        branchToEdit={branchToEdit}
      />

      {confirmation && (
        <ConfirmationDialog
          isOpen={!!confirmation}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmation.onConfirm}
          title={confirmation.title}
          message={confirmation.message}
          confirmText="Ya, Hapus"
        />
      )}

      {/* --- PERUBAHAN: Container Utama --- */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        {/* --- PERUBAHAN: Header & Tombol (Responsive) --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-2xl font-bold text-gray-900">
            Master Cabang
          </h3>
          <button 
            onClick={() => { setBranchToEdit(null); setIsDialogOpen(true); }} 
            className="flex items-center justify-center gap-2 bg-[#01449D] text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-semibold w-full sm:w-auto"
          >
            <i className="fas fa-plus fa-fw"></i>
            <span>Tambah Cabang Baru</span>
          </button>
        </div>

        {/* --- PERUBAHAN: Logika tabel & card di-inline di sini --- */}
        {isLoading ? (
          <p className="text-center text-gray-500 py-10">Memuat data cabang...</p>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-md text-red-700">{error}</div>
        ) : (
          <>
            {/* --- 1. Tampilan Tabel Desktop --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-6 py-3">Nama Cabang</th>
                    <th className="px-6 py-3">Jml Aset</th>
                    <th className="px-6 py-3">Total Nilai Awal</th>
                    <th className="px-6 py-3">Total Nilai Buku</th>
                    <th className="px-6 py-3">Total Penyusutan</th>
                    <th className="px-6 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length > 0 ? branches.map(branch => (
                    <tr key={branch.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                      <td className="px-6 py-4">{branch.assetCount} Aset</td>
                      <td className="px-6 py-4">{formatCurrency(branch.totalInitialValue)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(branch.totalCurrentValue)}</td>
                      <td className="px-6 py-4">{formatCurrency(branch.totalDepreciation)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-x-1">
                          <TooltipIconButton 
                            onClick={() => handleViewAssets(branch.id)} 
                            icon="fas fa-eye" 
                            tooltip="Lihat Aset" 
                            colorClass="text-green-600 hover:text-green-900" 
                          />
                          <TooltipIconButton 
                            onClick={() => handleEditBranch(branch)} 
                            icon="fas fa-pencil-alt" 
                            tooltip="Edit Cabang" 
                            colorClass="text-blue-600 hover:text-blue-900" 
                          />
                          <TooltipIconButton 
                            onClick={() => handleDeleteBranch(branch)} 
                            icon="fas fa-trash-alt" 
                            tooltip="Hapus Cabang" 
                            colorClass="text-red-600 hover:text-red-900" 
                          />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">Belum ada data cabang.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* --- 2. Tampilan Card Mobile --- */}
            <div className="block md:hidden space-y-4">
              {branches.length > 0 ? branches.map(branch => (
                <div key={branch.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <h4 className="font-bold text-gray-900">{branch.name}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{branch.assetCount} Aset</span>
                  </div>
                  {/* Card Body */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">Nilai Buku</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(branch.totalCurrentValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">Nilai Awal</span>
                      <span className="text-gray-700">{formatCurrency(branch.totalInitialValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">Penyusutan</span>
                      <span className="text-gray-700">{formatCurrency(branch.totalDepreciation)}</span>
                    </div>
                  </div>
                  {/* Card Footer (Actions) */}
                  <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onClick={() => handleViewAssets(branch.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Lihat Aset</button>
                    <button onClick={() => handleEditBranch(branch)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Edit</button>
                    <button onClick={() => handleDeleteBranch(branch)} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Hapus</button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-gray-500">Belum ada data cabang.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}