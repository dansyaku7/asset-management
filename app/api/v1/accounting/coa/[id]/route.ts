// File: app/api/v1/accounting/coa/[id]/route.ts
// PERBAIKAN: Melonggarkan pengecekan role

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory } from '@prisma/client';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const allowedRoles = ['SUPER_ADMIN', 'ACCOUNTING'];
    if (!allowedRoles.includes(decodedToken.role)) {
        return NextResponse.json({ error: 'Hanya Super Admin atau Akunting yang dapat mengubah akun.' }, { status: 403 });
    }

    try {
        const id = parseInt(params.id, 10);
        const body = await request.json();
        const { accountCode, accountName, category } = body;

        if (!accountCode || !accountName || !category) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }
        if (!Object.values(AccountCategory).includes(category)) {
            return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 });
        }

        const updatedAccount = await prisma.chartOfAccount.update({
            where: { id },
            data: { accountCode, accountName, category },
        });

        return NextResponse.json(updatedAccount);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Kode Akun sudah ada' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Gagal memperbarui akun' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const allowedRoles = ['SUPER_ADMIN', 'ACCOUNTING'];
    if (!allowedRoles.includes(decodedToken.role)) {
        return NextResponse.json({ error: 'Hanya Super Admin atau Akunting yang dapat menghapus akun.' }, { status: 403 });
    }

    try {
        const id = parseInt(params.id, 10);
        await prisma.chartOfAccount.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Gagal menghapus akun' }, { status: 500 });
    }
}