// File: app/api/v1/clinic/drugs/stock/route.ts
// PERBAIKAN: Mengizinkan akses oleh Super Admin, Dokter, dan Staff

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';

// Daftar role yang diizinkan untuk melihat/mengelola stok
const allowedRoles = ['SUPER_ADMIN', 'FARMASI', 'DOKTER', 'STAFF', 'KASIR', 'ADMIN'];

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 }); }

    // Pengecekan izin untuk GET
    if (!allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak. Anda tidak memiliki izin.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchIdParam = searchParams.get('branchId');
    const branchId = branchIdParam ? parseInt(branchIdParam, 10) : undefined;
    
    try {
        const stockData = await prisma.drugStock.findMany({
            where: branchId ? { branchId } : undefined,
            include: {
                drug: { select: { name: true, unit: true } },
                branch: { select: { name: true } }
            },
            orderBy: { expiryDate: 'asc' },
        });

        const aggregatedStock: { [key: string]: any } = {};
        stockData.forEach(item => {
            const key = `${item.drugId}-${item.branchId}`;
            if (!aggregatedStock[key]) {
                aggregatedStock[key] = {
                    drugId: item.drugId,
                    drugName: item.drug.name,
                    unit: item.drug.unit,
                    branchId: item.branchId,
                    branchName: item.branch.name,
                    totalQuantity: 0,
                    batches: [],
                };
            }
            aggregatedStock[key].totalQuantity += item.quantity;
            aggregatedStock[key].batches.push({
                quantity: item.quantity,
                expiryDate: item.expiryDate,
                stockId: item.id,
            });
        });

        return NextResponse.json(Object.values(aggregatedStock));
    } catch (error) {
        console.error("Gagal mengambil data stok obat:", error);
        return NextResponse.json({ error: 'Gagal mengambil data stok obat' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 }); }
    
    // Pengecekan izin untuk POST
    if (!allowedRoles.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk menambah stok.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { drugId, branchId, quantity, expiryDate } = body;

        if (!drugId || !branchId || !quantity || !expiryDate) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }

        const newStock = await prisma.drugStock.create({
            data: {
                drugId: Number(drugId),
                branchId: Number(branchId),
                quantity: Number(quantity),
                expiryDate: new Date(expiryDate),
            },
        });

        return NextResponse.json(newStock, { status: 201 });
    } catch (error) {
        console.error("Gagal menambah stok obat:", error);
        return NextResponse.json({ error: 'Gagal menambah stok obat' }, { status: 500 });
    }
}
