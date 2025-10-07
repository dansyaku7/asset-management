// File: app/api/auth/verify/route.ts

import { NextResponse, NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth-helper";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Coba verifikasi token yang dikirim dari client
  const decodedToken = await verifyAuth(req);

  // Jika token tidak valid atau tidak ada, kirim error
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ isValid: false, message: "Sesi tidak valid." }, { status: 401 });
  }

  try {
    // Cek apakah user dengan ID dari token itu benar-benar ada di database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: { id: true, fullName: true, email: true, role: { select: { name: true } } }
    });

    if (!user) {
        return NextResponse.json({ isValid: false, message: "User tidak ditemukan." }, { status: 404 });
    }

    // Jika token valid dan user ada, kirim data user
    return NextResponse.json({ isValid: true, user });

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ isValid: false, message: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
