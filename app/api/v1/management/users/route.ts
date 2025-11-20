// File: app/api/v1/management/users/route.ts (LOKASI BARU)

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAuth } from "@/lib/auth-helper";

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    // Kita asumsikan hanya SUPER_ADMIN yang bisa lihat semua user
    if (!decodedToken || decodedToken.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Gagal mengambil data pengguna" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || decodedToken.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { fullName, email, password, roleId } = body;

        if (!fullName || !email || !password || !roleId) {
            return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                fullName,
                email,
                password: hashedPassword,
                roleId: Number(roleId),
            },
        });

        const { password: _, ...userWithoutPassword } = newUser;
        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
        }
        return NextResponse.json({ error: "Gagal membuat pengguna baru" }, { status: 500 });
    }
}
