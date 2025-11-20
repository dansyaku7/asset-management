// File: app/api/v1/accounting/dashboard-stats/route.ts
// PERBAIKAN: Memperbaiki logika filter `endDate` agar mencakup seharian penuh

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { AccountCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const defaultStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // VVVV--- PERBAIKAN LOGIKA TANGGAL ---VVVV
    const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
    
    // Ambil endDate, set ke akhir hari (23:59:59)
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);
    // ^^^^--- PERBAIKAN LOGIKA TANGGAL ---^^^^

    try {
        const branchFilter = (branchId && branchId !== 'all') 
            ? { branchId: parseInt(branchId, 10) } 
            : {};
        
        const dateFilter = {
            transactionDate: {
                gte: startDate,
                lte: endDate, // Sekarang sudah benar sampai akhir hari
            },
        };

        const whereClause = { ...branchFilter, ...dateFilter };

        // --- 1. Hitung KPI Utama (Pendapatan, Beban, Laba/Rugi) ---
        const revenuePromise = prisma.journalEntryItem.aggregate({
            _sum: { amount: true },
            where: {
                journalEntry: whereClause,
                chartOfAccount: { category: AccountCategory.REVENUE },
                type: 'CREDIT',
            },
        });

        const expensePromise = prisma.journalEntryItem.aggregate({
            _sum: { amount: true },
            where: {
                journalEntry: whereClause,
                chartOfAccount: { category: AccountCategory.EXPENSE },
                type: 'DEBIT',
            },
        });
        
        const [revenueResult, expenseResult] = await Promise.all([revenuePromise, expensePromise]);
        
        const totalRevenue = revenueResult._sum.amount || new Decimal(0);
        const totalExpense = expenseResult._sum.amount || new Decimal(0);
        const profitLoss = totalRevenue.sub(totalExpense);

        // --- 2. Data Chart Komposisi Beban ---
        const expenseCompositionData = await prisma.journalEntryItem.groupBy({
            by: ['chartOfAccountId'],
            _sum: { amount: true },
            where: {
                journalEntry: whereClause,
                chartOfAccount: { category: AccountCategory.EXPENSE },
                type: 'DEBIT',
            },
            having: { amount: { _sum: { gt: 0 } } }
        });

        const accountIds = expenseCompositionData.map(item => item.chartOfAccountId);
        const accounts = await prisma.chartOfAccount.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, accountName: true },
        });
        const accountMap = new Map(accounts.map(acc => [acc.id, acc.accountName]));

        const expenseComposition = expenseCompositionData.map(item => ({
            name: accountMap.get(item.chartOfAccountId) || 'Lainnya',
            value: item._sum.amount?.toNumber() || 0,
        })).sort((a, b) => b.value - a.value);

        // --- 3. Ambil Aktivitas Jurnal Terbaru ---
        const recentJournals = await prisma.journalEntry.findMany({
            where: whereClause,
            take: 5,
            orderBy: { transactionDate: 'desc' },
            include: { branch: { select: { name: true } } },
        });

        return NextResponse.json({
            kpi: {
                totalRevenue: totalRevenue.toNumber(),
                totalExpense: totalExpense.toNumber(),
                profitLoss: profitLoss.toNumber(),
            },
            charts: {
                incomeVsExpense: [
                    { name: 'Pendapatan', value: totalRevenue.toNumber() },
                    { name: 'Beban', value: totalExpense.toNumber() },
                ],
                expenseComposition: expenseComposition,
            },
            recentJournals
        });

    } catch (error) {
        console.error("Gagal mengambil data dashboard akuntansi:", error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}

