// app/api/assets/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// import { Decimal } from '@prisma/client/runtime/library'; // <-- Import ini kita nonaktifkan dulu karena mencurigakan

const prisma = new PrismaClient();

// --- FUNGSI PUT MINIMALIS UNTUK TES BUILD ---
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Semua logika update, req.json(), dan prisma kita matikan sementara
  const { id } = context.params;

  console.log(`Build test received for asset ID: ${id}`);

  // Kita langsung kembalikan response sederhana untuk membuktikan build berhasil
  return NextResponse.json({ 
    message: `Build test successful for ID: ${id}`, 
    status: "OK" 
  });
}

// --- FUNGSI DELETE (DIBIARKAN SEPERTI ASLINYA) ---
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
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