// File: app/api/v1/clinic/purchases/payments/route.ts
// API untuk memproses pelunasan hutang pembelian

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalType, PaymentAccountMapping } from '@prisma/client';

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const { purchaseInvoiceId } = await request.json();
        if (!purchaseInvoiceId) {
            return NextResponse.json({ error: 'ID Faktur Pembelian wajib diisi' }, { status: 400 });
        }

        const invoiceId = parseInt(purchaseInvoiceId, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Ambil data faktur pembelian
            const purchaseInvoice = await tx.purchaseInvoice.findUnique({
                where: { id: invoiceId },
                include: { supplier: true }
            });

            if (!purchaseInvoice) throw new Error('Faktur pembelian tidak ditemukan.');
            if (purchaseInvoice.status !== 'UNPAID') throw new Error('Faktur ini sudah lunas atau statusnya tidak valid.');
            if (purchaseInvoice.paymentMethod !== 'CREDIT') throw new Error('Metode pembayaran faktur ini bukan Kredit/Hutang.');

            // 2. Update status faktur menjadi PAID
            const updatedInvoice = await tx.purchaseInvoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID' },
            });

            // 3. Cari akun COA yang relevan dari mapping
            const payableAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.ACCOUNTS_PAYABLE } });
            const cashAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.CASH_RECEIPT } });

            if (!payableAccount) throw new Error("Akun COA dengan mapping 'ACCOUNTS_PAYABLE' tidak ditemukan.");
            if (!cashAccount) throw new Error("Akun COA dengan mapping 'CASH_RECEIPT' (untuk Kas) tidak ditemukan.");

            // 4. Buat Jurnal Pelunasan Hutang
            await tx.journalEntry.create({
                data: {
                    branchId: purchaseInvoice.branchId,
                    transactionDate: new Date(),
                    description: `Pelunasan hutang untuk faktur #${purchaseInvoice.invoiceNumber} kepada ${purchaseInvoice.supplier.name}`,
                    items: {
                        create: [
                            // DEBIT Hutang Usaha (mengurangi hutang)
                            { chartOfAccountId: payableAccount.id, type: JournalType.DEBIT, amount: purchaseInvoice.totalAmount },
                            // KREDIT Kas (mengurangi kas)
                            { chartOfAccountId: cashAccount.id, type: JournalType.CREDIT, amount: purchaseInvoice.totalAmount },
                        ],
                    },
                },
            });

            return updatedInvoice;
        });

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error("Gagal memproses pelunasan hutang:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses pelunasan' }, { status: 500 });
    }
}
