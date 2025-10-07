import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth-helper'; // Pastikan path ini benar

// PUT: Update data user berdasarkan ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Cek otorisasi
  const decodedToken = await verifyAuth(request);
  if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak: Hanya Super Admin' }, { status: 403 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { fullName, email, password, roleId } = body;

    // Data yang akan diupdate
    const dataToUpdate: any = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (email) dataToUpdate.email = email;
    if (roleId) dataToUpdate.roleId = Number(roleId);

    // 2. Jika ada password baru, hash dulu. Jika tidak, jangan update password.
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    // 3. Jangan kirim balik password hash
    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);

  } catch (error: any) {
    // Tangani error jika email duplikat
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }
    console.error(`Gagal update user ID ${id}:`, error);
    return NextResponse.json({ error: 'Gagal memperbarui data pengguna' }, { status: 500 });
  }
}

// DELETE: Hapus user berdasarkan ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Cek otorisasi
  const decodedToken = await verifyAuth(request);
  if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Akses ditolak: Hanya Super Admin' }, { status: 403 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
    // 2. Kirim respon berhasil tanpa konten
    return new NextResponse(null, { status: 204 }); 
  } catch (error: any) {
    // Tangani error jika user tidak ditemukan
     if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    console.error(`Gagal hapus user ID ${id}:`, error);
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
  }
}
