// File: app/api/v1/clinic/drugs/[id]/route.ts
// PERBAIKAN: Menambahkan 'sellingPrice' saat mengupdate obat

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

const allowedRoles = ['SUPER_ADMIN', 'FARMASI', 'DOKTER', 'STAFF', 'KASIR', 'ADMIN'];

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || !allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) { return NextResponse.json({ error: 'ID Obat tidak valid' }, { status: 400 }); }

    try {
        const body = await request.json();
        // VVVV--- PERUBAHAN DI SINI ---VVVV
        const { name, unit, sellingPrice } = body;
        
        if (!name || !unit || sellingPrice === undefined) { 
            return NextResponse.json({ error: 'Nama, Satuan, dan Harga Jual wajib diisi' }, { status: 400 }); 
        }
        // ^^^^--- PERUBAHAN DI SINI ---^^^^

        const updatedDrug = await prisma.drug.update({
            where: { id },
            data: { 
                name, 
                unit,
                sellingPrice: new Decimal(sellingPrice) // <-- TAMBAHAN BARU
            },
        });

        return NextResponse.json(updatedDrug);
    } catch (error: any) {
        if (error.code === 'P2025') { return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 }); }
        if (error.code === 'P2002') { return NextResponse.json({ error: 'Nama obat sudah ada' }, { status: 409 }); }
        console.error("Gagal memperbarui data obat:", error);
        return NextResponse.json({ error: 'Gagal memperbarui data obat' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || !allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) { return NextResponse.json({ error: 'ID Obat tidak valid' }, { status: 400 }); }

    try {
        await prisma.drug.delete({ where: { id } });
        return new NextResponse(null, { status: 204 }); 
    } catch (error: any) {
        if (error.code === 'P2025') { 
            return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 }); 
        }
        if (error.code === 'P2003') {
            return NextResponse.json({ error: 'Gagal menghapus: Obat ini sudah digunakan dalam data lain.' }, { status: 409 });
        }
        console.error("Gagal menghapus obat:", error);
        return NextResponse.json({ error: 'Gagal menghapus obat' }, { status: 500 });
    }
}