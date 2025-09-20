// File: app/api/assets/return/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json({ message: "Asset ID wajib diisi" }, { status: 400 });
    }

    // Gunakan transaksi untuk memastikan semua operasi berhasil
    const returnedAsset = await prisma.$transaction(async (tx) => {
      // 1. Cek dulu apakah aset memang sedang dipinjam
      const assetToReturn = await tx.asset.findUnique({
        where: { id: assetId },
      });

      if (!assetToReturn) {
        throw new Error("Aset tidak ditemukan.");
      }
      if (assetToReturn.status !== AssetStatus.DIPINJAM) {
        throw new Error("Aset ini tidak sedang dalam status dipinjam.");
      }

      // 2. Update status aset menjadi BAIK
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.BAIK,
          // Kosongkan nama peminjam saat dikembalikan
          picName: null, 
          picContact: null,
        },
      });

      // 3. Buat log pengembalian
      await tx.assetLog.create({
        data: {
          assetId: updatedAsset.id,
          activity: "Pengembalian",
          description: `Aset "${updatedAsset.productName}" telah dikembalikan dan status kembali menjadi Baik.`,
        },
      });

      return updatedAsset;
    });

    return NextResponse.json(returnedAsset, { status: 200 });

  } catch (error: any) {
    console.error("Gagal memproses pengembalian:", error);
    return NextResponse.json({ message: error.message || "Terjadi kesalahan pada server" }, { status: 500 });
  }
}