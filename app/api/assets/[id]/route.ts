// app/api/assets/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// FUNGSI PUT MINIMALIS DARI TES SEBELUMNYA
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  console.log(`Test received for ID: ${id}`);
  
  return NextResponse.json({ 
    message: `Build test successful for ID: ${id}`, 
    status: "OK" 
  });
} // <-- INI YANG KEMUNGKINAN BESAR HILANG KEMARIN

// FUNGSI DELETE KAMU (TIDAK DIUBAH)
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
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