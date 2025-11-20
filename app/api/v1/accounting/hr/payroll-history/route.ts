// File: app/api/v1/accounting/hr/payroll-history/route.ts
// PERBAIKAN: Memperbaiki sintaks 'orderBy' untuk multi-column sort

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const history = await prisma.payroll.findMany({
            include: {
                items: {
                    select: {
                        netPay: true
                    }
                },
                journalEntry: {
                    select: {
                        branch: {
                            select: { name: true }
                        }
                    }
                }
            },
            // VVVV--- PERBAIKAN DI SINI ---VVVV
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' },
            ],
            // ^^^^--- PERBAIKAN DI SINI ---^^^^
        });

        // Proses data untuk kalkulasi total
        const processedHistory = history.map(p => {
            const totalNetPay = p.items.reduce((sum, item) => sum.plus(item.netPay), new Decimal(0));
            return {
                id: p.id,
                periodMonth: p.periodMonth,
                periodYear: p.periodYear,
                executionDate: p.executionDate,
                employeeCount: p.items.length,
                totalNetPay: totalNetPay,
                branchName: p.journalEntry?.branch.name || 'Gabungan',
                status: p.status
            };
        });

        return NextResponse.json(processedHistory);
    } catch (error) {
        console.error("Gagal mengambil riwayat penggajian:", error);
        return NextResponse.json({ error: 'Gagal mengambil data riwayat penggajian' }, { status: 500 });
    }
}

