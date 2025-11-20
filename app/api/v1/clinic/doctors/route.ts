// File: app/api/v1/clinic/doctors/route.ts
// PERBAIKAN: Menambahkan filter berdasarkan branchId

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchIdParam = searchParams.get('branchId');
    let branchId = branchIdParam ? parseInt(branchIdParam, 10) : undefined;
    
    // Siapkan kondisi filter
    let whereCondition: any = {
        position: {
            contains: 'Dokter',
        },
        isActive: true,
    };
    
    if (branchId !== undefined && !isNaN(branchId)) {
        // Jika branchId disediain, kita filter berdasarkan cabang itu
        whereCondition.branchId = branchId;
    } else if (decodedToken.role !== 'SUPER_ADMIN') {
        // Kalau bukan Super Admin dan tidak ada branchId, kita blok akses atau batasi ke cabang user
        // Untuk konsistensi, kita anggap semua dokter di semua cabang bisa melayani
        // TAPI untuk dropdown, kita harus kirim branchId yang benar dari frontend.
    }

    try {
        const doctors = await prisma.employee.findMany({
            where: whereCondition,
            include: {
                user: { select: { fullName: true } },
            },
            orderBy: {
                user: { fullName: 'asc' }
            }
        });

        const formattedDoctors = doctors.map(doc => ({
            id: doc.id,
            fullName: doc.user.fullName,
            position: doc.position,
            branchId: doc.branchId,
        }));

        return NextResponse.json(formattedDoctors);
    } catch (error) {
        console.error("Gagal mengambil data dokter:", error);
        return NextResponse.json({ error: 'Gagal mengambil data dokter' }, { status: 500 });
    }
}
