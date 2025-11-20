// File: app/api/v1/clinic/cashier/invoices/route.ts
// (REVISI - Perbaikan Serialisasi JSON untuk Tipe Data Decimal)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET /api/v1/clinic/cashier/invoices?branchId=...
// Mengambil daftar invoice yang belum dibayar (UNPAID) untuk cabang tertentu
export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    // Nanti bisa tambahin cek role KASIR, ADMIN, SUPER_ADMIN

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
        return NextResponse.json({ error: 'Parameter branchId wajib ada' }, { status: 400 });
    }
    const branchIdInt = parseInt(branchId, 10);
    if (isNaN(branchIdInt)) {
         return NextResponse.json({ error: 'Parameter branchId tidak valid' }, { status: 400 });
    }

    try {
        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                branchId: branchIdInt,
                status: 'UNPAID' // Hanya ambil yang belum bayar
            },
            include: {
                patient: { // Ambil nama pasien
                    select: {
                        fullName: true,
                        medicalRecordNo: true
                    }
                },
                appointment: { // Ambil tanggal appointment
                    select: {
                        appointmentDate: true
                    }
                },
                items: true // Ambil rincian item jika perlu ditampilkan
            },
            orderBy: {
                createdAt: 'asc' // Tampilkan yang paling lama dulu
            }
        });

        // --- PERBAIKAN DI SINI ---
        // Konversi tipe data Decimal ke string sebelum dikirim sebagai JSON.
        // Ini untuk mencegah masalah serialisasi di mana Decimal bisa menjadi 0.
        const serializedInvoices = unpaidInvoices.map(invoice => ({
            ...invoice,
            totalAmount: invoice.totalAmount.toString(),
            items: invoice.items.map(item => ({
                ...item,
                price: item.price.toString(),
                total: item.total.toString(),
            })),
        }));
        // --- AKHIR PERBAIKAN ---

        return NextResponse.json(serializedInvoices);
    } catch (error) {
        console.error("Gagal mengambil data invoice kasir:", error);
        return NextResponse.json({ error: 'Gagal mengambil data invoice' }, { status: 500 });
    }
}

