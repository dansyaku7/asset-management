// app/api/assets/[id]/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// --- FUNGSI UPDATE YANG LEBIH FLEKSIBEL ---
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    // --- PERUBAHAN UTAMA DI SINI ---
    // Kita buat objek kosong untuk menampung data yang akan diupdate
    const dataToUpdate: any = {};

    // Cek setiap field, jika ada di body, baru tambahkan ke dataToUpdate
    if (body.productName !== undefined) dataToUpdate.productName = body.productName;
    if (body.purchaseDate !== undefined) dataToUpdate.purchaseDate = new Date(body.purchaseDate);
    if (body.locationId !== undefined) dataToUpdate.locationId = parseInt(body.locationId, 10);
    if (body.assetType !== undefined) dataToUpdate.assetType = body.assetType;
    if (body.price !== undefined) dataToUpdate.price = new Decimal(body.price);
    if (body.usefulLife !== undefined) dataToUpdate.usefulLife = parseInt(body.usefulLife, 10);
    if (body.salvageValue !== undefined) dataToUpdate.salvageValue = new Decimal(body.salvageValue);
    if (body.picName !== undefined) dataToUpdate.picName = body.picName; // Menggunakan picName sesuai skema
    if (body.picContact !== undefined) dataToUpdate.picContact = body.picContact; // Menggunakan picContact
    if (body.status !== undefined) dataToUpdate.status = body.status;
    
    // --- AKHIR PERUBAHAN ---

    const updatedAsset = await prisma.asset.update({
      where: { id: id },
      data: dataToUpdate, // Gunakan objek yang sudah kita filter
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Gagal update aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

// --- FUNGSI DELETE (TIDAK BERUBAH) ---
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    // Pastikan semua relasi maintenance dihapus dulu sebelum aset dihapus
    await prisma.maintenance.deleteMany({
      where: { assetId: id },
    });
    
    await prisma.asset.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: "Aset berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Gagal menghapus aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}