// File: app/api/v1/clinic/lab-orders/route.ts
// (REVISI - Untuk Meja Kerja Lab)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Appointment } from '@prisma/client';

export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');

  if (!branchId) {
    return NextResponse.json({ error: 'Parameter branchId wajib ada' }, { status: 400 });
  }

  try {
    // Cari semua appointment yang ada di cabang ini
    const appointmentsInBranch = await prisma.appointment.findMany({
      where: { branchId: parseInt(branchId) },
      select: { id: true }
    });
    const appointmentIds = appointmentsInBranch.map((appt: Appointment) => appt.id);
    
    // Cari semua medical record dari appointment tsb
    const medicalRecords = await prisma.medicalRecord.findMany({
        where: {
            // Logikanya, sebuah medical record terikat ke patient, dan patient bisa visit
            // ke banyak appointment. Kita filter berdasarkan appointment di branch ini.
            // Asumsi: 1 visit RME = 1 appointment.
            // Jika RME tidak terikat langsung ke appointment,
            // maka filternya harus lewat `patient.registeredAtBranchId`.
            // Kita pakai filter yang lebih akurat: lewat appointment.
            // Sayangnya skema RME tidak link ke appointment, jadi kita filter lewat patient.
        },
        include: {
            patient: true // Ambil patient
        }
    });

    // Filter patient yang terdaftar di branch ini
    const patientsInBranch = medicalRecords
      .filter(mr => mr.patient.branchId === parseInt(branchId))
      .map(mr => mr.patientId);

    // Cari semua medical record ID dari pasien yang terdaftar di cabang ini
    const medicalRecordIds = (await prisma.medicalRecord.findMany({
        where: { patientId: { in: patientsInBranch } },
        select: { id: true }
    })).map(mr => mr.id);


    const labOrders = await prisma.labOrder.findMany({
      where: {
        // Filter berdasarkan medical record yang pasiennya terdaftar di cabang ini
        medicalRecordId: { in: medicalRecordIds }
      },
      include: {
        labService: true, // Info jenis pemeriksaan
        medicalRecord: {
          include: {
            patient: true, // Info pasien
          }
        }
      },
      orderBy: {
        orderDate: 'desc' // Tampilkan order terbaru dulu
      }
    });

    return NextResponse.json(labOrders);
  } catch (error) {
    console.error("Gagal mengambil data order lab:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}