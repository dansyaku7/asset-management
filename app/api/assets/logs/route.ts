// File: app/api/asset/logs/route.ts (Lokasi Baru)

import { NextResponse } from 'next/server';
import { getLatestAssetLogs } from '@/lib/data';

export async function GET() {
  try {
    const logs = await getLatestAssetLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}