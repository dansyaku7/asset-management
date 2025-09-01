"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationTable from "./components/LocationTable";
import { AddLocationDialog } from "./components/AddLocationDialog.tsx";
import { LocationWithFinancials } from "@/types";

export default function MasterDataPage() {
  const router = useRouter();

  const [locations, setLocations] = useState<LocationWithFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDeleteLocation = async (id: number) => {
    if (
      window.confirm(
        "Yakin ingin menghapus lokasi ini? Pastikan tidak ada aset yang terdaftar di dalamnya."
      )
    ) {
      try {
        const res = await fetch(`/api/assets/locations/${id}`, {
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
    }
  };

  return (
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
  );
}
