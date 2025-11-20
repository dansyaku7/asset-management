// File: app/api/v1/accounting/hr/payroll-payments/route.ts
// PERBAIKAN: Mengganti cara inisialisasi Decimal

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library'; // <-- Pastikan ini diimpor
import { JournalType, PaymentAccountMapping } from '@prisma/client';

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const { payrollId } = await request.json();
        if (!payrollId) {
            return NextResponse.json({ error: 'ID Payroll wajib diisi' }, { status: 400 });
        }

        const id = parseInt(payrollId, 10);

        const result = await prisma.$transaction(async (tx) => {
            const payroll = await tx.payroll.findUnique({
                where: { id },
                include: { journalEntry: true, items: true }
            });

            if (!payroll) throw new Error('Riwayat payroll tidak ditemukan.');
            if (payroll.status !== 'UNPAID') throw new Error('Gaji untuk periode ini sudah lunas.');
            if (!payroll.journalEntry) throw new Error('Jurnal pengakuan beban gaji tidak ditemukan.');

            const updatedPayroll = await tx.payroll.update({
                where: { id },
                data: { status: 'PAID' },
            });

            const payableAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.SALARY_PAYABLE } });
            const cashAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.CASH_RECEIPT } });

            if (!payableAccount) throw new Error("Akun Hutang Gaji (SALARY_PAYABLE) belum di-mapping di COA.");
            if (!cashAccount) throw new Error("Akun Kas (CASH_RECEIPT) belum di-mapping di COA.");
            
            // VVVV--- PERBAIKAN DI SINI ---VVVV
            const totalNetPay = payroll.items.reduce((sum, item) => sum.plus(item.netPay), new Decimal(0));
            // ^^^^--- PERBAIKAN DI SINI ---VVVV

            await tx.journalEntry.create({
                data: {
                    branchId: payroll.journalEntry.branchId,
                    transactionDate: new Date(),
                    description: `Pembayaran Gaji Periode ${new Date(payroll.periodYear, payroll.periodMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
                    items: {
                        create: [
                            { chartOfAccountId: payableAccount.id, type: JournalType.DEBIT, amount: totalNetPay },
                            { chartOfAccountId: cashAccount.id, type: JournalType.CREDIT, amount: totalNetPay },
                        ],
                    },
                },
            });

            return updatedPayroll;
        });

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error("Gagal memproses pelunasan gaji:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses pelunasan' }, { status: 500 });
    }
}

