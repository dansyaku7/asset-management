// File: app/api/v1/clinic/lab-services/[id]/route.ts
// (VERSI LENGKAP - SUDAH DIPERBAIKI LOGIKA UPDATE/PUT)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { LabServiceCategory } from '@prisma/client';

type Params = {
  params: { id: string };
};

// GET single LabService (Untuk fetch data saat edit, walau di frontend kita tidak pakai)
export async function GET(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const service = await prisma.labService.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        parameters: { 
          include: { 
            parameter: true 
          } 
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 404 });
    }
    
    return NextResponse.json(service);
  } catch (error) {
    console.error("Gagal mengambil data layanan:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// PUT (Update) LabService (LOGIKA M2M SUDAH DIPERBAIKI)
export async function PUT(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, category, price, parameterIds } = body;
    const serviceId = parseInt(params.id);

    if (!name || !category || !price) {
      return NextResponse.json({ error: 'Nama, Kategori, dan Harga wajib diisi' }, { status: 400 });
    }

    // Gunakan transaksi agar aman saat update relasi M2M
    const updatedService = await prisma.$transaction(async (tx) => {
      
      // 1. Update data dasarnya (nama, harga, dll)
      const service = await tx.labService.update({
        where: { id: serviceId },
        data: {
          name,
          category: category as LabServiceCategory,
          price: parseFloat(price),
        },
      });

      // 2. Hapus semua relasi parameter yang lama
      await tx.labServiceParameter.deleteMany({
        where: { serviceId: serviceId },
      });

      // 3. Buat relasi parameter yang baru (jika ada)
      if (parameterIds && (parameterIds as number[]).length > 0) {
        await tx.labServiceParameter.createMany({
          data: (parameterIds as number[]).map(paramId => ({
            serviceId: serviceId,
            parameterId: paramId,
          })),
        });
      }
      
      // Kembalikan data service yang sudah di-update
      return service;
    });

    return NextResponse.json(updatedService);

  } catch (error: any) {
    // Tangkap error P2002 (Unique constraint) jika ganti nama jadi nama yg sudah ada
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Nama layanan ini sudah ada' }, { status: 409 });
    }
    console.error("Gagal update layanan:", error);
    return NextResponse.json({ error: 'Gagal memperbarui data' }, { status: 500 });
  }
}

// DELETE LabService (Sudah benar dari awal)
export async function DELETE(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const serviceId = parseInt(params.id);

    // Hapus relasi di tabel penghubung M2M dulu
    await prisma.labServiceParameter.deleteMany({
      where: { serviceId: serviceId },
    });

    // Hapus layanan utamanya
    await prisma.labService.delete({
      where: { id: serviceId },
    });
    
    return NextResponse.json({ message: 'Layanan berhasil dihapus' });
  } catch (error) {
    console.error("Gagal hapus layanan:", error)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}