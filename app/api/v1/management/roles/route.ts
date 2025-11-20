// File: app/api/v1/management/roles/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET all Roles
export async function GET(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data roles' }, { status: 500 });
  }
}

// POST new Role
export async function POST(request: NextRequest) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, permissionIds } = body;

    if (!name) return NextResponse.json({ error: 'Nama role wajib diisi' }, { status: 400 });

    const newRole = await prisma.role.create({
      data: {
        name,
        permissions: {
          create: (permissionIds as number[] || []).map(id => ({
            permission: { connect: { id: id } },
          })),
        },
      },
    });
    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat role' }, { status: 500 });
  }
}