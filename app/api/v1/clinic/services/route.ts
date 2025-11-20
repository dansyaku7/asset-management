// File: app/api/v1/clinic/services/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/v1/clinic/services
// Mengambil semua daftar jasa/layanan
export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const services = await prisma.service.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(services);
    } catch (error) {
        console.error("Gagal mengambil data jasa:", error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

// POST /api/v1/clinic/services
// Membuat jasa/layanan baru
export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    // Nanti kita bisa tambahin cek role admin

    try {
        const body = await request.json();
        const { name, price } = body;

        if (!name || !price) {
            return NextResponse.json({ error: 'Nama dan harga wajib diisi' }, { status: 400 });
        }

        const newService = await prisma.service.create({
            data: {
                name,
                price: new Decimal(price)
            }
        });

        return NextResponse.json(newService, { status: 201 });
    } catch (error) {
        console.error("Gagal membuat jasa baru:", error);
        return NextResponse.json({ error: 'Gagal membuat data baru' }, { status: 500 });
    }
}