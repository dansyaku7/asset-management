import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// GET: Ambil semua Roles (Hanya Super Admin yang boleh liat struktur role biar aman)
export async function GET(request: NextRequest) {
  // 1. Cek Login
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Akses ditolak. Silakan login.' }, { status: 401 });
  }

  // 2. CEK ROLE (SECURITY PATCH) - Biar dokter/kasir gabisa intip struktur role
  if (decodedToken.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Akses terlarang. Hanya Super Admin.' }, { status: 403 });
  }

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: 'Gagal mengambil data roles' }, { status: 500 });
  }
}

// POST: Buat Role Baru (CRITICAL SECURITY AREA)
export async function POST(request: NextRequest) {
  // 1. Cek Login
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Akses ditolak. Silakan login.' }, { status: 401 });
  }

  // 2. CEK ROLE (SECURITY PATCH) - Mencegah Privilege Escalation
  // Tanpa ini, user biasa bisa bikin role "DEWA" pake Postman
  if (decodedToken.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Akses terlarang. Anda tidak memiliki izin membuat Role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, permissionIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nama role wajib diisi' }, { status: 400 });
    }

    // Cek duplikat nama role
    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return NextResponse.json({ error: 'Nama role sudah digunakan' }, { status: 409 });
    }

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
    console.error("Error creating role:", error);
    return NextResponse.json({ error: 'Gagal membuat role' }, { status: 500 });
  }
}