// File: app/api/v1/clinic/purchases/route.ts
// PERBAIKAN: Menambahkan generator nomor referensi internal otomatis

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalType, PaymentAccountMapping } from '@prisma/client';

// ... (fungsi GET tidak berubah, biarkan saja) ...
export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) return NextResponse.json({ error: 'branchId wajib diisi' }, { status: 400 });

    try {
        const purchases = await prisma.purchaseInvoice.findMany({
            where: { branchId: parseInt(branchId) },
            include: {
                supplier: { select: { name: true } },
                items: { include: { drug: { select: { name: true } } } },
            },
            orderBy: { transactionDate: 'desc' },
        });
        return NextResponse.json(purchases);
    } catch (error) {
        console.error("Gagal mengambil data pembelian:", error);
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
}


// POST: Membuat faktur pembelian baru, menambah stok, dan membuat jurnal
export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const body = await request.json();
        const { branchId, supplierId, invoiceNumber, transactionDate, paymentMethod, items } = body;

        if (!branchId || !supplierId || !invoiceNumber || !transactionDate || !paymentMethod || !items || items.length === 0) {
            return NextResponse.json({ error: 'Semua field wajib diisi dan minimal ada 1 item.' }, { status: 400 });
        }

        const totalAmount = items.reduce((sum: Decimal, item: any) => {
            const price = new Decimal(item.purchasePrice || 0);
            const quantity = new Decimal(item.quantity || 0);
            item.totalPrice = price.mul(quantity);
            return sum.plus(item.totalPrice);
        }, new Decimal(0));

        // ===================================
        // MULAI TRANSAKSI DATABASE
        // ===================================
        const newPurchase = await prisma.$transaction(async (tx) => {
            
            // VVVV--- LOGIKA BARU: GENERATE NOMOR REFERENSI INTERNAL ---VVVV
            const today = new Date(transactionDate);
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const dateString = `${year}${month}${day}`;

            // 1a. Hitung jumlah pembelian hari ini di cabang ini untuk nomor urut
            const purchasesToday = await tx.purchaseInvoice.count({
                where: {
                    branchId: parseInt(branchId),
                    transactionDate: {
                        gte: new Date(year, today.getMonth(), day),
                        lt: new Date(year, today.getMonth(), day + 1),
                    }
                }
            });
            const sequence = (purchasesToday + 1).toString().padStart(3, '0');

            // 1b. Ambil kode cabang (asumsi nama cabang bisa jadi kode, misal "YM Lampung" -> "YML")
            const branch = await tx.branch.findUnique({ where: { id: parseInt(branchId) } });
            const branchCode = branch?.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'XXX';

            const internalRefNumber = `PB/${branchCode}/${dateString}/${sequence}`;
            // ^^^^--- LOGIKA BARU SELESAI ---^^^^

            // 2. Buat Purchase Invoice & Items
            const purchaseInvoice = await tx.purchaseInvoice.create({
                data: {
                    internalRefNumber, // <-- Simpan nomor baru
                    invoiceNumber,
                    supplierId: parseInt(supplierId),
                    branchId: parseInt(branchId),
                    transactionDate: new Date(transactionDate),
                    totalAmount,
                    paymentMethod,
                    status: paymentMethod === 'CASH' ? 'PAID' : 'UNPAID',
                    items: {
                        create: items.map((item: any) => ({
                            drugId: parseInt(item.drugId),
                            quantity: parseInt(item.quantity),
                            purchasePrice: new Decimal(item.purchasePrice),
                            totalPrice: item.totalPrice,
                            expiryDate: new Date(item.expiryDate),
                        })),
                    },
                },
            });

            // 3. Tambah/Update Stok Obat (DrugStock) - Logika sama
            for (const item of items) { /* ... (logika stok tidak berubah) ... */ }
            
            // 4. Buat Jurnal Akuntansi Otomatis - Logika sama
            // ... (logika jurnal tidak berubah) ...

            // --- (Salin logika stok & jurnal dari file sebelumnya jika perlu) ---
            for (const item of items) {
                const expiryDate = new Date(item.expiryDate);
                // Simple expiry date matching (by day)
                const startOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
                const endOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate() + 1);

                const existingStock = await tx.drugStock.findFirst({
                    where: {
                        drugId: parseInt(item.drugId),
                        branchId: parseInt(branchId),
                        expiryDate: { gte: startOfDay, lt: endOfDay }
                    }
                });
                if (existingStock) {
                    await tx.drugStock.update({
                        where: { id: existingStock.id },
                        data: { quantity: { increment: parseInt(item.quantity) } },
                    });
                } else {
                    await tx.drugStock.create({
                        data: { drugId: parseInt(item.drugId), branchId: parseInt(branchId), quantity: parseInt(item.quantity), expiryDate: new Date(item.expiryDate) },
                    });
                }
            }

            const inventoryAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: 'INVENTORY_ASSET' } });
            const cashAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: 'CASH_RECEIPT' } });
            const payableAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: 'ACCOUNTS_PAYABLE' } });

            if (!inventoryAccount) throw new Error("Akun COA dengan mapping 'INVENTORY_ASSET' tidak ditemukan.");
            let creditAccount;
            if (paymentMethod === 'CASH') {
                if (!cashAccount) throw new Error("Akun COA dengan mapping 'CASH_RECEIPT' tidak ditemukan.");
                creditAccount = cashAccount;
            } else {
                if (!payableAccount) throw new Error("Akun COA dengan mapping 'ACCOUNTS_PAYABLE' tidak ditemukan.");
                creditAccount = payableAccount;
            }
            await tx.journalEntry.create({
                data: {
                    branchId: parseInt(branchId),
                    transactionDate: new Date(transactionDate),
                    description: `Pembelian obat dari Supplier ID ${supplierId} (Ref: ${internalRefNumber}, Faktur: #${invoiceNumber})`,
                    items: {
                        create: [
                            { chartOfAccountId: inventoryAccount.id, type: JournalType.DEBIT, amount: totalAmount },
                            { chartOfAccountId: creditAccount.id, type: JournalType.CREDIT, amount: totalAmount },
                        ],
                    },
                },
            });
            // --- Akhir Salin ---

            return purchaseInvoice;
        });

        return NextResponse.json(newPurchase, { status: 201 });
    } catch (error) {
        console.error("Gagal membuat faktur pembelian:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses pembelian' }, { status: 500 });
    }
}

