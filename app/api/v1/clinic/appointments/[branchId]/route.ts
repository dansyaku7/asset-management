// File: app/api/v1/clinic/appointments/[branchId]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const branchId = parseInt(params.branchId, 10);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (isNaN(branchId) || !startDate || !endDate) {
        return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                branchId: branchId,
                appointmentDate: {
                    gte: new Date(startDate),
                    lt: new Date(endDate),
                },
            },
            include: {
                patient: { select: { fullName: true, medicalRecordNo: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
            },
            orderBy: { appointmentDate: 'asc' },
        });
        return NextResponse.json(appointments);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data janji temu' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: { branchId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    
    const branchId = parseInt(params.branchId, 10);
    if (isNaN(branchId)) {
        return NextResponse.json({ error: 'ID Cabang tidak valid' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { patientId, doctorId, appointmentDate, notes } = body;

        if (!patientId || !doctorId || !appointmentDate) {
            return NextResponse.json({ error: 'Pasien, dokter, dan waktu janji temu wajib diisi' }, { status: 400 });
        }

        const newAppointment = await prisma.appointment.create({
            data: {
                patientId: Number(patientId),
                doctorId: Number(doctorId),
                branchId: branchId,
                appointmentDate: new Date(appointmentDate),
                notes,
                status: 'SCHEDULED',
            },
        });

        return NextResponse.json(newAppointment, { status: 201 });
    } catch (error) {
        console.error("Gagal membuat janji temu:", error);
        return NextResponse.json({ error: 'Gagal membuat janji temu' }, { status: 500 });
    }
}
