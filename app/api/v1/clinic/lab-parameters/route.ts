// File: app/api/v1/clinic/lab-parameters/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET all LabParameters
export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const parameters = await prisma.labParameter.findMany({
      include: {
        normalRanges: true, // Sertakan data nilai normal
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(parameters);
  } catch (error) {
    console.error("Gagal mengambil data parameter:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// POST new LabParameter
export async function POST(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, unit } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nama parameter wajib diisi' }, { status: 400 });
    }

    const newParameter = await prisma.labParameter.create({
      data: {
        name,
        unit: unit || null,
      },
    });
    return NextResponse.json(newParameter, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat parameter:", error);
    return NextResponse.json({ error: 'Gagal membuat data' }, { status: 500 });
  }
}