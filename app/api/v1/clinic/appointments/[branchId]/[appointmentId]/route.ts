// File: app/api/v1/clinic/appointments/[branchId]/[appointmentId]/route.ts
// Menangani GET, PUT, dan DELETE untuk janji temu spesifik.

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AppointmentStatus } from '@prisma/client';

// Helper untuk parsing params
function parseIds(params: { branchId: string, appointmentId: string }): { branchId: number, appointmentId: number } | null {
    const branchId = parseInt(params.branchId, 10);
    const appointmentId = parseInt(params.appointmentId, 10);
    if (isNaN(branchId) || isNaN(appointmentId)) {
        return null;
    }
    return { branchId, appointmentId };
}

// GET: Mengambil detail janji temu
export async function GET(request: NextRequest, { params }: { params: { branchId: string, appointmentId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const ids = parseIds(params);
    if (!ids) {
        return NextResponse.json({ error: 'ID Cabang atau Janji Temu tidak valid' }, { status: 400 });
    }

    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: ids.appointmentId },
            include: {
                patient: { select: { fullName: true, medicalRecordNo: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
            },
        });
        
        if (!appointment) {
            return NextResponse.json({ error: 'Janji Temu tidak ditemukan' }, { status: 404 });
        }

        if (appointment.branchId !== ids.branchId) {
             return NextResponse.json({ error: 'Janji temu tidak ditemukan di cabang ini.' }, { status: 404 });
        }

        return NextResponse.json(appointment);
    } catch (error) {
        console.error("Gagal mengambil janji temu:", error);
        return NextResponse.json({ error: 'Gagal memuat detail janji temu' }, { status: 500 });
    }
}

// PUT: Memperbarui janji temu (untuk tombol Edit)
export async function PUT(request: NextRequest, { params }: { params: { branchId: string, appointmentId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const ids = parseIds(params);
    if (!ids) {
        return NextResponse.json({ error: 'ID Cabang atau Janji Temu tidak valid' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { patientId, doctorId, appointmentDate, status, notes } = body;

        const existingAppointment = await prisma.appointment.findUnique({
            where: { id: ids.appointmentId },
            select: { branchId: true }
        });

        if (!existingAppointment || existingAppointment.branchId !== ids.branchId) {
            return NextResponse.json({ error: 'Janji temu tidak ditemukan di cabang yang sesuai.' }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (patientId) dataToUpdate.patientId = Number(patientId);
        if (doctorId) dataToUpdate.doctorId = Number(doctorId);
        if (appointmentDate) dataToUpdate.appointmentDate = new Date(appointmentDate);
        if (status) dataToUpdate.status = status;
        if (notes !== undefined) dataToUpdate.notes = notes;


        const updatedAppointment = await prisma.appointment.update({
            where: { id: ids.appointmentId },
            data: dataToUpdate,
        });

        return NextResponse.json(updatedAppointment);
    } catch (error) {
        console.error("Gagal memperbarui janji temu:", error);
        return NextResponse.json({ error: 'Gagal memperbarui janji temu' }, { status: 500 });
    }
}


// DELETE: Menghapus janji temu
export async function DELETE(request: NextRequest, { params }: { params: { branchId: string, appointmentId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const ids = parseIds(params);
    if (!ids) {
        return NextResponse.json({ error: 'ID Cabang atau Janji Temu tidak valid' }, { status: 400 });
    }

    try {
        const existingAppointment = await prisma.appointment.findUnique({
            where: { id: ids.appointmentId },
            select: { branchId: true }
        });

        if (!existingAppointment || existingAppointment.branchId !== ids.branchId) {
            return NextResponse.json({ error: 'Janji temu tidak ditemukan di cabang yang sesuai.' }, { status: 404 });
        }
        
        await prisma.appointment.delete({
            where: { id: ids.appointmentId },
        });

        return NextResponse.json({ message: 'Janji temu berhasil dihapus' }, { status: 200 });
    } catch (error) {
        console.error("Gagal menghapus janji temu:", error);
        return NextResponse.json({ error: 'Gagal menghapus janji temu' }, { status: 500 });
    }
}
