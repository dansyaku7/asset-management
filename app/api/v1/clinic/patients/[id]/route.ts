// File: app/api/v1/clinic/patients/[id]/route.ts
// Menangani GET, PUT, dan DELETE untuk Pasien.

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// DELETE: Menghapus Pasien dan semua data terkait
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const patientId = parseInt(params.id, 10);
    if (isNaN(patientId)) {
        return NextResponse.json({ error: 'ID Pasien tidak valid' }, { status: 400 });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Hapus Resep Items yang terkait dengan Rekam Medis Pasien
            const records = await tx.medicalRecord.findMany({ 
                where: { patientId }, 
                select: { id: true } 
            });
            const recordIds = records.map(r => r.id);

            const prescriptions = await tx.prescription.findMany({
                where: { medicalRecordId: { in: recordIds } },
                select: { id: true }
            });
            const prescriptionIds = prescriptions.map(p => p.id);

            await tx.prescriptionItem.deleteMany({
                where: { prescriptionId: { in: prescriptionIds } }
            });

            // 2. Hapus Resep
            await tx.prescription.deleteMany({
                where: { medicalRecordId: { in: recordIds } }
            });

            // 3. Hapus Janji Temu
            await tx.appointment.deleteMany({
                where: { patientId }
            });

            // 4. Hapus Rekam Medis
            await tx.medicalRecord.deleteMany({
                where: { patientId }
            });

            // 5. Hapus Pasien Utama
            await tx.patient.delete({
                where: { id: patientId }
            });
        });

        return NextResponse.json({ message: 'Pasien dan semua data terkait berhasil dihapus.' }, { status: 200 });

    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 });
        }
        console.error("Gagal menghapus pasien dan relasinya:", error);
        return NextResponse.json({ error: 'Gagal menghapus pasien karena masalah relasi data.' }, { status: 500 });
    }
}
