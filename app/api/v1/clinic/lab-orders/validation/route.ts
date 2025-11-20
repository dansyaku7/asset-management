// File: app/api/v1/clinic/lab-orders/validation/route.ts
// (API BARU untuk Meja Kerja Validasi)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { LabOrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');

  if (!branchId) {
    return NextResponse.json({ error: 'Parameter branchId wajib ada' }, { status: 400 });
  }

  try {
    // Logika filter branch, kita ambil dari skema `Patient`
    const labOrders = await prisma.labOrder.findMany({
      where: {
        // Filter berdasarkan status
        status: { in: ['PENDING_VALIDATION', 'COMPLETED'] }, 
        
        // Filter berdasarkan cabang
        medicalRecord: {
          patient: {
            branchId: parseInt(branchId) // Asumsi dokter di cabang X hanya validasi pasien cabang X
          }
        }
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
        orderDate: 'desc'
      }
    });

    return NextResponse.json(labOrders);
  } catch (error) {
    console.error("Gagal mengambil data validasi lab:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}