// File: app/api/v1/accounting/reports/cash-flow/route.ts
// API untuk Laporan Arus Kas (Metode Tidak Langsung)

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

    if (!startDate || !endDate || !branchId) {
        return NextResponse.json({ error: 'Parameter startDate, endDate, dan branchId wajib diisi' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const branchFilter = (branchId && branchId !== 'all')
        ? { branchId: parseInt(branchId, 10) }
        : {};

    try {
        // --- Langkah 1: Hitung Laba Bersih (Net Income) pada periode ---
        const incomeStatementItems = await prisma.journalEntryItem.findMany({
            where: {
                journalEntry: { ...branchFilter, transactionDate: { gte: start, lte: end } },
                chartOfAccount: { category: { in: [AccountCategory.REVENUE, AccountCategory.EXPENSE] } },
            },
            include: { chartOfAccount: { select: { category: true } } }
        });

        let netIncome = new Decimal(0);
        incomeStatementItems.forEach(item => {
            if (item.chartOfAccount.category === AccountCategory.REVENUE) {
                netIncome = netIncome.add(item.type === 'CREDIT' ? item.amount : item.amount.negated());
            } else if (item.chartOfAccount.category === AccountCategory.EXPENSE) {
                netIncome = netIncome.sub(item.type === 'DEBIT' ? item.amount : item.amount.negated());
            }
        });

        // --- Langkah 2: Dapatkan semua transaksi di akun Kas & Setara Kas ---
        const cashAccounts = await prisma.chartOfAccount.findMany({
            where: {
                // Asumsi: Akun kas memiliki kata 'Kas' atau 'Bank'
                accountName: { contains: 'Kas' },
                category: AccountCategory.ASSET,
            }
        });
        const cashAccountIds = cashAccounts.map(acc => acc.id);

        const cashTransactions = await prisma.journalEntryItem.findMany({
            where: {
                chartOfAccountId: { in: cashAccountIds },
                journalEntry: { ...branchFilter, transactionDate: { gte: start, lte: end } }
            },
            include: {
                journalEntry: {
                    include: {
                        items: { // Ambil "pasangan" dari transaksi kas
                            where: { chartOfAccountId: { notIn: cashAccountIds } },
                            include: { chartOfAccount: true }
                        }
                    }
                }
            }
        });

        // --- Langkah 3: Kategorikan Arus Kas ---
        let operatingActivities: any[] = [];
        let investingActivities: any[] = [];
        let financingActivities: any[] = [];

        cashTransactions.forEach(cashTx => {
            const counterPartyItem = cashTx.journalEntry.items[0]; // Asumsi jurnal simpel (1 debit, 1 kredit)
            if (!counterPartyItem) return;

            const amount = cashTx.amount;
            // Jika kas di-DEBIT, berarti kas MASUK. Jika di-KREDIT, kas KELUAR.
            const cashEffect = cashTx.type === 'DEBIT' ? amount : amount.negated();
            
            const activityItem = {
                description: cashTx.journalEntry.description,
                amount: cashEffect.toNumber(),
                date: cashTx.journalEntry.transactionDate
            };
            
            const category = counterPartyItem.chartOfAccount.category;

            // Logika sederhana untuk kategorisasi:
            if (category === AccountCategory.REVENUE || category === AccountCategory.EXPENSE) {
                // Ini seharusnya sudah ter-cover di Net Income, tapi kita bisa list sbg detail
            } else if (category === AccountCategory.ASSET) {
                // Jika lawannya Aset (bukan kas), asumsi itu aktivitas investasi
                investingActivities.push(activityItem);
            } else if (category === AccountCategory.LIABILITY || category === AccountCategory.EQUITY) {
                // Jika lawannya Liabilitas atau Ekuitas, asumsi itu aktivitas pendanaan
                financingActivities.push(activityItem);
            }
        });

        const totalOperating = netIncome; // Untuk indirect method, kita mulai dari sini
        const totalInvesting = investingActivities.reduce((sum, item) => sum.add(item.amount), new Decimal(0));
        const totalFinancing = financingActivities.reduce((sum, item) => sum.add(item.amount), new Decimal(0));

        // --- Langkah 4: Hitung Saldo Awal dan Akhir Kas ---
        const beginningCashBalance = await prisma.journalEntryItem.aggregate({
            _sum: { amount: true },
            where: {
                chartOfAccountId: { in: cashAccountIds },
                journalEntry: { ...branchFilter, transactionDate: { lt: start } },
                type: 'DEBIT' // Hanya hitung total debit
            }
        });
        const beginningCashCredit = await prisma.journalEntryItem.aggregate({
            _sum: { amount: true },
            where: {
                chartOfAccountId: { in: cashAccountIds },
                journalEntry: { ...branchFilter, transactionDate: { lt: start } },
                type: 'CREDIT' // Hanya hitung total kredit
            }
        });

        const startBalance = (beginningCashBalance._sum.amount || new Decimal(0)).minus(beginningCashCredit._sum.amount || new Decimal(0));
        const netCashChange = totalOperating.add(totalInvesting).add(totalFinancing);
        const endBalance = startBalance.add(netCashChange);

        return NextResponse.json({
            period: { startDate, endDate },
            operating: { activities: [], total: totalOperating.toNumber() }, // Detail activities bisa ditambahkan nanti
            investing: { activities: investingActivities, total: totalInvesting.toNumber() },
            financing: { activities: financingActivities, total: totalFinancing.toNumber() },
            netCashChange: netCashChange.toNumber(),
            beginningBalance: startBalance.toNumber(),
            endingBalance: endBalance.toNumber(),
        });

    } catch (error) {
        console.error("Gagal mengambil data Arus Kas:", error);
        return NextResponse.json({ error: 'Gagal mengambil data Arus Kas' }, { status: 500 });
    }
}
