import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';

// Membuat ID unik untuk nama file agar tidak bentrok
const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
);

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const file = request.body;
  const filename = searchParams.get('filename') || 'asset-image.jpg';
  
  if (!file) {
    return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 });
  }

  // Ambil ekstensi file
  const extension = filename.split('.').pop() || 'jpg';
  // Buat nama file baru yang unik
  const uniqueFilename = `${nanoid()}.${extension}`;

  try {
    const blob = await put(uniqueFilename, file, {
      access: 'public',
    });
    
    // Kembalikan URL publik dari file yang di-upload
    return NextResponse.json(blob);

  } catch (error: any) {
    return NextResponse.json({ message: `Gagal mengunggah file: ${error.message}` }, { status: 500 });
  }
}
