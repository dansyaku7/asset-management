// File: app/api/v1/accounting/journal-entries/route.ts
// PERBAIKAN: Memperbaiki typo 'search_params' menjadi 'searchParams'

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { JournalType } from '@prisma/client';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId'); // 'all' or specific ID
    const startDate = searchParams.get('startDate');
    // VVVV--- PERBAIKAN DI SINI ---VVVV
    const endDate = searchParams.get('endDate');
    // ^^^^--- PERBAIKAN DI SINI ---VVVV

    // Siapkan filter where
    let whereClause: any = {};

    // Filter cabang
    if (branchId && branchId !== 'all') {
        const branchIdNum = parseInt(branchId, 10);
        if (!isNaN(branchIdNum)) {
            whereClause.branchId = branchIdNum;
        }
    }

    // Filter tanggal
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.transactionDate = { gte: start, lte: end };
    }

    try {
        const journals = await prisma.journalEntry.findMany({
            where: whereClause,
            include: {
                branch: { select: { name: true } },
                items: {
                    include: {
                        chartOfAccount: { select: { accountCode: true, accountName: true } }
                    },
                    orderBy: { type: 'desc' } // Debit dulu baru Kredit
                }
            },
            orderBy: {
                createdAt: 'desc' // Urutkan berdasarkan waktu pembuatan, terbaru di atas
            },
            take: 100 // Batasi untuk performa
        });
        return NextResponse.json(journals);
    } catch (error) {
        console.error("Gagal mengambil data jurnal:", error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    
    try {
        const body = await request.json();
        const { branchId, transactionDate, description, items } = body;

        if (!branchId || !transactionDate || !description || !items || items.length < 2) {
            return NextResponse.json({ error: 'Data tidak lengkap. Cabang, tanggal, deskripsi, dan minimal 2 item jurnal wajib diisi.' }, { status: 400 });
        }

        const totalDebit = items.filter((item: any) => item.type === JournalType.DEBIT).reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
        const totalCredit = items.filter((item: any) => item.type === JournalType.CREDIT).reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return NextResponse.json({ error: `Jurnal tidak balance. Total Debit: ${totalDebit}, Total Kredit: ${totalCredit}` }, { status: 400 });
        }

        const newJournal = await prisma.journalEntry.create({
            data: {
                branchId: parseInt(branchId),
                transactionDate: new Date(transactionDate),
                description,
                items: {
                    create: items.map((item: any) => ({
                        chartOfAccountId: parseInt(item.chartOfAccountId),
                        type: item.type as JournalType,
                        amount: parseFloat(item.amount)
                    }))
                }
            }
        });
        return NextResponse.json(newJournal, { status: 201 });
    } catch (error) {
        console.error("Gagal membuat jurnal baru:", error);
        return NextResponse.json({ error: 'Gagal membuat entri jurnal baru' }, { status: 500 });
    }
}

