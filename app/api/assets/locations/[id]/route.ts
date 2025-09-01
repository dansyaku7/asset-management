import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi untuk UPDATE (PUT) lokasi
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const { name, address } = await req.json();
    if (!name) {
      return NextResponse.json({ message: "Nama lokasi wajib diisi" }, { status: 400 });
    }
    const updatedLocation = await prisma.location.update({
      where: { id },
      data: { name, address },
    });
    return NextResponse.json(updatedLocation);
  } catch (error) {
    return NextResponse.json({ message: "Gagal memperbarui lokasi" }, { status: 500 });
  }
}

// Fungsi untuk DELETE lokasi
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id, 10);
        const assetsInLocation = await prisma.asset.count({ where: { locationId: id } });
        if (assetsInLocation > 0) {
            return NextResponse.json(
                { message: `Tidak dapat menghapus. Masih ada ${assetsInLocation} aset di lokasi ini.` },
                { status: 400 }
            );
        }
        await prisma.location.delete({ where: { id } });
        return NextResponse.json({ message: "Lokasi berhasil dihapus" });
    } catch (error) {
        return NextResponse.json({ message: "Gagal menghapus lokasi" }, { status: 500 });
    }
}
