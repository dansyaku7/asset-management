// File: lib/auth-helper.ts

import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// Definisikan tipe data untuk payload token agar lebih aman
interface DecodedToken {
  userId: number;
  role: string;
  iat: number;
  exp: number;
}

export const verifyAuth = async (
  req: NextRequest
): Promise<DecodedToken | null> => {
  // 1. Ambil token dari header 'Authorization'
  const authHeader = req.headers.get("authorization");

  // 2. Cek apakah header ada dan formatnya benar ("Bearer ...")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Token tidak ada atau formatnya salah.");
    return null;
  }

  // 3. Ekstrak token dari header
  const token = authHeader.split(" ")[1];

  if (!token) {
    console.error("String token kosong setelah di-split.");
    return null;
  }

  // 4. Verifikasi token menggunakan secret key
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error("Verifikasi token gagal:", error);
    return null;
  }
};