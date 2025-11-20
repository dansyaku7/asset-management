// File: app/api/v1/purchasing/suppliers/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
        return NextResponse.json(suppliers);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data supplier' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, contactPerson, phone, address } = body;
        if (!name) return NextResponse.json({ error: 'Nama supplier wajib diisi' }, { status: 400 });

        const newSupplier = await prisma.supplier.create({
            data: { name, contactPerson, phone, address },
        });
        return NextResponse.json(newSupplier, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') return NextResponse.json({ error: 'Nama supplier sudah ada' }, { status: 409 });
        return NextResponse.json({ error: 'Gagal membuat supplier baru' }, { status: 500 });
    }
}
