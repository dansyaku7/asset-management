// File: app/api/v1/accounting/payroll-components/route.ts
// LOKASI BARU: Dipindahkan dari /hr/ ke /accounting/

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { PayrollComponentType } from '@prisma/client';

// GET all payroll components
export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const components = await prisma.payrollComponent.findMany({
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json(components);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data komponen gaji' }, { status: 500 });
    }
}

// POST a new payroll component
export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, type } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Nama dan Tipe komponen wajib diisi' }, { status: 400 });
        }
        if (!Object.values(PayrollComponentType).includes(type)) {
            return NextResponse.json({ error: 'Tipe komponen tidak valid' }, { status: 400 });
        }

        const newComponent = await prisma.payrollComponent.create({
            data: { name, type },
        });

        return NextResponse.json(newComponent, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Nama komponen gaji sudah ada' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Gagal membuat komponen baru' }, { status: 500 });
    }
}
