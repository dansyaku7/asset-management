// File: app/api/v1/clinic/cashier/payments/route.ts
// (REVISI FINAL - Perbaikan Logika Jurnal Akuntansi)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalType, PaymentAccountMapping } from '@prisma/client';

const allowedRolesForPayment = ['SUPER_ADMIN', 'DOKTER', 'STAFF', 'KASIR', 'ADMIN'];

const formatCurrency = (value: number | Decimal | string | undefined) => {
    if (value === undefined || value === null) return 'Rp 0';
    const numberValue = Number(value);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(numberValue);
};

// POST /api/v1/clinic/cashier/payments
export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken || !allowedRolesForPayment.some(role => decodedToken.role.includes(role))) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { invoiceId, paymentMethod, amountPaid } = body;

        if (!invoiceId || !paymentMethod || amountPaid === undefined) {
            return NextResponse.json({ error: 'Invoice ID, Metode Pembayaran, dan Jumlah Bayar wajib diisi' }, { status: 400 });
        }

        const invoiceIdInt = parseInt(invoiceId, 10);
        const amountPaidDecimal = new Decimal(amountPaid.toString());

        if (isNaN(invoiceIdInt) || amountPaidDecimal.isNaN() || amountPaidDecimal.isNegative()) {
             return NextResponse.json({ error: 'Data pembayaran tidak valid (ID atau Jumlah)' }, { status: 400 });
        }

        const paymentResult = await prisma.$transaction(async (tx) => {

            // 1. Ambil data Invoice
             const invoice = await tx.invoice.findUnique({
                 where: { id: invoiceIdInt },
                 include: {
                     items: { include: { drug: true, service: true } },
                     branch: true,
                     patient: { select: { fullName: true }}
                 }
             });
             if (!invoice) throw new Error('Invoice tidak ditemukan.');
             if (invoice.status !== 'UNPAID') throw new Error(`Invoice #${invoice.invoiceNumber} statusnya ${invoice.status}, tidak bisa dibayar.`);
             if (!amountPaidDecimal.equals(invoice.totalAmount)) {
                 throw new Error(`Jumlah bayar (${formatCurrency(amountPaidDecimal)}) tidak sesuai total tagihan (${formatCurrency(invoice.totalAmount)}).`);
             }

            // 2. Update Invoice & Buat Payment
            await tx.invoice.update({ where: { id: invoiceIdInt }, data: { status: 'PAID', updatedAt: new Date() } });
            const payment = await tx.payment.create({
                data: {
                    invoiceId: invoiceIdInt,
                    amount: amountPaidDecimal,
                    paymentMethod: paymentMethod,
                    paymentDate: new Date()
                }
            });

            // 4. Persiapan Jurnal
            const transactionDate = new Date();
            const description = `Penerimaan ${paymentMethod} Invoice ${invoice.invoiceNumber} (${invoice.patient?.fullName || 'N/A'})`;
            let totalRevenueJasa = new Decimal(0);
            let totalRevenueObat = new Decimal(0);

            // VVVV--- PERBAIKAN UTAMA DI SINI ---VVVV
            for (const item of invoice.items) {
                // Jika ada drugId, pasti itu pendapatan obat.
                if (item.drugId && item.total) {
                    totalRevenueObat = totalRevenueObat.add(item.total);
                } 
                // Jika tidak ada drugId (berarti ini jasa/konsul/lab/rad), masukkan ke pendapatan jasa.
                else if (item.total) { 
                    totalRevenueJasa = totalRevenueJasa.add(item.total);
                }
            }
            // ^^^^--- AKHIR PERBAIKAN ---^^^^

            // 5. Cari Akun Berdasarkan Mapping
            const kasAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.CASH_RECEIPT } });
            const revJasaAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.SERVICE_REVENUE } });
            const revObatAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.DRUG_REVENUE } });

            if (!kasAccount) throw new Error(`Akun COA dengan mapping CASH_RECEIPT tidak ditemukan. Harap set mapping di Master COA.`);
            if (!revJasaAccount) throw new Error(`Akun COA dengan mapping SERVICE_REVENUE tidak ditemukan.`);
            if (!revObatAccount) throw new Error(`Akun COA dengan mapping DRUG_REVENUE tidak ditemukan.`);

            // 6. Susun Item Jurnal
            const journalItems: any[] = [];
            journalItems.push({ chartOfAccountId: kasAccount.id, type: JournalType.DEBIT, amount: amountPaidDecimal });
            if (totalRevenueJasa.greaterThan(0)) { journalItems.push({ chartOfAccountId: revJasaAccount.id, type: JournalType.CREDIT, amount: totalRevenueJasa }); }
            if (totalRevenueObat.greaterThan(0)) { journalItems.push({ chartOfAccountId: revObatAccount.id, type: JournalType.CREDIT, amount: totalRevenueObat }); }

            // Validasi Balance
            const totalDebit = journalItems.filter(i => i.type === 'DEBIT').reduce((sum, i) => sum.add(i.amount), new Decimal(0));
            const totalKredit = journalItems.filter(i => i.type === 'CREDIT').reduce((sum, i) => sum.add(i.amount), new Decimal(0));
            if (!totalDebit.equals(totalKredit)) throw new Error(`Internal Server Error: Jurnal otomatis tidak balance (D: ${totalDebit}, K: ${totalKredit}).`);
            if (!totalDebit.equals(amountPaidDecimal)) throw new Error(`Internal Server Error: Total jurnal (Rp ${totalDebit}) tidak sama dengan jumlah bayar (Rp ${amountPaidDecimal}).`);

            // 7. Buat Jurnal Entry
            await tx.journalEntry.create({
                data: {
                    transactionDate: transactionDate,
                    description: description,
                    branchId: invoice.branchId,
                    items: { create: journalItems }
                }
            });

            return payment;
        });

        return NextResponse.json(paymentResult, { status: 201 });

    } catch (error) {
        console.error("Gagal memproses pembayaran:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan internal saat memproses pembayaran.' }, { status: 500 });
    }
}
