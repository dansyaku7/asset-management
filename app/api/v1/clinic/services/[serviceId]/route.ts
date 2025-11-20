// File: app/api/v1/clinic/services/[serviceId]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

// PUT /api/v1/clinic/services/[serviceId]
// Mengupdate jasa/layanan
export async function PUT(request: NextRequest, { params }: { params: { serviceId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    
    const id = parseInt(params.serviceId, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID Jasa tidak valid' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { name, price } = body;

        if (!name || !price) {
            return NextResponse.json({ error: 'Nama dan harga wajib diisi' }, { status: 400 });
        }

        const updatedService = await prisma.service.update({
            where: { id },
            data: {
                name,
                price: new Decimal(price)
            }
        });

        return NextResponse.json(updatedService);
    } catch (error) {
        console.error(`Gagal mengupdate jasa ${id}:`, error);
        return NextResponse.json({ error: 'Gagal mengupdate data' }, { status: 500 });
    }
}

// DELETE /api/v1/clinic/services/[serviceId]
// Menghapus jasa/layanan
export async function DELETE(request: NextRequest, { params }: { params: { serviceId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    
    const id = parseInt(params.serviceId, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID Jasa tidak valid' }, { status: 400 });
    }

    try {
        await prisma.service.delete({
            where: { id }
        });
        return NextResponse.json({ message: 'Jasa berhasil dihapus' }, { status: 200 });
    } catch (error) {
        console.error(`Gagal menghapus jasa ${id}:`, error);
        // Cek jika error karena relasi
        if (error.code === 'P2003') { 
            return NextResponse.json({ error: 'Gagal menghapus: Jasa ini sudah digunakan di invoice.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
    }
}