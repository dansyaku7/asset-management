import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Ambil data baru dari body
    const { assetId, picName, picContact, reason, returnDate, giverName, locationName } = body;

    if (!assetId || !picName || !reason || !returnDate || !giverName) {
      return NextResponse.json({ message: "Semua field wajib diisi" }, { status: 400 });
    }

    const borrowedAsset = await prisma.$transaction(async (tx) => {
      const assetToBorrow = await tx.asset.findUnique({
        where: { id: assetId },
      });

      if (!assetToBorrow) {
        throw new Error("Aset tidak ditemukan.");
      }
      if (assetToBorrow.status !== AssetStatus.BAIK) {
        throw new Error(`Aset tidak dapat dipinjam karena statusnya saat ini: ${assetToBorrow.status}`);
      }

      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.DIPINJAM,
          picName: picName,
          picContact: picContact,
        },
      });

      // --- PERBARUI DESKRIPSI LOG DI SINI ---
      const formattedReturnDate = new Date(returnDate).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      
      const description = `Dipinjam oleh ${picName} dari ${locationName}. Diserahkan oleh ${giverName}. Alasan: ${reason}. Estimasi kembali: ${formattedReturnDate}.`;

      await tx.assetLog.create({
        data: {
          assetId: updatedAsset.id,
          activity: "Peminjaman",
          description: description,
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
