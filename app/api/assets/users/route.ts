// File: app/api/assets/users/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAuth } from "@/lib/auth-helper"; // Pastikan path ini benar

// GET: Mengambil semua data pengguna
export async function GET(request: NextRequest) {
  // 1. Cek otorisasi
  const decodedToken = await verifyAuth(request);
  if (!decodedToken || decodedToken.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Super Admin" },
      { status: 403 }
    );
  }

  try {
    // 2. Ambil semua user dari database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Gagal mengambil data pengguna:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pengguna" },
      { status: 500 }
    );
  }
}

// POST: Membuat pengguna baru
export async function POST(request: NextRequest) {
  // 1. Cek otorisasi
  const decodedToken = await verifyAuth(request);
  if (!decodedToken || decodedToken.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Super Admin" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { fullName, email, password, roleId } = body;

    if (!fullName || !email || !password || !roleId) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    // 2. Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        roleId: Number(roleId),
      },
    });

    // 3. Jangan kirim balik password hash
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    // Tangani error jika email duplikat
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }
    console.error("Gagal membuat pengguna:", error);
    return NextResponse.json(
      { error: "Gagal membuat pengguna baru" },
      { status: 500 }
    );
  }
}