// File: app/api/v1/clinic/dashboard-stats/route.ts
// (REVISI - Tambah data untuk Aktivitas Terkini & Grafik Mingguan)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
        return NextResponse.json({ error: 'Parameter branchId wajib ada' }, { status: 400 });
    }
    const branchIdInt = parseInt(branchId, 10);
    if (isNaN(branchIdInt)) {
        return NextResponse.json({ error: 'Parameter branchId tidak valid' }, { status: 400 });
    }

    try {
        // --- Tanggal & Rentang ---
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const sevenDaysAgo = startOfDay(subDays(today, 6)); // 7 hari termasuk hari ini

        // --- Query Statistik Dasar (Sama seperti sebelumnya) ---
        const totalPatients = await prisma.patient.count({ where: { branchId: branchIdInt } });
        const todaysAppointments = await prisma.appointment.count({
            where: {
                branchId: branchIdInt,
                appointmentDate: { gte: todayStart, lte: todayEnd },
            },
        });
        const todaysPayments = await prisma.payment.findMany({
            where: {
                invoice: { branchId: branchIdInt },
                paymentDate: { gte: todayStart, lte: todayEnd },
            },
            select: { amount: true },
        });
        const todaysRevenue = todaysPayments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
        const pendingLabOrders = await prisma.labOrder.count({
            where: {
                status: { in: ['ORDERED', 'PENDING_VALIDATION'] },
                medicalRecord: { patient: { branchId: branchIdInt } },
            },
        });

        // --- TAMBAHAN 1: Query untuk "Aktivitas Terkini" ---
        const recentActivities = await prisma.payment.findMany({
            where: {
                invoice: { branchId: branchIdInt },
            },
            take: 5, // Ambil 5 terbaru
            orderBy: { paymentDate: 'desc' },
            include: {
                invoice: {
                    select: {
                        invoiceNumber: true,
                        patient: { select: { fullName: true } },
                    },
                },
            },
        });

        // --- TAMBAHAN 2: Query & Proses Data untuk "Grafik Mingguan" ---
        const weeklyPayments = await prisma.payment.findMany({
            where: {
                invoice: { branchId: branchIdInt },
                paymentDate: { gte: sevenDaysAgo },
            },
            select: {
                amount: true,
                paymentDate: true,
            },
        });

        // Proses agregasi data per hari
        const dailyRevenue: { [key: string]: Decimal } = {};
        for (const payment of weeklyPayments) {
            const day = format(new Date(payment.paymentDate), 'yyyy-MM-dd');
            if (!dailyRevenue[day]) {
                dailyRevenue[day] = new Decimal(0);
            }
            dailyRevenue[day] = dailyRevenue[day].add(payment.amount);
        }

        // Buat struktur data final untuk chart (pastikan 7 hari terakhir ada, walau 0)
        const weeklyRevenueChartData = Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(today, i);
            const dayKey = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'EEE, d MMM', { locale: idLocale }); // Format: "Min, 13 Okt"
            return {
                date: dayName,
                total: dailyRevenue[dayKey]?.toNumber() ?? 0,
            };
        }).reverse(); // Balik urutannya dari yang terlama ke terbaru


        // --- Gabungkan semua hasil ---
        const stats = {
            totalPatients,
            todaysAppointments,
            todaysRevenue: todaysRevenue.toString(),
            pendingLabOrders,
            recentActivities: recentActivities.map(act => ({ // Serialisasi data
                id: act.id,
                patientName: act.invoice.patient.fullName,
                invoiceNumber: act.invoice.invoiceNumber,
                amount: act.amount.toString(),
                time: act.paymentDate,
            })),
            weeklyRevenue: weeklyRevenueChartData,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Gagal mengambil data statistik dashboard:", error);
        return NextResponse.json({ error: 'Gagal mengambil data statistik' }, { status: 500 });
    }
}
