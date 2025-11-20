// File: app/api/v1/accounting/reports/balance-sheet/route.ts
// PERBAIKAN: Memperbaiki kalkulasi Laba Berjalan (Current Year Net Income)

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
    const branchId = searchParams.get('branchId');
    const asOfDateStr = searchParams.get('asOfDate');

    if (!asOfDateStr) {
        return NextResponse.json({ error: 'Parameter asOfDate wajib diisi' }, { status: 400 });
    }

    const asOfDate = new Date(asOfDateStr);
    asOfDate.setHours(23, 59, 59, 999);
    const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1);

    const branchFilter = (branchId && branchId !== 'all')
        ? { branchId: parseInt(branchId, 10) }
        : {};

    try {
        // === LANGKAH 1: HITUNG LABA/RUGI BERJALAN (FIXED) ===
        const incomeStatementItems = await prisma.journalEntryItem.findMany({
            where: {
                journalEntry: {
                    ...branchFilter,
                    transactionDate: { gte: fiscalYearStart, lte: asOfDate },
                },
                chartOfAccount: {
                    category: { in: [AccountCategory.REVENUE, AccountCategory.EXPENSE] },
                },
            },
            // VVVV--- INI PERBAIKANNYA ---VVVV
            include: {
                chartOfAccount: { select: { category: true } }
            }
            // ^^^^--- INI PERBAIKANNYA ---^^^^
        });

        let netIncome = new Decimal(0);
        incomeStatementItems.forEach(item => {
            // VVVV--- DAN INI PERBAIKANNYA ---VVVV
            if (item.chartOfAccount.category === AccountCategory.REVENUE) {
                // Pendapatan menambah laba jika di sisi KREDIT
                netIncome = netIncome.add(item.type === 'CREDIT' ? item.amount : item.amount.negated());
            } else if (item.chartOfAccount.category === AccountCategory.EXPENSE) {
                // Beban mengurangi laba jika di sisi DEBIT
                netIncome = netIncome.sub(item.type === 'DEBIT' ? item.amount : item.amount.negated());
            }
            // ^^^^--- DAN INI PERBAIKANNYA ---^^^^
        });

        // === LANGKAH 2: HITUNG SALDO AKHIR SEMUA AKUN NERACA ===
        const balanceSheetAccountItems = await prisma.journalEntryItem.findMany({
            where: {
                journalEntry: {
                    ...branchFilter,
                    transactionDate: { lte: asOfDate },
                },
                chartOfAccount: {
                    category: { in: [AccountCategory.ASSET, AccountCategory.LIABILITY, AccountCategory.EQUITY] },
                },
            },
            include: {
                chartOfAccount: { select: { id: true, accountName: true, category: true } }
            }
        });
        
        const finalBalances = new Map<number, { name: string; category: AccountCategory; balance: Decimal }>();

        for (const item of balanceSheetAccountItems) {
            const account = item.chartOfAccount;
            let currentBalance = finalBalances.get(account.id)?.balance || new Decimal(0);
            let value = new Decimal(0);
            
            if (account.category === AccountCategory.ASSET) {
                value = (item.type === 'DEBIT') ? item.amount : item.amount.negated();
            } else { // LIABILITY & EQUITY
                value = (item.type === 'CREDIT') ? item.amount : item.amount.negated();
            }

            finalBalances.set(account.id, {
                name: account.accountName,
                category: account.category,
                balance: currentBalance.add(value)
            });
        }

        // === LANGKAH 3: KELOMPOKKAN & FORMAT LAPORAN ===
        const assets: any[] = [], liabilities: any[] = [], equity: any[] = [];
        let totalAssets = new Decimal(0);
        let totalLiabilities = new Decimal(0);
        let totalEquity = new Decimal(0);

        for (const item of finalBalances.values()) {
            const reportItem = { name: item.name, total: item.balance.toNumber() };
            if (item.category === AccountCategory.ASSET) {
                assets.push(reportItem);
                totalAssets = totalAssets.add(item.balance);
            } else if (item.category === AccountCategory.LIABILITY) {
                liabilities.push(reportItem);
                totalLiabilities = totalLiabilities.add(item.balance);
            } else if (item.category === AccountCategory.EQUITY) {
                equity.push(reportItem);
                totalEquity = totalEquity.add(item.balance);
            }
        }

        // Tambahkan Laba Berjalan ke Ekuitas
        if (netIncome.toNumber() !== 0) {
            equity.push({ name: "Laba/Rugi Berjalan", total: netIncome.toNumber() });
        }
        totalEquity = totalEquity.add(netIncome);

        return NextResponse.json({
            period: { asOfDate: asOfDateStr },
            assets,
            totalAssets: totalAssets.toNumber(),
            liabilities,
            totalLiabilities: totalLiabilities.toNumber(),
            equity,
            totalEquity: totalEquity.toNumber(),
            totalLiabilitiesAndEquity: totalLiabilities.add(totalEquity).toNumber(),
        });

    } catch (error) {
        console.error("Gagal mengambil data Neraca:", error);
        return NextResponse.json({ error: 'Gagal mengambil data Neraca' }, { status: 500 });
    }
}

