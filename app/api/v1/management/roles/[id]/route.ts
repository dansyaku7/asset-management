// File: app/api/v1/management/roles/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

type Params = { params: { id: string } };

// PUT (Update) Role
export async function PUT(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, permissionIds } = body;
    const roleId = parseInt(params.id);

    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    const updatedRole = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: { name },
      });
      await tx.rolePermission.deleteMany({
        where: { roleId: roleId },
      });
      if (permissionIds && (permissionIds as number[]).length > 0) {
        await tx.rolePermission.createMany({
          data: (permissionIds as number[]).map(pId => ({
            roleId: roleId,
            permissionId: pId,
          })),
        });
      }
      return tx.role.findUnique({ where: { id: roleId } });
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui role' }, { status: 500 });
  }
}

// DELETE Role
export async function DELETE(request: NextRequest, { params }: Params) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const roleId = parseInt(params.id);
        // Hapus relasi dulu
        await prisma.rolePermission.deleteMany({ where: { roleId: roleId } });
        // Hapus role-nya
        await prisma.role.delete({ where: { id: roleId } });
        return NextResponse.json({ message: 'Role berhasil dihapus' });
    } catch (error) {
        return NextResponse.json({ error: 'Gagal menghapus role. Pastikan tidak ada user yang terhubung.' }, { status: 500 });
    }
}