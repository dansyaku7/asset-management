// File: app/api/v1/accounting/reports/general-ledger/route.ts
// PERBAIKAN: Menambahkan filter cabang & logika saldo yang benar sesuai kategori akun

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const branchId = searchParams.get('branchId'); // <-- PARAMETER BARU

        if (!accountId || !startDate || !endDate || !branchId) {
            return NextResponse.json({ error: 'Parameter tidak lengkap (accountId, startDate, endDate, branchId wajib diisi)' }, { status: 400 });
        }

        const accountIdNum = Number(accountId);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Siapkan filter cabang
        const branchFilter = (branchId && branchId !== 'all')
            ? { branchId: parseInt(branchId, 10) }
            : {};

        // Ambil info akun terlebih dahulu untuk tahu kategorinya
        const selectedAccount = await prisma.chartOfAccount.findUnique({
            where: { id: accountIdNum }
        });
        if (!selectedAccount) {
            return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
        }
        const isDebitNormal = selectedAccount.category === AccountCategory.ASSET || selectedAccount.category === AccountCategory.EXPENSE;

        // 1. Hitung Saldo Awal (semua transaksi sebelum startDate)
        const beginningBalanceItems = await prisma.journalEntryItem.findMany({
            where: {
                chartOfAccountId: accountIdNum,
                journalEntry: {
                    ...branchFilter, // Terapkan filter cabang
                    transactionDate: { lt: start },
                },
            },
        });

        let beginningBalance = new Decimal(0);
        beginningBalanceItems.forEach(item => {
            if (isDebitNormal) { // Aset & Beban
                beginningBalance = beginningBalance.add(item.type === 'DEBIT' ? item.amount : item.amount.negated());
            } else { // Liabilitas, Ekuitas, Pendapatan
                beginningBalance = beginningBalance.add(item.type === 'CREDIT' ? item.amount : item.amount.negated());
            }
        });

        // 2. Ambil transaksi dalam rentang tanggal
        const transactions = await prisma.journalEntryItem.findMany({
            where: {
                chartOfAccountId: accountIdNum,
                journalEntry: {
                    ...branchFilter, // Terapkan filter cabang
                    transactionDate: { gte: start, lte: end },
                },
            },
            include: {
                journalEntry: { include: { branch: { select: { name: true } } } },
            },
            orderBy: { journalEntry: { transactionDate: 'asc' } },
        });

        // 3. Proses transaksi dan hitung saldo berjalan
        let runningBalance = new Decimal(beginningBalance);
        const processedTransactions = transactions.map(item => {
            if (isDebitNormal) { // Aset & Beban
                runningBalance = runningBalance.add(item.type === 'DEBIT' ? item.amount : item.amount.negated());
            } else { // Liabilitas, Ekuitas, Pendapatan
                runningBalance = runningBalance.add(item.type === 'CREDIT' ? item.amount : item.amount.negated());
            }
            return {
                date: item.journalEntry.transactionDate,
                description: item.journalEntry.description,
                branchName: item.journalEntry.branch.name, // <-- Kirim nama cabang
                debit: item.type === 'DEBIT' ? item.amount.toNumber() : 0,
                credit: item.type === 'CREDIT' ? item.amount.toNumber() : 0,
                balance: runningBalance.toNumber(),
            };
        });

        return NextResponse.json({
            account: selectedAccount,
            beginningBalance: beginningBalance.toNumber(),
            transactions: processedTransactions,
            endingBalance: runningBalance.toNumber(),
        });

    } catch (error) {
        console.error("Gagal mengambil data buku besar:", error);
        return NextResponse.json({ error: 'Gagal mengambil data buku besar' }, { status: 500 });
    }
}
