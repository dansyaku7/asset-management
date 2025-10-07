import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET: Ambil semua roles
export async function GET(request: NextRequest) {
  // Cek otorisasi, pastikan user sudah login
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
  }

  try {
    const roles = await prisma.role.findMany();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Gagal mengambil data roles:", error);
    return NextResponse.json({ error: 'Gagal mengambil data roles' }, { status: 500 });
  }
}

