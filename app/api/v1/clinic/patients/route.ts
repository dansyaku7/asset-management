// File: app/api/v1/clinic/patients/route.ts
// PERBAIKAN: Logika generateMedicalRecordNo agar tidak duplikat

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Gender } from '@prisma/client';

// --- PERBAIKAN UTAMA DI SINI ---
const generateMedicalRecordNo = async (tx: any): Promise<string> => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${year}${month}`; // Contoh: 2510

    // Cari ID Pasien tertinggi (max id) yang dimulai dengan prefix bulan ini
    const lastPatient = await tx.patient.findFirst({
        where: {
            medicalRecordNo: { startsWith: prefix }
        },
        orderBy: { medicalRecordNo: 'desc' },
        select: { medicalRecordNo: true }
    });

    let sequence = 1;

    if (lastPatient) {
        // Ambil nomor urut terakhir (4 digit terakhir)
        const lastSequence = parseInt(lastPatient.medicalRecordNo.slice(4), 10);
        sequence = lastSequence + 1;
    }

    // Format: YYMMXXXX (e.g., 25100001)
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
}
// --- AKHIR PERBAIKAN UTAMA ---


export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    
    try {
        const patients = await prisma.patient.findMany({
            include: { registeredAtBranch: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(patients);
    } catch (error) {
        return NextResponse.json({ error: 'Gagal mengambil data pasien' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { fullName, dateOfBirth, gender, address, phone, branchId } = body;

        if (!fullName || !dateOfBirth || !gender || !branchId) {
            return NextResponse.json({ error: 'Nama, Tanggal Lahir, Gender, dan Cabang Pendaftaran wajib diisi' }, { status: 400 });
        }
        if (!Object.values(Gender).includes(gender)) {
            return NextResponse.json({ error: 'Gender tidak valid' }, { status: 400 });
        }

        // --- TRANSAKSI UNTUK MENCEGAH DUPLIKASI RM ---
        const newPatient = await prisma.$transaction(async (tx) => {
             // Generate RM di dalam transaksi untuk menghindari race condition
            const medicalRecordNo = await generateMedicalRecordNo(tx); 

            const patient = await tx.patient.create({
                data: {
                    medicalRecordNo,
                    fullName,
                    dateOfBirth: new Date(dateOfBirth),
                    gender,
                    address,
                    phone,
                    branchId: Number(branchId),
                },
            });
            return patient;
        });

        return NextResponse.json(newPatient, { status: 201 });
    } catch (error: any) {
        // Pengecekan error duplikat lain (fallback)
        if (error.code === 'P2002' && error.meta?.target?.includes("medicalRecordNo")) {
            return NextResponse.json({ error: 'Gagal membuat RM. Terjadi duplikasi, coba simpan lagi.' }, { status: 409 });
        }
        console.error("Gagal membuat data pasien:", error);
        return NextResponse.json({ error: 'Gagal membuat data pasien baru' }, { status: 500 });
    }
}
