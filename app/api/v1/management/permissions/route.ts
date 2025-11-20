// File: app/api/v1/management/permissions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET all Permissions
export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { action: 'asc' },
    });
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data permissions' }, { status: 500 });
  }
}