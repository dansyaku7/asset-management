// File: app/api/v1/clinic/lab-parameters/[id]/ranges/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Gender } from '@prisma/client';

type Params = {
  params: { id: string }; // Ini adalah parameterId
};

// POST new LabParameterRange (Nilai Normal)
export async function POST(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const parameterId = parseInt(params.id);
    const body = await request.json();

    const {
      gender, ageMin, ageMax, normalValueMin, normalValueMax, normalText
    } = body;

    // Validasi dasar
    if (!ageMin || !ageMax) {
      return NextResponse.json({ error: 'Umur Min dan Max wajib diisi' }, { status: 400 });
    }
    if (!normalValueMin && !normalValueMax && !normalText) {
      return NextResponse.json({ error: 'Isi nilai normal (Min/Max) atau Teks Normal' }, { status: 400 });
    }

    const newRange = await prisma.labParameterRange.create({
      data: {
        parameterId: parameterId,
        gender: gender || null, // 'MALE', 'FEMALE', atau null
        ageMin: parseInt(ageMin),
        ageMax: parseInt(ageMax),
        normalValueMin: normalValueMin ? parseFloat(normalValueMin) : null,
        normalValueMax: normalValueMax ? parseFloat(normalValueMax) : null,
        normalText: normalText || null,
      },
    });
    return NextResponse.json(newRange, { status: 201 });
  } catch (error) {
    console.error("Gagal menambah nilai normal:", error);
    return NextResponse.json({ error: 'Gagal membuat data' }, { status: 500 });
  }
}