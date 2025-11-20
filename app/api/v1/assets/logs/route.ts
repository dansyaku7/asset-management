// File: app/api/v1/assets/logs/route.ts
// Versi perbaikan yang mengambil data lebih lengkap dan efisien

import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Ambil 5 log aktivitas terakhir
    const logs = await prisma.assetLog.findMany({
        take: 5, // Batasi hanya 5 data terbaru
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            // Sertakan data aset yang terkait dengan log
            asset: {
                select: {
                    productName: true,
                },
            },
            // Sertakan data user yang mencatat log
            recordedBy: {
                select: {
                    fullName: true,
                },
            },
        },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Gagal mengambil data log aset:", error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
