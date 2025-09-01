// app/api/assets/users/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        fullName: true 
      },
      orderBy: { 
        fullName: 'asc' 
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Gagal mengambil data user:", error);
    return NextResponse.json(
        { message: "Terjadi kesalahan saat mengambil data user" }, 
        { status: 500 }
    );
  }
}