"use client";
import type { Location } from "@prisma/client";
// Mengambil tipe data dari halaman induknya
import { type LocationWithFinancials } from "../page"; 
import { formatRupiah } from "@/lib/utils";

interface LocationTableProps {
  locations: LocationWithFinancials[];
  isLoading: boolean;
  onViewAssets: (id: number) => void;
  onDeleteLocation: (location: LocationWithFinancials) => void; 
  onEditLocation: (location: Location) => void;
}

export default function LocationTable({
  locations,
  isLoading,
  onViewAssets,
  onDeleteLocation,
  onEditLocation,
}: LocationTableProps) {
  if (isLoading) {
    return (
      <div className="text-center p-6 text-gray-500">Memuat data lokasi...</div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        Belum ada data lokasi. Silakan tambahkan lokasi baru.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1024px] text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-3">Nama Cabang</th>
            <th className="px-6 py-3 text-center">Total Aset</th>
            <th className="px-6 py-3">Nilai Awal</th>
            <th className="px-6 py-3">Penyusutan</th>
            <th className="px-6 py-3">Nilai Buku</th>
            <th className="px-6 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr
              key={location.id}
              className="bg-white border-b hover:bg-gray-50"
            >
              <td className="px-6 py-4 font-medium text-gray-900">
                <div>{location.name}</div>
                <div className="text-xs text-gray-500">
                  {location.address || ""}
                </div>
              </td>
              <td className="px-6 py-4 text-center font-bold text-lg text-gray-700">
                {/* --- PERBAIKAN: Kembali menggunakan 'assetCount' atau fallback ke 0 --- */}
                {location.assetCount || 0}
              </td>
              <td className="px-6 py-4 text-gray-600">
                {formatRupiah(location.totalInitialValue)}
              </td>
              <td className="px-6 py-4 text-red-600">
                ({formatRupiah(location.totalDepreciation)})
              </td>
              <td className="px-6 py-4 font-semibold text-gray-800">
                {formatRupiah(location.totalCurrentValue)}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => onViewAssets(location.id)}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Lihat Aset
                </button>
                <button
                  onClick={() => onEditLocation(location)}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDeleteLocation(location)}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  🗑️ Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

