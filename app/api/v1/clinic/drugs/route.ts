// File: app/api/v1/clinic/drugs/route.ts
// PERBAIKAN: Menambahkan 'sellingPrice' saat membuat obat baru

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

const allowedRoles = ['SUPER_ADMIN', 'FARMASI', 'DOKTER', 'STAFF', 'KASIR', 'ADMIN'];

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || !allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const drugs = await prisma.drug.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(drugs);
    } catch (error) {
        console.error("Gagal mengambil data obat:", error);
        return NextResponse.json({ error: 'Gagal mengambil data obat' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || !allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        // VVVV--- PERUBAHAN DI SINI ---VVVV
        const { name, unit, sellingPrice } = body;

        if (!name || !unit || sellingPrice === undefined) {
            return NextResponse.json({ error: 'Nama, Satuan, dan Harga Jual wajib diisi' }, { status: 400 });
        }
        // ^^^^--- PERUBAHAN DI SINI ---^^^^

        const newDrug = await prisma.drug.create({
            data: { 
                name, 
                unit,
                sellingPrice: new Decimal(sellingPrice) // <-- TAMBAHAN BARU
            },
        });

        return NextResponse.json(newDrug, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') { 
            return NextResponse.json({ error: 'Nama obat sudah ada' }, { status: 409 });
        }
        console.error("Gagal membuat obat baru:", error);
        return NextResponse.json({ error: 'Gagal membuat data obat baru' }, { status: 500 });
    }
}