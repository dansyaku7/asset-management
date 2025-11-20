// File: app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma"; // <-- PERBAIKAN: Import dari file singleton

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email dan password harus diisi" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Email tidak ditemukan" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Password salah" }, { status: 401 });
    }

    // Ambil daftar 'action' dari permissions
    const permissions = user.role.permissions.map(
      (p) => p.permission.action
    );

    const tokenPayload = {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      permissions: permissions, // <-- Masukkan permissions ke token
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: "8h", // Perpanjang durasi token
    });

    return NextResponse.json({
      message: "Login berhasil",
      token,
      user: tokenPayload, // Kirim payload token sebagai data user
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}