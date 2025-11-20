// File: app/api/v1/clinic/lab-orders/[orderId]/validate/route.ts
// (API BARU untuk tombol 'Validasi')

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

type Params = {
  params: { orderId: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  const orderId = parseInt(params.orderId);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'ID Order tidak valid' }, { status: 400 });
  }

  try {
    const body: { interpretation: string } = await request.json();
    const { interpretation } = body;

    if (!interpretation) {
      return NextResponse.json({ error: 'Interpretasi wajib diisi' }, { status: 400 });
    }

    // Cari ID Karyawan (Dokter) berdasarkan ID User yang login
    const employee = await prisma.employee.findUnique({
      where: { userId: decodedToken.userId },
      select: { id: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Hanya karyawan (dokter) yang bisa memvalidasi' }, { status: 403 });
    }

    const order = await prisma.labOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }
    if (order.status !== 'PENDING_VALIDATION') {
      return NextResponse.json({ error: 'Hanya order yang PENDING_VALIDATION yang bisa divalidasi' }, { status: 409 });
    }

    // Update Ordernya
    const validatedOrder = await prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        interpretation: interpretation,
        validatorId: employee.id, // <-- ID Dokter yang login
        validatedAt: new Date(),
      }
    });

    return NextResponse.json(validatedOrder, { status: 200 });

  } catch (error: any) {
    console.error("Gagal memvalidasi hasil lab:", error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan data' }, { status: 500 });
  }
}