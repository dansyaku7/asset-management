// File: app/api/v1/upload/radiology/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Pastikan direktori ada
const uploadDir = join(process.cwd(), 'public', 'uploads', 'radiology');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ error: 'Tidak ada file yang di-upload' }, { status: 400 });
  }

  // Cek tipe file (opsional tapi disarankan)
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Hanya file gambar yang diizinkan' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Buat nama file unik
  const extension = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;
  const filepath = join(uploadDir, filename);

  try {
    // Tulis file ke direktori
    await writeFile(filepath, buffer);

    // Kembalikan URL publiknya
    const publicUrl = `/uploads/radiology/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl }, { status: 201 });

  } catch (error) {
    console.error("Gagal menyimpan file:", error);
    return NextResponse.json({ error: 'Gagal menyimpan file' }, { status: 500 });
  }
}