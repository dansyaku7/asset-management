// File: app/api/v1/assets/[id]/route.ts
// PERBAIKAN: Fungsi DELETE dirombak total untuk menjadi proses Pelepasan Aset dengan Jurnal Pembalik

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus, JournalType, PaymentAccountMapping } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { verifyAuth } from "@/lib/auth-helper";

// --- (Fungsi PUT tidak berubah, biarkan saja) ---
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Akses ditolak: Anda harus login." }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();

    const currentAsset = await prisma.asset.findUnique({
      where: { id: id },
    });

    if (!currentAsset) {
      return NextResponse.json({ message: "Aset tidak ditemukan" }, { status: 404 });
    }
    
    const dataToUpdate = {
      ...body,
      price: body.price ? new Decimal(body.price) : undefined,
      salvageValue: body.salvageValue ? new Decimal(body.salvageValue) : undefined,
      usefulLife: body.usefulLife ? parseInt(body.usefulLife) * 12 : undefined,
      branchId: body.branchId ? parseInt(body.branchId) : undefined,
      locationId: undefined, 
      productionYear: body.productionYear ? parseInt(body.productionYear) : null,
      calibrationPeriod: body.calibrationPeriod ? parseInt(body.calibrationPeriod) : null,
      calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
    };
    // Hapus field yang tidak relevan dari body sebelum update
    delete dataToUpdate.id;
    delete dataToUpdate.createdAt;
    delete dataToUpdate.updatedAt;
    delete dataToUpdate.barcode;


    const updatedAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: id },
        data: dataToUpdate,
      });

      // Logika pembuatan log
      await tx.assetLog.create({
        data: {
          assetId: asset.id,
          recordedById: decodedToken.userId,
          activity: "Update Aset",
          description: `Detail aset "${asset.productName}" telah diperbarui.`,
        },
      });
      
      const newStatus = body.status;
      if (newStatus && currentAsset.status !== newStatus) {
        let logDescription = "";
        if (newStatus === AssetStatus.DIPINJAM) logDescription = `Dipinjam oleh ${body.picName || 'staf'}.`;
        else if (newStatus === AssetStatus.RUSAK) logDescription = `Status diubah menjadi Rusak.`;
        else if (newStatus === AssetStatus.BAIK && currentAsset.status === AssetStatus.DIPINJAM) logDescription = `Aset telah dikembalikan.`;
        
        if (logDescription) {
          await tx.assetLog.create({
            data: { 
              assetId: asset.id, 
              recordedById: decodedToken.userId,
              activity: `Perubahan Status`, 
              description: logDescription 
            },
          });
        }
      }
      return asset;
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Gagal update aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

// --- (Fungsi DELETE dirombak total) ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ message: "Akses ditolak: Anda harus login." }, { status: 401 });
  }

  try {
    const { id } = params;

    const result = await prisma.$transaction(async (tx) => {
        // 1. Ambil data aset yang akan dihapus
        const asset = await tx.asset.findUnique({ where: { id } });
        if (!asset) {
            throw new Error("Aset tidak ditemukan");
        }

        // 2. Cari semua akun COA yang dibutuhkan untuk jurnal pembalik
        const fixedAssetAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.FIXED_ASSET } });
        const accumulatedDepreciationAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.ACCUMULATED_DEPRECIATION } });
        const disposalLossAccount = await tx.chartOfAccount.findFirst({ where: { paymentMapping: PaymentAccountMapping.ASSET_DISPOSAL_LOSS } });

        if (!fixedAssetAccount || !accumulatedDepreciationAccount || !disposalLossAccount) {
            throw new Error("Satu atau lebih akun mapping untuk pelepasan aset (Aset Tetap, Akumulasi, Rugi Pelepasan) tidak ditemukan di COA.");
        }

        // 3. Hitung total akumulasi penyusutan yang PERNAH dicatat untuk aset ini
        // Ini adalah cara sederhana, di dunia nyata bisa lebih kompleks
        // Kita hitung ulang berdasarkan data yang ada
        const price = asset.price;
        const salvageValue = asset.salvageValue;
        const usefulLifeInMonths = asset.usefulLife;
        let accumulatedDepreciation = new Decimal(0);
        let bookValue = new Decimal(price);

        if (usefulLifeInMonths > 0) {
            const monthlyDepreciation = price.minus(salvageValue).dividedBy(usefulLifeInMonths);
            const ageInMonths = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            
            accumulatedDepreciation = monthlyDepreciation.mul(new Decimal(ageInMonths > 0 ? ageInMonths : 0));
            
            const maxDepreciation = price.minus(salvageValue);
            if (accumulatedDepreciation.greaterThan(maxDepreciation)) {
                accumulatedDepreciation = maxDepreciation;
            }
            bookValue = price.minus(accumulatedDepreciation);
        }
        
        // Rugi pelepasan aset adalah sisa nilai buku
        const disposalLoss = bookValue; 
        
        // 4. Buat Jurnal Pembalik (Jurnal Pelepasan Aset)
        await tx.journalEntry.create({
            data: {
                branchId: asset.branchId,
                transactionDate: new Date(),
                description: `Pelepasan/Penghapusan Aset: ${asset.productName}`,
                items: {
                    create: [
                        // DEBIT Akumulasi Penyusutan (untuk menolkan)
                        { chartOfAccountId: accumulatedDepreciationAccount.id, type: JournalType.DEBIT, amount: accumulatedDepreciation },
                        // DEBIT Rugi Pelepasan Aset (sebesar sisa nilai buku)
                        { chartOfAccountId: disposalLossAccount.id, type: JournalType.DEBIT, amount: disposalLoss },
                        // KREDIT Aset Tetap (untuk menghapus nilai aset dari neraca)
                        { chartOfAccountId: fixedAssetAccount.id, type: JournalType.CREDIT, amount: asset.price },
                    ]
                }
            }
        });

        // 5. Hapus semua data terkait
        await tx.assetLog.deleteMany({ where: { assetId: id } });
        await tx.maintenance.deleteMany({ where: { assetId: id } });

        // 6. Hapus aset itu sendiri
        await tx.asset.delete({ where: { id: id } });

        return { message: `Aset "${asset.productName}" berhasil dilepaskan dan jurnal pembalik telah dibuat.` };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Gagal menghapus aset:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
