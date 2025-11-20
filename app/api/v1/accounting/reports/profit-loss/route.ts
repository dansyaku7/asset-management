// File: app/api/v1/accounting/reports/profit-loss/route.ts
// PERBAIKAN: API Laba Rugi dinamis dengan filter cabang, konsolidasi, dan detail per akun.

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory, JournalType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId'); // 'all' atau ID cabang
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Parameter startDate dan endDate wajib diisi' }, { status: 400 });
    }

    // Siapkan filter tanggal
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Pastikan mencakup seharian penuh

    // Siapkan filter cabang (jika ada)
    const branchFilter = (branchId && branchId !== 'all')
        ? { branchId: parseInt(branchId, 10) }
        : {};

    const whereClause = {
        journalEntry: {
            ...branchFilter,
            transactionDate: { gte: start, lte: end },
        },
        chartOfAccount: {
            category: { in: [AccountCategory.REVENUE, AccountCategory.EXPENSE] },
        },
    };

    try {
        // 1. Ambil semua item jurnal yang relevan (Pendapatan & Beban)
        const journalItems = await prisma.journalEntryItem.findMany({
            where: whereClause,
            include: {
                chartOfAccount: {
                    select: { id: true, accountName: true, category: true }
                }
            },
        });

        // 2. Proses dan agregat data per akun
        const reportData: Map<number, { name: string, category: AccountCategory, total: Decimal }> = new Map();

        for (const item of journalItems) {
            const { chartOfAccountId, amount, type } = item;
            const { accountName, category } = item.chartOfAccount;
            
            // Pendapatan normalnya di Kredit (+), Beban normalnya di Debit (+)
            // Jika ada jurnal balik (misal retur), nilainya akan negatif
            let value = new Decimal(0);
            if (category === AccountCategory.REVENUE) {
                value = (type === JournalType.CREDIT) ? amount : amount.negated();
            } else if (category === AccountCategory.EXPENSE) {
                value = (type === JournalType.DEBIT) ? amount : amount.negated();
            }

            if (reportData.has(chartOfAccountId)) {
                const existing = reportData.get(chartOfAccountId)!;
                existing.total = existing.total.plus(value);
            } else {
                reportData.set(chartOfAccountId, { name: accountName, category, total: value });
            }
        }
        
        // 3. Pisahkan ke grup Pendapatan dan Beban
        const revenues = [];
        const expenses = [];
        for (const item of reportData.values()) {
            if (item.category === AccountCategory.REVENUE) {
                revenues.push({ name: item.name, total: item.total.toNumber() });
            } else {
                expenses.push({ name: item.name, total: item.total.toNumber() });
            }
        }

        // 4. Hitung Total
        const totalRevenue = revenues.reduce((sum, item) => sum + item.total, 0);
        const totalExpense = expenses.reduce((sum, item) => sum + item.total, 0);
        const netIncome = totalRevenue - totalExpense;

        return NextResponse.json({
            period: { startDate, endDate },
            revenues,
            totalRevenue,
            expenses,
            totalExpense,
            netIncome,
        });

    } catch (error) {
        console.error("Gagal mengambil data Laba Rugi:", error);
        return NextResponse.json({ error: 'Gagal mengambil data Laba Rugi' }, { status: 500 });
    }
}
