// File: app/api/v1/assets/route.ts
// PERBAIKAN: Memperbaiki tipe data (parsing to Int) untuk productionYear dan field lain

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus, JournalType, PaymentAccountMapping } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { addMonths, subMonths, isAfter } from "date-fns";
import { verifyAuth } from "@/lib/auth-helper";

const generateBarcode = (productName: string): string => {
  const prefix = productName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
};

// --- FUNGSI GET (LENGKAP - TIDAK BERUBAH) ---
export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        branch: true,
        maintenances: {
          where: {
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assetsWithCalculations = assets.map((asset) => {
        const hasActiveMaintenance = asset.maintenances.some((maint) => {
            if (maint.status === "IN_PROGRESS") return true;
            if (maint.status === "SCHEDULED" && maint.scheduledDate) {
              const scheduledDate = new Date(maint.scheduledDate);
              scheduledDate.setHours(0, 0, 0, 0);
              return scheduledDate <= today;
            }
            return false;
          });
    
        let baseStatus = asset.status;
        if (hasActiveMaintenance) {
          baseStatus = AssetStatus.PERBAIKAN;
        }
    
        let finalStatus = baseStatus;
        let notification: { type: "warning" | "error"; message: string } | null = null;
    
        if (asset.calibrationDate && asset.calibrationPeriod) {
          const expiryDate = addMonths(new Date(asset.calibrationDate), asset.calibrationPeriod);
          const warningDate = subMonths(expiryDate, 3);
    
          if (isAfter(today, expiryDate)) {
            finalStatus = AssetStatus.KALIBRASI_EXPIRED;
            notification = {
              type: "error",
              message: `Kalibrasi berakhir pada ${expiryDate.toLocaleDateString("id-ID")}.`,
            };
          } else if (isAfter(today, warningDate)) {
            notification = {
              type: "warning",
              message: `Kalibrasi akan berakhir pada ${expiryDate.toLocaleDateString("id-ID")}.`,
            };
          }
        }

      const price = asset.price.toNumber();
      const salvageValue = asset.salvageValue.toNumber();
      const usefulLifeInYears = asset.usefulLife > 0 ? asset.usefulLife / 12 : 0;
      const annualDepreciation = usefulLifeInYears > 0 ? (price - salvageValue) / usefulLifeInYears : 0;
      const ageInYears = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      let accumulatedDepreciation = Math.max(0, annualDepreciation * ageInYears);
      if (accumulatedDepreciation > price - salvageValue) {
        accumulatedDepreciation = price - salvageValue;
      }
      const currentValue = price - accumulatedDepreciation;
      const { maintenances, ...restOfAsset } = asset;
      
      const qrCodeValue = [
        `Nama Produk: ${asset.productName}`,
        `Cabang: ${asset.branch.name}`,
        `Posisi: ${asset.position || '--'}`,
        `Kelengkapan: ${asset.accessories || '--'}`
      ].join('\n');

      return {
        ...restOfAsset,
        price,
        salvageValue,
        currentValue,
        accumulatedDepreciation,
        qrCodeValue,
        status: finalStatus,
        notification,
      };
    });

    const summary = assetsWithCalculations.reduce( (acc, asset) => {
        acc.totalInitialValue += asset.price;
        acc.totalCurrentValue += asset.currentValue;
        acc.totalDepreciation += asset.accumulatedDepreciation;
        return acc;
      }, { totalInitialValue: 0, totalCurrentValue: 0, totalDepreciation: 0 }
    );

    return NextResponse.json({ summary, assets: assetsWithCalculations });
  } catch (error) {
    console.error("Gagal mengambil data aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken || !decodedToken.userId) {
        return NextResponse.json({ message: "Anda harus login terlebih dahulu" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: decodedToken.userId }, include: { role: true } });
        if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
        const allowedRoles = ["SUPER_ADMIN", "ASET_MANAJEMEN", "ADMIN"];
        if (!allowedRoles.includes(user.role.name)) return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

        const body = await req.json();
        const {
            productName, purchaseDate, branchId, assetType, price,
            usefulLife, salvageValue, paymentMethod,
            picName, picContact, status, imageUrl, productionYear,
            distributor, calibrationDate, calibrationPeriod, accessories, position
        } = body;

        if (!productName || !branchId || !paymentMethod) {
            return NextResponse.json({ message: "Nama Produk, Cabang, dan Metode Pembayaran wajib diisi" }, { status: 400 });
        }
        const priceDecimal = new Decimal(price);
        const branchIdNum = parseInt(branchId, 10);

        const newAsset = await prisma.$transaction(async (tx) => {
            const asset = await tx.asset.create({
                data: {
                    productName,
                    barcode: generateBarcode(productName),
                    purchaseDate: new Date(purchaseDate),
                    branchId: branchIdNum,
                    assetType,
                    price: priceDecimal,
                    usefulLife: parseInt(usefulLife, 10),
                    salvageValue: new Decimal(salvageValue),
                    paymentMethod,
                    picName: picName || null,
                    picContact: picContact || null,
                    status: status || 'BAIK',
                    imageUrl: imageUrl || null,
                    // Pastikan diubah ke Int atau Null
                    productionYear: productionYear ? parseInt(productionYear) : null,
                    distributor: distributor || null,
                    calibrationDate: calibrationDate ? new Date(calibrationDate) : null,
                    calibrationPeriod: calibrationPeriod ? parseInt(calibrationPeriod) : null,
                    accessories: accessories || null,
                    position: position || null,
                },
            });

            await tx.assetLog.create({
                data: {
                    assetId: asset.id,
                    activity: "Aset Baru",
                    description: `Aset "${asset.productName}" telah ditambahkan.`,
                    recordedById: decodedToken.userId,
                },
            });

            // LOGIKA JURNAL OTOMATIS (tidak berubah)
            const debitAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.FIXED_ASSET } });
            const creditCashAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.CASH_RECEIPT } });
            const creditPayableAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.ACCOUNTS_PAYABLE } });

            if (!debitAccount) throw new Error("Akun Aset Tetap (FIXED_ASSET) belum di-mapping di COA.");
            
            let creditAccount;
            if (paymentMethod === 'CASH') {
                if (!creditCashAccount) throw new Error("Akun Kas (CASH_RECEIPT) belum di-mapping di COA.");
                creditAccount = creditCashAccount;
            } else { // CREDIT
                if (!creditPayableAccount) throw new Error("Akun Hutang Usaha (ACCOUNTS_PAYABLE) belum di-mapping di COA.");
                creditAccount = creditPayableAccount;
            }

            await tx.journalEntry.create({
                data: {
                    branchId: asset.branchId,
                    transactionDate: asset.purchaseDate,
                    description: `Pembelian aset baru: ${asset.productName}`,
                    items: {
                        create: [
                            { chartOfAccountId: debitAccount.id, type: JournalType.DEBIT, amount: asset.price },
                            { chartOfAccountId: creditAccount.id, type: JournalType.CREDIT, amount: asset.price },
                        ]
                    }
                }
            });

            // LOGIKA "DUMMY" PURCHASE INVOICE (tidak berubah)
            if (paymentMethod === 'CREDIT') {
                const defaultSupplier = await tx.supplier.findFirst();
                if (!defaultSupplier) {
                    throw new Error("Tidak ada supplier di database. Harap buat minimal satu supplier di Master Data.");
                }
                
                await tx.purchaseInvoice.create({
                    data: {
                        internalRefNumber: `ASET-${asset.barcode}`,
                        invoiceNumber: `ASET-${asset.id.substring(0, 8)}`,
                        supplierId: defaultSupplier.id,
                        branchId: asset.branchId,
                        transactionDate: asset.purchaseDate,
                        totalAmount: asset.price,
                        paymentMethod: 'CREDIT',
                        status: 'UNPAID',
                    }
                });
            }
            
            return asset;
        });

        return NextResponse.json(newAsset, { status: 201 });
    } catch (error) {
        console.error("Gagal membuat aset:", error);
        return NextResponse.json({ message: error instanceof Error ? error.message : "Terjadi kesalahan pada server" }, { status: 500 });
    }
}

