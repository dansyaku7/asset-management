import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

type Params = { params: { id: string } };

// PUT: Update Role
export async function PUT(request: NextRequest, { params }: Params) {
  const decodedToken = await verifyAuth(request);
  if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

  // SECURITY PATCH
  if (decodedToken.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Akses terlarang.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, permissionIds } = body;
    const roleId = parseInt(params.id);

    if (isNaN(roleId)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    // Transaction biar aman (hapus permission lama, tambah yang baru)
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Update nama
      await tx.role.update({
        where: { id: roleId },
        data: { name },
      });

      // Hapus permission lama
      await tx.rolePermission.deleteMany({
        where: { roleId: roleId },
      });

      // Tambah permission baru (kalau ada)
      if (permissionIds && (permissionIds as number[]).length > 0) {
        await tx.rolePermission.createMany({
          data: (permissionIds as number[]).map(pId => ({
            roleId: roleId,
            permissionId: pId,
          })),
        });
      }
      
      return tx.role.findUnique({ 
        where: { id: roleId },
        include: { permissions: true }
      });
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: 'Gagal memperbarui role' }, { status: 500 });
  }
}

// DELETE: Hapus Role
export async function DELETE(request: NextRequest, { params }: Params) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    // SECURITY PATCH
    if (decodedToken.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses terlarang.' }, { status: 403 });
    }

    try {
        const roleId = parseInt(params.id);
        if (isNaN(roleId)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

        // Cek jangan sampe hapus role SUPER_ADMIN sendiri (Safety Net)
        const roleToDelete = await prisma.role.findUnique({ where: { id: roleId } });
        if (roleToDelete?.name === 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Role SUPER_ADMIN tidak boleh dihapus!' }, { status: 400 });
        }

        // Hapus relasi dulu (RolePermission)
        await prisma.rolePermission.deleteMany({ where: { roleId: roleId } });
        
        // Baru hapus role-nya
        await prisma.role.delete({ where: { id: roleId } });
        
        return NextResponse.json({ message: 'Role berhasil dihapus' });
    } catch (error) {
        // P2003 = Foreign Key Constraint (Masih ada user yang pake role ini)
        return NextResponse.json({ error: 'Gagal menghapus role. Pastikan tidak ada user yang menggunakan role ini.' }, { status: 500 });
    }
}