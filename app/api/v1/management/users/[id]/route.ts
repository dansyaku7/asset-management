// File: app/api/v1/management/users/[id]/route.ts (LOKASI BARU)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth-helper';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { fullName, email, password, roleId } = body;
        const dataToUpdate: any = {};

        if (fullName) dataToUpdate.fullName = fullName;
        if (email) dataToUpdate.email = email;
        if (roleId) dataToUpdate.roleId = Number(roleId);
        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Gagal memperbarui data pengguna' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
    }
    
    // Jangan biarkan SUPER_ADMIN menghapus dirinya sendiri
    if (decodedToken.userId === id) {
        return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' }, { status: 400 });
    }

    try {
        await prisma.user.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
    }
}
