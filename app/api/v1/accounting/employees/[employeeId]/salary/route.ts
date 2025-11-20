// File: app/api/v1/accounting/employees/[employeeId]/salary/route.ts
// PERBAIKAN: Mengubah payrollComponentId dari String ke Int sebelum disimpan

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

// GET: Mengambil struktur gaji seorang karyawan (Tidak Berubah)
export async function GET(request: NextRequest, { params }: { params: { employeeId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    const employeeId = parseInt(params.employeeId, 10);
    if (isNaN(employeeId)) return NextResponse.json({ error: 'ID Karyawan tidak valid' }, { status: 400 });

    try {
        const salaries = await prisma.employeeSalary.findMany({
            where: { employeeId },
            include: {
                payrollComponent: true
            },
            orderBy: {
                payrollComponent: { type: 'asc' }
            }
        });
        return NextResponse.json(salaries);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data gaji' }, { status: 500 });
    }
}

// POST: Menyimpan/mengupdate struktur gaji seorang karyawan (DIPERBAIKI)
export async function POST(request: NextRequest, { params }: { params: { employeeId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    const employeeId = parseInt(params.employeeId, 10);
    if (isNaN(employeeId)) return NextResponse.json({ error: 'ID Karyawan tidak valid' }, { status: 400 });

    try {
        const body: { payrollComponentId: string; amount: string; }[] = await request.json();

        await prisma.$transaction(async (tx) => {
            // 1. Hapus semua struktur gaji lama karyawan ini
            await tx.employeeSalary.deleteMany({
                where: { employeeId }
            });

            // 2. Buat ulang struktur gaji yang baru
            if (body.length > 0) {
                await tx.employeeSalary.createMany({
                    data: body.map(s => ({
                        employeeId,
                        // VVVV--- PERBAIKAN DI SINI ---VVVV
                        payrollComponentId: parseInt(s.payrollComponentId, 10), // Ubah ke Int
                        // ^^^^--- PERBAIKAN DI SINI ---^^^^
                        amount: new Decimal(s.amount)
                    }))
                });
            }
        });

        return NextResponse.json({ message: 'Struktur gaji berhasil diperbarui' });

    } catch (error) {
        console.error("Gagal menyimpan gaji:", error);
        return NextResponse.json({ error: 'Gagal menyimpan struktur gaji' }, { status: 500 });
    }
}

