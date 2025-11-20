// File: app/api/v1/clinic/accounts/[accountId]/route.ts
// PERBAIKAN: Menambahkan handling 'paymentMapping'

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory, PaymentAccountMapping } from '@prisma/client'; // Import enum baru

export async function PUT(request: NextRequest, { params }: { params: { accountId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 }); }
    
    const id = parseInt(params.accountId, 10);
    if (isNaN(id)) { return NextResponse.json({ error: 'ID Akun tidak valid' }, { status: 400 }); }

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
        if (!Object.values(PaymentAccountMapping).includes(paymentMapping as PaymentAccountMapping)) {
            return NextResponse.json({ error: 'Mapping Pembayaran tidak valid' }, { status: 400 });
        }

        // VVVV--- VALIDASI UNIK UNTUK MAPPING (kecuali NONE) saat UPDATE ---VVVV
        if (paymentMapping !== PaymentAccountMapping.NONE) {
            const existingMapping = await prisma.chartOfAccount.findFirst({
                where: { 
                    paymentMapping: paymentMapping as PaymentAccountMapping,
                    id: { not: id } // Cek akun lain yg punya mapping sama
                }
            });
            if (existingMapping) {
                return NextResponse.json({ error: `Sudah ada akun lain (${existingMapping.accountName}) yang di-mapping sebagai ${paymentMapping}. Hanya boleh ada satu mapping per jenis.` }, { status: 409 });
            }
        }
         // ^^^^--- VALIDASI UNIK UNTUK MAPPING ---^^^^

        const updatedAccount = await prisma.chartOfAccount.update({
            where: { id },
            data: {
                accountCode,
                accountName,
                category: category as AccountCategory,
                paymentMapping: paymentMapping as PaymentAccountMapping // <-- Update mapping
            }
        });

        return NextResponse.json(updatedAccount);
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('accountCode')) {
            return NextResponse.json({ error: 'Kode Akun sudah ada' }, { status: 409 });
        }
         if (error.code === 'P2025') { // Handle jika ID tidak ditemukan
            return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
        }
        console.error(`Gagal mengupdate akun ${id}:`, error);
        return NextResponse.json({ error: 'Gagal mengupdate data' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { accountId: string } }) {
    // ... (Fungsi DELETE tidak berubah) ...
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 }); }
    
    const id = parseInt(params.accountId, 10);
    if (isNaN(id)) { return NextResponse.json({ error: 'ID Akun tidak valid' }, { status: 400 }); }

    try {
        await prisma.chartOfAccount.delete({ where: { id } });
        return NextResponse.json({ message: 'Akun berhasil dihapus' }, { status: 200 });
    } catch (error: any) {
        console.error(`Gagal menghapus akun ${id}:`, error);
        if (error.code === 'P2025') { return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 }); }
        if (error.code === 'P2003') { return NextResponse.json({ error: 'Gagal menghapus: Akun ini sudah digunakan di Jurnal.' }, { status: 409 }); }
        return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
    }
}