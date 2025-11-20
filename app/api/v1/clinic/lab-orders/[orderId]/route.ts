// File: app/api/v1/clinic/lab-orders/[orderId]/route.ts
// (REVISI - Include RadiologyImages)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

type Params = {
  params: { orderId: string };
};

export async function GET(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const orderId = parseInt(params.orderId);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID Order tidak valid' }, { status: 400 });
    }

    const labOrder = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        medicalRecord: {
          include: {
            patient: true,
          },
        },
        labService: {
          include: {
            parameters: {
              include: {
                parameter: {
                  include: {
                    normalRanges: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' }
            },
          },
        },
        results: {
          include: {
            labParameter: true, 
          },
          orderBy: {
            labParameter: { name: 'asc' }
          }
        },
        validator: {
          include: {
            user: {
              select: { fullName: true } 
            }
          }
        },
        // --- TAMBAHAN BARU ---
        radiologyImages: {
          orderBy: {
            uploadedAt: 'asc' // Ambil gambar radiologi
          }
        }
        // --- AKHIR TAMBAHAN ---
      },
    });

    if (!labOrder) {
      return NextResponse.json({ error: 'Order Lab tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(labOrder);
  } catch (error) {
    console.error("Gagal mengambil detail order lab:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}