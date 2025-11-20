// File: app/api/v1/accounting/payroll-components/[id]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { PayrollComponentType } from '@prisma/client';

// PUT: Update a payroll component
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        const { name, type } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Nama dan Tipe komponen wajib diisi' }, { status: 400 });
        }
        if (!Object.values(PayrollComponentType).includes(type)) {
            return NextResponse.json({ error: 'Tipe komponen tidak valid' }, { status: 400 });
        }

        const updatedComponent = await prisma.payrollComponent.update({
            where: { id },
            data: { name, type },
        });

        return NextResponse.json(updatedComponent);
    } catch (error: any) {
        if (error.code === 'P2002') return NextResponse.json({ error: 'Nama komponen gaji sudah ada' }, { status: 409 });
        if (error.code === 'P2025') return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
        return NextResponse.json({ error: 'Gagal mengupdate komponen' }, { status: 500 });
    }
}

// DELETE: Delete a payroll component
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    try {
        await prisma.payrollComponent.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Komponen berhasil dihapus' });
    } catch (error: any) {
        if (error.code === 'P2003') return NextResponse.json({ error: 'Gagal menghapus: Komponen ini sudah digunakan oleh karyawan.' }, { status: 409 });
        if (error.code === 'P2025') return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });
        return NextResponse.json({ error: 'Gagal menghapus komponen' }, { status: 500 });
    }
}
