// File: app/api/v1/accounting/depreciation/run/route.ts
// PERBAIKAN: Menambahkan helper 'formatCurrency' yang hilang

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalType, PaymentAccountMapping } from '@prisma/client';
import { endOfMonth, isBefore } from 'date-fns';

// VVVV--- TAMBAHAN BARU DI SINI ---VVVV
// Helper untuk format Rupiah (dipindahkan dari frontend)
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { 
        style: "currency", 
        currency: "IDR", 
        minimumFractionDigits: 0 
    }).format(value);
};
// ^^^^--- TAMBAHAN BARU DI SINI ---^^^^

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    // TODO: Tambah cek role admin/akunting

    try {
        const { year, month } = await request.json(); // month is 0-11 (like JS Date)
        if (year === undefined || month === undefined) {
            return NextResponse.json({ error: 'Tahun dan Bulan wajib diisi' }, { status: 400 });
        }

        const targetDate = endOfMonth(new Date(year, month));

        const result = await prisma.$transaction(async (tx) => {
            // 1. Ambil semua akun COA yang dibutuhkan
            const expenseAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.DEPRECIATION_EXPENSE } });
            const accumulatedAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.ACCUMULATED_DEPRECIATION } });

            if (!expenseAccount) throw new Error("Akun Beban Penyusutan belum di-mapping di COA.");
            if (!accumulatedAccount) throw new Error("Akun Akumulasi Penyusutan belum di-mapping di COA.");

            // 2. Ambil semua aset yang relevan
            const assets = await tx.asset.findMany({
                where: {
                    usefulLife: { gt: 0 },
                    purchaseDate: { lte: targetDate },
                },
                include: { branch: true }
            });

            const branchDepreciationTotals: Map<number, { branchName: string, total: Decimal }> = new Map();
            const depreciatedAssetIds: string[] = [];

            // 3. Hitung penyusutan untuk setiap aset
            for (const asset of assets) {
                // Lewati jika penyusutan untuk bulan ini sudah pernah dijalankan
                if (asset.lastDepreciationDate && !isBefore(new Date(asset.lastDepreciationDate), targetDate)) {
                    continue;
                }

                const monthlyDepreciation = asset.price.minus(asset.salvageValue).dividedBy(asset.usefulLife);
                if (monthlyDepreciation.isNegative() || monthlyDepreciation.isZero()) {
                    continue;
                }
                
                // Hitung total penyusutan yang sudah terjadi sebelumnya
                const ageInMonths = ( (asset.lastDepreciationDate || asset.purchaseDate).getTime() - new Date(asset.purchaseDate).getTime() ) / (1000 * 60 * 60 * 24 * 30.44);
                const currentAccumulatedDepreciation = monthlyDepreciation.mul(new Decimal(ageInMonths > 0 ? ageInMonths : 0));
                
                const maxDepreciation = asset.price.minus(asset.salvageValue);
                
                // Cek apakah dengan penyusutan bulan ini, totalnya melebihi batas
                if (currentAccumulatedDepreciation.plus(monthlyDepreciation).greaterThan(maxDepreciation)) {
                    // Jika sudah mau habis, susutkan sisanya saja
                    const finalDepreciation = maxDepreciation.minus(currentAccumulatedDepreciation);
                    if (finalDepreciation.greaterThan(0)) {
                        const currentTotal = branchDepreciationTotals.get(asset.branchId)?.total || new Decimal(0);
                        branchDepreciationTotals.set(asset.branchId, {
                            branchName: asset.branch.name,
                            total: currentTotal.plus(finalDepreciation)
                        });
                        depreciatedAssetIds.push(asset.id);
                    }
                    continue; // Lanjut ke aset berikutnya
                }

                // Tambahkan ke total cabang
                const currentTotal = branchDepreciationTotals.get(asset.branchId)?.total || new Decimal(0);
                branchDepreciationTotals.set(asset.branchId, {
                    branchName: asset.branch.name,
                    total: currentTotal.plus(monthlyDepreciation)
                });
                depreciatedAssetIds.push(asset.id);
            }

            if (branchDepreciationTotals.size === 0) {
                return { message: "Tidak ada aset baru yang perlu disusutkan untuk periode ini.", details: [] };
            }

            const journalSummaries = [];

            // 4. Buat satu jurnal per cabang
            for (const [branchId, data] of branchDepreciationTotals.entries()) {
                await tx.journalEntry.create({
                    data: {
                        branchId,
                        transactionDate: targetDate,
                        description: `Beban Penyusutan Aset - ${data.branchName} - Periode ${targetDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
                        items: {
                            create: [
                                { chartOfAccountId: expenseAccount.id, type: JournalType.DEBIT, amount: data.total },
                                { chartOfAccountId: accumulatedAccount.id, type: JournalType.CREDIT, amount: data.total },
                            ]
                        }
                    }
                });
                // Kode ini sekarang aman karena formatCurrency sudah ada di atas
                journalSummaries.push(`Cabang ${data.branchName}: ${formatCurrency(data.total.toNumber())}`);
            }

            // 5. Update tanggal penyusutan terakhir untuk aset yang diproses
            await tx.asset.updateMany({
                where: { id: { in: depreciatedAssetIds } },
                data: { lastDepreciationDate: targetDate }
            });

            return {
                message: `Penyusutan berhasil dijalankan untuk ${branchDepreciationTotals.size} cabang.`,
                details: journalSummaries
            };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Gagal menjalankan penyusutan:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menjalankan penyusutan' }, { status: 500 });
    }
}

