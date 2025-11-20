// File: app/api/v1/clinic/rme/[branchId]/[patientId]/route.ts
// (REVISI FINAL - Implementasi Pengurangan Stok Obat)

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth-helper';
import { Decimal } from '@prisma/client/runtime/library';

// --- FUNGSI GET (Sudah Benar) ---
export async function GET(request: NextRequest, { params }: { params: { patientId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    const patientId = parseInt(params.patientId, 10);
    if (isNaN(patientId)) {
        return NextResponse.json({ error: 'ID Pasien tidak valid' }, { status: 400 });
    }
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { registeredAtBranch: true }
        });
        if (!patient) {
            return NextResponse.json({ error: 'Pasien tidak ditemukan.' }, { status: 404 });
        }
        const records = await prisma.medicalRecord.findMany({
            where: { patientId: patientId },
            include: {
                doctor: { include: { user: { select: { fullName: true } } } },
                prescriptions: { include: { items: { include: { drug: true } } } },
                labOrders: { include: { labService: true } }
            },
            orderBy: { visitDate: 'desc' },
        });
        return NextResponse.json({ patient, records });
    } catch (error) {
        console.error("Gagal mengambil data RME:", error);
        return NextResponse.json({ error: 'Gagal mengambil data rekam medis' }, { status: 500 });
    }
}

// --- FUNGSI POST (DENGAN LOGIKA PENGURANGAN STOK) ---
export async function POST(request: NextRequest, { params }: { params: { branchId: string, patientId: string } }) {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) { 
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const patientId = parseInt(params.patientId, 10);
    const dispensingBranchId = parseInt(params.branchId, 10);
    if (isNaN(patientId) || isNaN(dispensingBranchId)) {
        return NextResponse.json({ error: 'Parameter tidak valid di URL.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { 
            anamnesis, physicalExam, diagnosis, actions, doctorId, visitDate, 
            prescriptionItems = [],
            labOrders = [],
            appointmentId
        } = body;

        if (!doctorId || !anamnesis || !appointmentId) {
            return NextResponse.json({ error: 'Dokter, Anamnesis, dan ID Janji Temu wajib diisi' }, { status: 400 });
        }
        
        // Perhitungan total dan invoice item (logika ini sudah benar)
        let totalAmount = new Decimal(0);
        const invoiceItemsData: any[] = [];
        const consultationService = await prisma.service.findFirst({ where: { name: { contains: "Konsultasi" } } });
        if (!consultationService) throw new Error("Master Jasa 'Konsultasi' tidak ditemukan.");
        invoiceItemsData.push({ description: consultationService.name, serviceId: consultationService.id, quantity: 1, price: consultationService.price, total: consultationService.price });
        totalAmount = totalAmount.add(consultationService.price);
        if (prescriptionItems.length > 0) {
            const drugIds = prescriptionItems.map((item: any) => parseInt(item.drugId, 10));
            const drugs = await prisma.drug.findMany({ where: { id: { in: drugIds } } });
            const drugPriceMap = new Map(drugs.map(d => [d.id, d]));
            for (const item of prescriptionItems) {
                const drug = drugPriceMap.get(parseInt(item.drugId, 10));
                if (!drug) throw new Error(`Obat dengan ID ${item.drugId} tidak ditemukan.`);
                const itemTotal = drug.sellingPrice.mul(parseInt(item.quantity, 10));
                invoiceItemsData.push({ description: drug.name, drugId: drug.id, quantity: parseInt(item.quantity, 10), price: drug.sellingPrice, total: itemTotal });
                totalAmount = totalAmount.add(itemTotal);
            }
        }
        if (labOrders.length > 0) {
            const labServiceIds = labOrders.map((order: any) => parseInt(order.labServiceId, 10));
            const labServices = await prisma.labService.findMany({ where: { id: { in: labServiceIds } } });
            const labPriceMap = new Map(labServices.map(l => [l.id, l]));
            for (const order of labOrders) {
                const lab = labPriceMap.get(parseInt(order.labServiceId, 10));
                if (!lab) throw new Error(`Layanan Lab dengan ID ${order.labServiceId} tidak ditemukan.`);
                invoiceItemsData.push({ description: lab.name, quantity: 1, price: lab.price, total: lab.price });
                totalAmount = totalAmount.add(lab.price);
            }
        }

        const newRecord = await prisma.$transaction(async (tx) => {
            
            // =======================================================
            // VVVV--- LOGIKA PENGURANGAN STOK BARU DITAMBAHKAN ---VVVV
            // =======================================================
            if (prescriptionItems.length > 0) {
                for (const item of prescriptionItems) {
                    const drugId = parseInt(item.drugId, 10);
                    let quantityToDeduct = parseInt(item.quantity, 10);

                    // Ambil semua stok untuk obat ini di cabang ini, urutkan dari yang paling cepat expired
                    const stocks = await tx.drugStock.findMany({
                        where: {
                            drugId: drugId,
                            branchId: dispensingBranchId,
                            quantity: { gt: 0 } // Hanya ambil yang stoknya masih ada
                        },
                        orderBy: {
                            expiryDate: 'asc' // FEFO (First Expired First Out)
                        }
                    });

                    // Cek total stok
                    const totalStock = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
                    if (totalStock < quantityToDeduct) {
                        const drug = await tx.drug.findUnique({ where: { id: drugId } });
                        throw new Error(`Stok untuk obat "${drug?.name}" tidak mencukupi. Stok tersedia: ${totalStock}, dibutuhkan: ${quantityToDeduct}.`);
                    }

                    // Lakukan pengurangan stok
                    for (const stock of stocks) {
                        if (quantityToDeduct <= 0) break;

                        const amountToTake = Math.min(stock.quantity, quantityToDeduct);
                        
                        await tx.drugStock.update({
                            where: { id: stock.id },
                            data: {
                                quantity: stock.quantity - amountToTake
                            }
                        });
                        
                        quantityToDeduct -= amountToTake;
                    }
                }
            }
            // =======================================================
            // ^^^^--- AKHIR LOGIKA PENGURANGAN STOK ---^^^^
            // =======================================================


            // 1. Buat Medical Record
            const record = await tx.medicalRecord.create({
                data: {
                    patientId, doctorId: Number(doctorId), visitDate: new Date(visitDate || Date.now()),
                    anamnesis, physicalExam, diagnosis, actions,
                },
            });

            // 2. Buat Resep & Lab Orders
            if (prescriptionItems.length > 0) {
                await tx.prescription.create({
                    data: {
                        medicalRecordId: record.id,
                        items: { create: prescriptionItems.map((item: any) => ({ drugId: parseInt(item.drugId, 10), quantity: parseInt(item.quantity, 10), dosage: item.dosage, })) },
                    },
                });
            }
            if (labOrders.length > 0) {
                await tx.labOrder.createMany({
                    data: labOrders.map((order: any) => ({ medicalRecordId: record.id, labServiceId: parseInt(order.labServiceId, 10), notes: order.notes, }))
                });
            }

            // 3. Buat atau Update Invoice (logika ini sudah benar)
            const existingInvoice = await tx.invoice.findUnique({
                where: { appointmentId: Number(appointmentId) }
            });
            if (existingInvoice) {
                await tx.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
                await tx.invoice.update({
                    where: { id: existingInvoice.id },
                    data: { totalAmount: totalAmount, items: { create: invoiceItemsData } }
                });
            } else {
                await tx.invoice.create({
                    data: {
                        invoiceNumber: `INV-${Date.now()}-${patientId}`,
                        patientId,
                        branchId: dispensingBranchId,
                        appointmentId: Number(appointmentId),
                        totalAmount: totalAmount,
                        status: 'UNPAID',
                        items: { create: invoiceItemsData }
                    }
                });
            }

            // 4. Update Status Appointment
            await tx.appointment.update({
                where: { id: Number(appointmentId) },
                data: { status: 'COMPLETED' }
            });
            
            return record;
        });

        return NextResponse.json(newRecord, { status: 201 });

    } catch (error) {
        console.error("Gagal menyimpan RME & Invoice:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan data' }, { status: 500 });
    }
}

