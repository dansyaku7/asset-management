// File: app/api/v1/management/employees/route.ts
// Versi ini menangani pembuatan USER dan EMPLOYEE dalam satu POST request.

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from "bcryptjs";
import { verifyAuth } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const employees = await prisma.employee.findMany({
            include: {
                user: { select: { id: true, fullName: true, email: true, role: true } },
                branch: { select: { name: true } },
            },
            orderBy: { hireDate: 'desc' },
        });

        return NextResponse.json(employees);
    } catch (error) {
        console.error("Gagal mengambil data pegawai:", error);
        return NextResponse.json({ error: 'Gagal mengambil data pegawai' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Menerima semua data User + Employee
        const { fullName, email, password, roleId, position, hireDate, branchId } = body;

        if (!fullName || !email || !password || !roleId || !position || !hireDate || !branchId) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }
        
        // --- TRANSAKSI UTAMA: Buat User dan Employee ---
        const newEmployee = await prisma.$transaction(async (tx) => {
            // 1. Buat User baru
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await tx.user.create({
                data: {
                    fullName,
                    email,
                    password: hashedPassword,
                    roleId: Number(roleId),
                },
            });

            // 2. Buat Employee baru yang terikat ke User baru
            const employee = await tx.employee.create({
                data: {
                    userId: newUser.id,
                    position,
                    hireDate: new Date(hireDate),
                    branchId: Number(branchId),
                    isActive: true,
                },
            });

            return employee;
        });

        return NextResponse.json(newEmployee, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes("email")) {
            return NextResponse.json({ error: 'Email sudah terdaftar. Silakan gunakan email lain.' }, { status: 409 });
        }
        console.error("Gagal membuat data pegawai:", error);
        return NextResponse.json({ error: 'Gagal membuat data pegawai baru' }, { status: 500 });
    }
}
