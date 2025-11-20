// File: app/api/v1/management/branches/[id]/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

// Fungsi untuk UPDATE (PUT) cabang
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);
        const { name, address, phone } = await req.json();

        if (!name) {
            return NextResponse.json({ message: "Nama cabang wajib diisi" }, { status: 400 });
        }

        const updatedBranch = await prisma.branch.update({
            where: { id },
            data: { name, address, phone },
        });

        return NextResponse.json(updatedBranch);
    } catch (error) {
        console.error("Gagal update cabang:", error);
        return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
    }
}

// Fungsi untuk DELETE cabang
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);

        // Cek apakah masih ada aset di cabang ini
        const assetCount = await prisma.asset.count({
            where: { branchId: id },
        });

        if (assetCount > 0) {
            return NextResponse.json({ message: `Tidak dapat menghapus cabang karena masih memiliki ${assetCount} aset.` }, { status: 400 });
        }
        
        // Lanjutkan hapus jika tidak ada aset
        await prisma.branch.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Cabang berhasil dihapus" }, { status: 200 });
    } catch (error) {
        console.error("Gagal menghapus cabang:", error);
        return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
    }
}
