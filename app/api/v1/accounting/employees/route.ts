// File: app/api/v1/accounting/employees/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET all employees for salary settings
export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const employees = await prisma.employee.findMany({
            where: {
                isActive: true // Hanya ambil karyawan yang aktif
            },
            include: {
                user: {
                    select: { fullName: true }
                },
                branch: {
                    select: { name: true }
                }
            },
            orderBy: {
                user: { fullName: 'asc' }
            }
        });
        return NextResponse.json(employees);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data karyawan' }, { status: 500 });
    }
}
