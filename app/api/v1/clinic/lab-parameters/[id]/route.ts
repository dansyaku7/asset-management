// File: app/api/v1/clinic/lab-parameters/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

type Params = {
  params: { id: string };
};

// GET single LabParameter (untuk dialog Nilai Normal)
export async function GET(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const parameter = await prisma.labParameter.findUnique({
      where: { id: parseInt(params.id) },
      include: { normalRanges: { orderBy: { ageMin: 'asc' } } },
    });
    if (!parameter) return NextResponse.json({ error: 'Parameter tidak ditemukan' }, { status: 404 });
    return NextResponse.json(parameter);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// PUT (Update) LabParameter
export async function PUT(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, unit } = body;
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    const updatedParameter = await prisma.labParameter.update({
      where: { id: parseInt(params.id) },
      data: { name, unit: unit || null },
    });
    return NextResponse.json(updatedParameter);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui data' }, { status: 500 });
  }
}

// DELETE LabParameter
export async function DELETE(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    // Hapus relasi di tabel penghubung M2M dulu
    await prisma.labServiceParameter.deleteMany({
      where: { parameterId: parseInt(params.id) },
    });
    // Hapus nilai normal
    await prisma.labParameterRange.deleteMany({
      where: { parameterId: parseInt(params.id) },
    });
    // Hapus parameter utamanya
    await prisma.labParameter.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ message: 'Parameter berhasil dihapus' });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}