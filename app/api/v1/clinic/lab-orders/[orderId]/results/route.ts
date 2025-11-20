// File: app/api/v1/clinic/lab-orders/[orderId]/results/route.ts
// (REVISI - Simpan Hasil Teks + Gambar Radiologi)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { LabParameterRange, Patient, Gender } from '@prisma/client';

type Params = {
  params: { orderId: string };
};

// --- Helper untuk cek nilai normal ---
const getAgeInDays = (dob: string | Date): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const findNormalRange = (
  ranges: LabParameterRange[], 
  patientAgeInDays: number, 
  patientGender: Gender
): LabParameterRange | null => {
  if (!ranges || ranges.length === 0) return null;
  
  // 1. Coba cari yang spesifik gender
  let matchingRange = ranges.find(r => 
    r.gender === patientGender &&
    patientAgeInDays >= r.ageMin &&
    patientAgeInDays <= r.ageMax
  );
  if (matchingRange) return matchingRange;

  // 2. Kalo gak nemu, cari yang 'null' (berlaku untuk semua gender)
  matchingRange = ranges.find(r => 
    r.gender === null &&
    patientAgeInDays >= r.ageMin &&
    patientAgeInDays <= r.ageMax
  );
  return matchingRange || null;
};

// Fungsi helper untuk cek abnormal
const checkIsAbnormal = (
  valueStr: string, 
  normalRange: LabParameterRange | null
): boolean => {
  if (!normalRange) return false; // Jika tidak ada range, anggap tidak abnormal

  // 1. Cek Tipe Kualitatif (teks)
  if (normalRange.normalText) {
    // Jika nilai normalnya "Negatif", dan user input "Positif", maka Abnormal
    return valueStr.toLowerCase() !== normalRange.normalText.toLowerCase();
  }

  // 2. Cek Tipe Kuantitatif (angka)
  const value = parseFloat(valueStr);
  if (isNaN(value)) return false; // Jika user input teks di form angka, anggap tidak abnormal
  
  const min = normalRange.normalValueMin;
  const max = normalRange.normalValueMax;

  if (min !== null && max !== null) {
    return value < min || value > max;
  }
  if (min !== null) {
    return value < min;
  }
  if (max !== null) {
    return value > max;
  }

  return false; // Tidak ada kriteria
};
// --- Akhir Helper ---

// POST: Simpan hasil Lab (REVISI)
export async function POST(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  const orderId = parseInt(params.orderId);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'ID Order tidak valid' }, { status: 400 });
  }

  try {
    // Tipe body di-update
    const body: { 
      results: { labParameterId: number; value: string }[];
      imageUrls?: string[]; // <-- TAMBAHAN
    } = await request.json();

    if (!body.results || body.results.length === 0) {
      // Untuk radiologi, 'results' (teks interpretasi) mungkin boleh kosong
      // Tapi kita tetapkan minimal harus ada 1 parameter teks (misal 'Kesan')
      // Jadi kita biarkan validasi ini
      return NextResponse.json({ error: 'Data hasil (teks) tidak boleh kosong' }, { status: 400 });
    }

    // 1. Ambil data penting (Pasien)
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        medicalRecord: { include: { patient: true } },
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }
    if (order.status !== 'ORDERED') {
      return NextResponse.json({ error: 'Order ini sudah diproses' }, { status: 409 });
    }

    const patient = order.medicalRecord.patient;
    const patientAgeInDays = getAgeInDays(patient.dateOfBirth);
    const patientGender = patient.gender;

    // 2. Gunakan Transaksi
    await prisma.$transaction(async (tx) => {
      
      const resultsToCreate = [];

      for (const result of body.results) {
        // Ambil master parameter & nilai normalnya
        const parameter = await tx.labParameter.findUnique({
          where: { id: result.labParameterId },
          include: { normalRanges: true }
        });

        if (!parameter) {
          throw new Error(`Parameter dengan ID ${result.labParameterId} tidak ditemukan`);
        }

        // Tentukan nilai normal yang sesuai
        const normalRange = findNormalRange(parameter.normalRanges, patientAgeInDays, patientGender);
        
        // Cek apakah hasilnya abnormal
        const isAbnormal = checkIsAbnormal(result.value, normalRange);

        // Siapkan data untuk create
        resultsToCreate.push({
          labOrderId: orderId,
          labParameterId: result.labParameterId,
          value: result.value,
          isAbnormal: isAbnormal,
        });
      }

      // 3. Simpan semua hasil Teks
      await tx.labResult.createMany({
        data: resultsToCreate,
      });

      // 4. --- TAMBAHAN BARU: Simpan Gambar Radiologi ---
      if (body.imageUrls && body.imageUrls.length > 0) {
        await tx.radiologyImage.createMany({
          data: body.imageUrls.map(url => ({
            labOrderId: orderId,
            imageUrl: url,
            description: "Gambar Radiologi" // Deskripsi default
          }))
        });
      }
      // --- AKHIR TAMBAHAN ---

      // 5. Update status order utama
      await tx.labOrder.update({
        where: { id: orderId },
        data: {
          status: 'PENDING_VALIDATION', // <-- Status berubah!
        },
      });
    });

    return NextResponse.json({ message: 'Hasil lab berhasil disimpan' }, { status: 201 });

  } catch (error: any) {
    console.error("Gagal menyimpan hasil lab:", error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan data' }, { status: 500 });
  }
}