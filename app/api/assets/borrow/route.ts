// File: app/api/assets/borrow/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, picName, picContact, reason, returnDate } = body;

    if (!assetId || !picName || !reason || !returnDate) {
      return NextResponse.json({ message: "Semua field wajib diisi" }, { status: 400 });
    }

    // Gunakan transaksi untuk memastikan semua operasi berhasil
    const borrowedAsset = await prisma.$transaction(async (tx) => {
      // 1. Cek dulu apakah aset tersedia untuk dipinjam
      const assetToBorrow = await tx.asset.findUnique({
        where: { id: assetId },
      });

      if (!assetToBorrow) {
        throw new Error("Aset tidak ditemukan.");
      }
      if (assetToBorrow.status !== AssetStatus.BAIK) {
        throw new Error(`Aset tidak dapat dipinjam karena statusnya saat ini: ${assetToBorrow.status}`);
      }

      // 2. Update status aset menjadi DIPINJAM
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.DIPINJAM,
          picName: picName,
          picContact: picContact,
        },
      });

      // 3. Buat log peminjaman yang detail
      const formattedReturnDate = new Date(returnDate).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      
      await tx.assetLog.create({
        data: {
          assetId: updatedAsset.id,
          activity: "Peminjaman",
          description: `Dipinjam oleh ${picName}. Alasan: ${reason}. Estimasi kembali: ${formattedReturnDate}.`,
        },
      });

      return updatedAsset;
    });

    return NextResponse.json(borrowedAsset, { status: 200 });

  } catch (error: any) {
    console.error("Gagal memproses peminjaman:", error);
    return NextResponse.json({ message: error.message || "Terjadi kesalahan pada server" }, { status: 500 });
  }
}