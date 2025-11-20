// File: app/api/v1/clinic/lab-services/route.ts
// (REVISI - Langkah 3)
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { LabServiceCategory } from '@prisma/client';

// GET all LabServices (DIMODIFIKASI: include parameters)
export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const services = await prisma.labService.findMany({
      include: {
        parameters: { // <--- INCLUDE RELASI M2M
          include: {
            parameter: true, // Ambil data master parameternya
          },
          orderBy: {
            parameter: { name: 'asc' } // Urutkan parameter by name
          }
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Gagal mengambil data layanan:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// POST new LabService (DIMODIFIKASI: handle parameterIds)
export async function POST(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, category, price, parameterIds } = body;

    if (!name || !category || !price) {
      return NextResponse.json({ error: 'Nama, Kategori, dan Harga wajib diisi' }, { status: 400 });
    }

    const newService = await prisma.labService.create({
      data: {
        name,
        category: category as LabServiceCategory,
        price: parseFloat(price),
        // --- Ini bagian barunya ---
        parameters: {
          create: (parameterIds as number[] || []).map(id => ({
            parameter: {
              connect: { id: id },
            },
          })),
        },
        // -------------------------
      },
    });
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat layanan:", error);
    return NextResponse.json({ error: 'Gagal membuat data' }, { status: 500 });
  }
}