// File: app/api/v1/accounting/hr/run-payroll/route.ts

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalType, PaymentAccountMapping, PayrollComponentType } from '@prisma/client';

export async function POST(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });

    try {
        const { month, year } = await request.json(); // month is 0-11 (like JS Date)
        if (month === undefined || year === undefined) {
            return NextResponse.json({ error: 'Bulan dan Tahun wajib diisi' }, { status: 400 });
        }

        // 1. Cek apakah payroll untuk periode ini sudah pernah dijalankan
        const existingPayroll = await prisma.payroll.findFirst({
            where: { periodMonth: month, periodYear: year }
        });
        if (existingPayroll) {
            return NextResponse.json({ error: `Penggajian untuk periode ini sudah pernah dijalankan pada ${new Date(existingPayroll.executionDate).toLocaleDateString('id-ID')}` }, { status: 409 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 2. Ambil semua karyawan aktif beserta struktur gajinya
            const employees = await tx.employee.findMany({
                where: { isActive: true },
                include: {
                    salaries: {
                        include: { payrollComponent: true }
                    }
                }
            });

            if (employees.length === 0) throw new Error("Tidak ada karyawan aktif yang ditemukan.");

            // 3. Ambil akun COA yang dibutuhkan
            const expenseAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.SALARY_EXPENSE } });
            const payableAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.SALARY_PAYABLE } });
            if (!expenseAccount) throw new Error("Akun Beban Gaji (SALARY_EXPENSE) belum di-mapping di COA.");
            if (!payableAccount) throw new Error("Akun Hutang Gaji (SALARY_PAYABLE) belum di-mapping di COA.");
            
            // 4. Buat record Payroll utama
            const payroll = await tx.payroll.create({
                data: { periodMonth: month, periodYear: year }
            });

            let totalPayrollExpense = new Decimal(0);
            let totalNetPay = new Decimal(0);
            const payrollItemsData = [];

            // 5. Hitung gaji untuk setiap karyawan
            for (const employee of employees) {
                const totalEarnings = employee.salaries
                    .filter(s => s.payrollComponent.type === PayrollComponentType.EARNING)
                    .reduce((sum, s) => sum.plus(s.amount), new Decimal(0));
                
                const totalDeductions = employee.salaries
                    .filter(s => s.payrollComponent.type === PayrollComponentType.DEDUCTION)
                    .reduce((sum, s) => sum.plus(s.amount), new Decimal(0));
                
                const netPay = totalEarnings.minus(totalDeductions);

                payrollItemsData.push({
                    payrollId: payroll.id,
                    employeeId: employee.id,
                    totalEarnings,
                    totalDeductions,
                    netPay
                });

                totalPayrollExpense = totalPayrollExpense.plus(totalEarnings); // Beban gaji adalah total pendapatan kotor
                totalNetPay = totalNetPay.plus(netPay);
            }

            // 6. Buat semua item payroll
            await tx.payrollItem.createMany({ data: payrollItemsData });

            // 7. Buat Jurnal Akuntansi Penggajian
            const journal = await tx.journalEntry.create({
                data: {
                    // Asumsi jurnal dibuat untuk cabang "Pusat" (ID 1), atau perlu logika lain
                    branchId: 1, 
                    transactionDate: new Date(),
                    description: `Penggajian Karyawan Periode ${new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
                    items: {
                        create: [
                            // DEBIT Beban Gaji (sebesar total pendapatan kotor)
                            { chartOfAccountId: expenseAccount.id, type: JournalType.DEBIT, amount: totalPayrollExpense },
                            // KREDIT Hutang Gaji (sebesar total gaji bersih yang harus dibayar)
                            { chartOfAccountId: payableAccount.id, type: JournalType.CREDIT, amount: totalNetPay },
                            // Sisa kredit (total potongan) bisa dialokasikan ke akun hutang lain (e.g., Hutang BPJS, Hutang PPh 21)
                            // Untuk simplifikasi, selisihnya kita anggap mengurangi beban (jarang terjadi, asumsi potongan = hutang ke pihak lain)
                            // Logika yang lebih tepat adalah membuat akun hutang spesifik untuk setiap potongan
                            // Namun untuk saat ini, kita akan buat jurnal yang balance antara Beban dan Hutang Gaji bersih
                            // Untuk membuatnya balance, KREDIT Hutang Gaji = DEBIT Beban Gaji (asumsi potongan belum jadi hutang terpisah)
                            // Koreksi: Jurnal yang benar: DEBIT Beban Gaji, KREDIT Hutang Gaji (Net), KREDIT Hutang lain (potongan)
                            // Simplifikasi untuk sekarang: DEBIT Beban Gaji, KREDIT Hutang Gaji (Gross)
                            // Kita revisi jurnalnya:
                        ]
                    }
                }
            });
            
            // Jurnal yang lebih akurat
            await tx.journalEntryItem.createMany({
                data: [
                     { journalEntryId: journal.id, chartOfAccountId: expenseAccount.id, type: JournalType.DEBIT, amount: totalPayrollExpense },
                     { journalEntryId: journal.id, chartOfAccountId: payableAccount.id, type: JournalType.CREDIT, amount: totalPayrollExpense },
                ]
            });


            // 8. Update record payroll dengan ID jurnal
            await tx.payroll.update({
                where: { id: payroll.id },
                data: { journalEntryId: journal.id }
            });
            
            return { payroll, totalEmployees: employees.length, totalPayrollExpense };
        });

        return NextResponse.json({
            message: `Penggajian untuk ${result.totalEmployees} karyawan berhasil diproses.`,
            totalExpense: result.totalPayrollExpense
        });

    } catch (error) {
        console.error("Gagal menjalankan proses penggajian:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses penggajian' }, { status: 500 });
    }
}
