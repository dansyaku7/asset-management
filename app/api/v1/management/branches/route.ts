// File: app/api/v1/management/branches/route.ts
// API ini menggantikan /api/assets/locations

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [branches, allAssets] = await Promise.all([
      prisma.branch.findMany({ orderBy: { name: 'asc' } }),
      prisma.asset.findMany() // Kita tetap butuh data aset untuk kalkulasi
    ]);

    const branchesWithFinancials = branches.map(branch => {
      const assetsInBranch = allAssets.filter(asset => asset.branchId === branch.id);
      
      let totalInitialValue = 0;
      let totalCurrentValue = 0;
      let totalDepreciation = 0;

      assetsInBranch.forEach(asset => {
        const price = asset.price.toNumber();
        const salvageValue = asset.salvageValue.toNumber();
        // Di skema baru, usefulLife dalam bulan
        const usefulLifeInYears = asset.usefulLife > 0 ? asset.usefulLife / 12 : 0;
        
        if (usefulLifeInYears > 0) {
            const annualDepreciation = (price - salvageValue) / usefulLifeInYears;
            const ageInYears = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            
            let accumulatedDepreciation = annualDepreciation * ageInYears;
            if (accumulatedDepreciation > (price - salvageValue)) {
                accumulatedDepreciation = price - salvageValue;
            }
            if (accumulatedDepreciation < 0) accumulatedDepreciation = 0;
            
            const currentValue = price - accumulatedDepreciation;

            totalInitialValue += price;
            totalCurrentValue += currentValue;
            totalDepreciation += accumulatedDepreciation;
        } else {
            // Jika umur manfaat 0, tidak ada penyusutan
            totalInitialValue += price;
            totalCurrentValue += price;
        }
      });

      return {
        ...branch,
        assetCount: assetsInBranch.length,
        totalInitialValue,
        totalCurrentValue,
        totalDepreciation,
      };
    });

    return NextResponse.json(branchesWithFinancials);

  } catch (error) {
    console.error("Gagal mengambil data cabang:", error);
    return NextResponse.json({ message: "Gagal mengambil data cabang" }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
      const { name, address, phone } = await req.json();
      if (!name) {
        return NextResponse.json({ message: "Nama cabang wajib diisi" }, { status: 400 });
      }
      const newBranch = await prisma.branch.create({
        data: { name, address, phone },
      });
      return NextResponse.json(newBranch, { status: 201 });
    } catch (error) {
      console.error("Gagal membuat cabang:", error);
      return NextResponse.json({ message: "Gagal membuat cabang" }, { status: 500 });
    }
}