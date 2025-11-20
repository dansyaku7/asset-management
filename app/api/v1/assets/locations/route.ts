// app/api/assets/locations/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- FUNGSI GET DIPERBARUI DENGAN KALKULASI FINANSIAL LENGKAP ---
export async function GET() {
  try {
    // 1. Ambil semua data mentah yang dibutuhkan: semua lokasi dan semua aset
    const [locations, allAssets] = await Promise.all([
      prisma.location.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.findMany()
    ]);

    // 2. Proses setiap lokasi untuk menghitung ringkasan finansialnya
    const locationsWithFinancials = locations.map(location => {
      // Saring aset yang hanya milik lokasi ini
      const assetsInLocation = allAssets.filter(asset => asset.locationId === location.id);
      
      let totalInitialValue = 0;
      let totalCurrentValue = 0;
      let totalDepreciation = 0;

      // Lakukan kalkulasi penyusutan untuk setiap aset di lokasi ini
      assetsInLocation.forEach(asset => {
        const price = asset.price.toNumber();
        const salvageValue = asset.salvageValue.toNumber();
        const usefulLife = asset.usefulLife;
        
        const annualDepreciation = usefulLife > 0 ? (price - salvageValue) / usefulLife : 0;
        const ageInYears = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        let accumulatedDepreciation = annualDepreciation * ageInYears;
        
        if (accumulatedDepreciation > (price - salvageValue)) {
            accumulatedDepreciation = price - salvageValue;
        }
        if (accumulatedDepreciation < 0) accumulatedDepreciation = 0;
        
        const currentValue = price - accumulatedDepreciation;

        // Jumlahkan hasilnya
        totalInitialValue += price;
        totalCurrentValue += currentValue;
        totalDepreciation += accumulatedDepreciation;
      });

      // Gabungkan data lokasi dengan hasil kalkulasi
      return {
        ...location,
        assetCount: assetsInLocation.length,
        totalInitialValue,
        totalCurrentValue,
        totalDepreciation,
      };
    });

    return NextResponse.json(locationsWithFinancials);

  } catch (error) {
    console.error("Gagal mengambil data lokasi:", error);
    return NextResponse.json({ message: "Gagal mengambil data lokasi" }, { status: 500 });
  }
}

// Fungsi POST (tidak berubah)
export async function POST(req: Request) {
  try {
    const { name, address } = await req.json();
    if (!name) {
      return NextResponse.json({ message: "Nama lokasi wajib diisi" }, { status: 400 });
    }
    const newLocation = await prisma.location.create({
      data: { name, address },
    });
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal membuat lokasi" }, { status: 500 });
  }
}