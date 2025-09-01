// app/api/assets/maintenance/[id]/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();

    // --- PERBAIKAN UTAMA DI SINI ---
    // Kita bangun objek data secara dinamis
    // agar hanya field yang ada di 'body' yang diupdate
    const dataToUpdate: any = {};
    
    if (body.description !== undefined) {
      dataToUpdate.description = body.description;
    }
    if (body.status !== undefined) {
      dataToUpdate.status = body.status;
    }
    if (body.cost !== undefined) {
      dataToUpdate.cost = body.cost ? parseFloat(body.cost) : null;
    }
    if (body.notes !== undefined) {
      dataToUpdate.notes = body.notes;
    }
    // Logika khusus untuk tanggal agar bisa di-set ke null
    if (body.hasOwnProperty('scheduledDate')) {
        dataToUpdate.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    }
    if (body.hasOwnProperty('completionDate')) {
        dataToUpdate.completionDate = body.completionDate ? new Date(body.completionDate) : null;
    }
    // --- AKHIR PERBAIKAN ---

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id },
      data: dataToUpdate, // Gunakan objek yang sudah kita bangun
    });

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error("Gagal memperbarui maintenance:", error);
    return NextResponse.json({ message: "Gagal memperbarui data maintenance" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await prisma.maintenance.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Data maintenance berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus data maintenance" }, { status: 500 });
  }
}