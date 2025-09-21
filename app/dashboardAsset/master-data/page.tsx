"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationTable from "./components/LocationTable";
import { AddLocationDialog } from "./components/AddLocationDialog.tsx";
import ConfirmationDialog from "../components/ConfirmationDialog"; // Import dialog konfirmasi
import { LocationWithFinancials } from "@/types";

export default function MasterDataPage() {
  const router = useRouter();

  const [locations, setLocations] = useState<LocationWithFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk mengontrol dialog konfirmasi
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets/locations");
      if (!res.ok) throw new Error("Gagal memuat data lokasi.");
      const data = await res.json();
      setLocations(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleViewAssets = (locationId: number) => {
    router.push(`/dashboardAsset/list?location=${locationId}`);
  };

  // Fungsi delete diubah untuk menggunakan dialog konfirmasi custom
  const handleDeleteLocation = (id: number) => {
    const locationToDelete = locations.find(loc => loc.id === id);
    if (!locationToDelete) return; // Jika lokasi tidak ditemukan, hentikan

    setConfirmation({
      title: "Konfirmasi Hapus Lokasi",
      message: `Yakin ingin menghapus lokasi "${locationToDelete.name}"? Aksi ini tidak dapat dibatalkan. Pastikan tidak ada aset yang terdaftar di lokasi ini.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/assets/locations/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Gagal menghapus lokasi.");
          }
          fetchLocations(); // Refresh data setelah berhasil
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      },
    });
  };

  return (
    <>
      {/* Render dialog konfirmasi jika state-nya aktif */}
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

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-800">
              Master Lokasi Aset (Cabang)
            </h3>
            <AddLocationDialog onSuccess={fetchLocations} />
          </div>

          <LocationTable
            locations={locations}
            isLoading={isLoading}
            onViewAssets={handleViewAssets}
            onDeleteLocation={handleDeleteLocation}
          />
        </div>
      </div>
    </>
  );
}
