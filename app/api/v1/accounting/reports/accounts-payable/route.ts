// File: app/api/v1/accounting/reports/accounts-payable/route.ts
// API to fetch unpaid purchase invoices (Accounts Payable)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId'); // 'all' or specific ID

        let whereClause: any = {
            status: 'UNPAID',
            paymentMethod: 'CREDIT'
        };

        if (branchId && branchId !== 'all') {
            const branchIdNum = parseInt(branchId, 10);
            if (!isNaN(branchIdNum)) {
                whereClause.branchId = branchIdNum;
            }
        }

        const unpaidInvoices = await prisma.purchaseInvoice.findMany({
            where: whereClause,
            include: {
                supplier: {
                    select: { name: true }
                },
                branch: {
                    select: { name: true }
                }
            },
            orderBy: {
                transactionDate: 'asc', // Show oldest debts first
            },
        });

        // Calculate total payables
        const totalPayables = unpaidInvoices.reduce((sum, invoice) => {
            return sum.plus(invoice.totalAmount);
        }, new Decimal(0));
        
        return NextResponse.json({
            invoices: unpaidInvoices,
            totalPayables: totalPayables,
        });

    } catch (error) {
        console.error("Gagal mengambil data hutang usaha:", error);
        return NextResponse.json({ error: 'Gagal mengambil data laporan' }, { status: 500 });
    }
}
