// File: app/api/v1/clinic/dashboard-stats/[branchId]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const branchId = parseInt(params.branchId, 10);
    if (isNaN(branchId)) {
        return NextResponse.json({ error: 'ID Cabang tidak valid' }, { status: 400 });
    }

    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const [patientCount, visitsToday] = await prisma.$transaction([
            // Hitung total pasien yang terdaftar di cabang ini
            prisma.patient.count({
                where: { branchId: branchId },
            }),
            // Hitung total appointment (janji temu) di cabang ini untuk hari ini
            prisma.appointment.count({
                where: {
                    branchId: branchId,
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            }),
        ]);

        return NextResponse.json({
            patientCount,
            visitsToday,
        });

    } catch (error) {
        console.error("Gagal mengambil statistik dashboard:", error);
        return NextResponse.json({ error: 'Gagal mengambil data statistik' }, { status: 500 });
    }
}
