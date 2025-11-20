// File: app/api/v1/clinic/accounts/route.ts
// PERBAIKAN: Menambahkan handling 'paymentMapping'

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory, PaymentAccountMapping } from '@prisma/client'; // Import enum baru

export async function GET(request: NextRequest) {
    // ... (Fungsi GET tidak berubah) ...
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    try {
        const accounts = await prisma.chartOfAccount.findMany({
            orderBy: { accountCode: 'asc' }
        });
        return NextResponse.json(accounts);
    } catch (error) {
        console.error("Gagal mengambil data COA:", error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 }); }

    try {
        const body = await request.json();
        // VVVV--- TAMBAH paymentMapping ---VVVV
        const { accountCode, accountName, category, paymentMapping = PaymentAccountMapping.NONE } = body;
        // ^^^^--- TAMBAH paymentMapping ---^^^^

        if (!accountCode || !accountName || !category) {
            return NextResponse.json({ error: 'Kode, Nama, dan Kategori wajib diisi' }, { status: 400 });
        }
        if (!Object.values(AccountCategory).includes(category as AccountCategory)) {
             return NextResponse.json({ error: 'Kategori akun tidak valid' }, { status: 400 });
        }
        // Validasi paymentMapping
        if (!Object.values(PaymentAccountMapping).includes(paymentMapping as PaymentAccountMapping)) {
            return NextResponse.json({ error: 'Mapping Pembayaran tidak valid' }, { status: 400 });
        }

        // VVVV--- VALIDASI UNIK UNTUK MAPPING (kecuali NONE) ---VVVV
        if (paymentMapping !== PaymentAccountMapping.NONE) {
            const existingMapping = await prisma.chartOfAccount.findFirst({
                where: { paymentMapping: paymentMapping as PaymentAccountMapping }
            });
            if (existingMapping) {
                return NextResponse.json({ error: `Sudah ada akun lain (${existingMapping.accountName}) yang di-mapping sebagai ${paymentMapping}. Hanya boleh ada satu mapping per jenis.` }, { status: 409 });
            }
        }
        // ^^^^--- VALIDASI UNIK UNTUK MAPPING ---^^^^

        const newAccount = await prisma.chartOfAccount.create({
            data: {
                accountCode,
                accountName,
                category: category as AccountCategory,
                paymentMapping: paymentMapping as PaymentAccountMapping // <-- Simpan mapping
            }
        });

        return NextResponse.json(newAccount, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('accountCode')) {
            return NextResponse.json({ error: 'Kode Akun sudah ada' }, { status: 409 });
        }
        console.error("Gagal membuat akun baru:", error);
        return NextResponse.json({ error: 'Gagal membuat data baru' }, { status: 500 });
    }
}