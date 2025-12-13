import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth-helper';

// Fungsi untuk memperbarui data pengguna
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    // 1. Verifikasi Akses
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // 2. Validasi ID
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { fullName, email, password, roleId } = body;
        const dataToUpdate: any = {};

        // 3. Persiapan Data Update
        if (fullName) dataToUpdate.fullName = fullName;
        if (email) dataToUpdate.email = email;
        if (roleId) dataToUpdate.roleId = Number(roleId);
        
        // Hash password jika ada perubahan
        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        // 4. Update ke Database
        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

        // Hapus password dari respons
        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
        
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
        }
        console.error('Error PUT User:', error);
        return NextResponse.json({ error: 'Gagal memperbarui data pengguna' }, { status: 500 });
    }
}

// Fungsi untuk menghapus pengguna
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    // 1. Verifikasi Akses
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || decodedToken.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // 2. Validasi ID (Baris 52 di error log lama)
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return NextResponse.json({ error: 'ID User tidak valid' }, { status: 400 });
    }
    
    // 3. Pencegahan Self-Delete (Telah di-fix untuk perbandingan tipe data)
    // ID di token biasanya string, ID dari params (id) adalah number.
    if (Number(decodedToken.userId) === id) { 
        return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' }, { status: 400 });
    }

    try {
        // 4. Delete dari Database
        await prisma.user.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.code === 'P2025') {
            // Error P2025: Record to delete does not exist
            return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
        }
        console.error('Error DELETE User:', error);
        return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
    }
}