"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// --- Path yang benar ---
import LocationTable from "./components/LocationTable";
import { AddLocationDialog } from "./components/AddLocationDialog";
import ConfirmationDialog from "../components/ConfirmationDialog"; 
import type { Location } from "@prisma/client";

export type LocationWithFinancials = Location & {
  _count: { assets: number };
  totalInitialValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
};

export default function MasterDataPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationWithFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

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

  const handleEditLocation = (location: Location) => {
    setLocationToEdit(location);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setLocationToEdit(null);
  };

  const handleDeleteLocation = (location: LocationWithFinancials) => {
    setConfirmation({
      title: "Konfirmasi Hapus Lokasi",
      message: `Yakin ingin menghapus lokasi "${location.name}"? Aksi ini hanya bisa dilakukan jika tidak ada aset yang terdaftar di lokasi ini.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/assets/locations/${location.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Gagal menghapus lokasi.");
          }
          fetchLocations();
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      },
    });
  };

  return (
    <div className="space-y-8">
      <AddLocationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={fetchLocations}
        locationToEdit={locationToEdit}
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

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">
            Master Lokasi Aset (Cabang)
          </h3>
          <button onClick={() => { setLocationToEdit(null); setIsDialogOpen(true); }} className="bg-[#01449D] text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-semibold">
            + Tambah Lokasi Baru
          </button>
        </div>

        <LocationTable
          locations={locations}
          isLoading={isLoading}
          onViewAssets={handleViewAssets}
          onEditLocation={handleEditLocation}
          onDeleteLocation={handleDeleteLocation}
        />
      </div>
    </div>
  );
}