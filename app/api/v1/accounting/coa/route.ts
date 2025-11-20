// File: app/api/v1/accounting/coa/route.ts
// PERBAIKAN: Melonggarkan pengecekan role

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    
    // Anggap saja semua admin boleh melihat COA
    const allowedRoles = ['SUPER_ADMIN', 'ASET_MANAJEMEN', 'ACCOUNTING'];
    if (!allowedRoles.includes(decodedToken.role)) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin untuk melihat data ini.' }, { status: 403 });
    }

    try {
        const accounts = await prisma.chartOfAccount.findMany({
            orderBy: { accountCode: 'asc' },
        });
        return NextResponse.json(accounts);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data COA' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    // Hanya role tertentu yang boleh menambah/mengubah
    const allowedRoles = ['SUPER_ADMIN', 'ACCOUNTING']; 
    if (!allowedRoles.includes(decodedToken.role)) {
        return NextResponse.json({ error: 'Hanya Super Admin atau Akunting yang dapat menambah akun.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { accountCode, accountName, category } = body;

        if (!accountCode || !accountName || !category) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }
        if (!Object.values(AccountCategory).includes(category)) {
            return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 });
        }

        const newAccount = await prisma.chartOfAccount.create({
            data: { accountCode, accountName, category },
        });

        return NextResponse.json(newAccount, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Kode Akun sudah ada' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Gagal membuat akun baru' }, { status: 500 });
    }
}