// File: app/api/v1/clinic/doctors/current/route.ts
// Mengambil ID Employee (doctorId) dari user yang sedang login

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const doctorEmployee = await prisma.employee.findFirst({
            where: { 
                userId: decodedToken.userId,
                // Logika identifikasi dokter: posisinya harus mengandung 'Dokter'
                position: { contains: 'Dokter' }
            },
            select: { id: true, position: true }
        });

        if (!doctorEmployee) {
            return NextResponse.json({ 
                error: 'Akun ini tidak terdaftar sebagai Dokter atau Staf Medis.',
                isDoctor: false 
            }, { status: 403 });
        }

        return NextResponse.json({ 
            doctorId: doctorEmployee.id,
            isDoctor: true 
        });

    } catch (error) {
        console.error("Gagal mengambil ID Dokter:", error);
        return NextResponse.json({ error: 'Gagal mengambil data dokter' }, { status: 500 });
    }
}
