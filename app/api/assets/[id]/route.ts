// File: app/api/assets/[id]/route.ts

import { NextResponse, NextRequest } from "next/server"; // <-- IMPORT NextRequest
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { verifyAuth } from "@/lib/auth-helper"; // <-- IMPORT BARU

export async function PUT(
  req: NextRequest, // <-- UBAH KE NextRequest
  { params }: { params: { id: string } }
) {
  // --- PENAMBAHAN LOGIKA OTORISASI ---
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
  }
  // --- AKHIR PENAMBAHAN ---

  try {
    const { id } = params;
    const body = await req.json();

    const currentAsset = await prisma.asset.findUnique({
      where: { id: id },
    });

    if (!currentAsset) {
      return NextResponse.json({ message: "Aset tidak ditemukan" }, { status: 404 });
    }
    
    // Konversi string kosong atau nilai undefined menjadi null atau tipe data yang benar
    const dataToUpdate = {
        ...body,
        price: body.price ? new Decimal(body.price) : undefined,
        salvageValue: body.salvageValue ? new Decimal(body.salvageValue) : undefined,
        usefulLife: body.usefulLife ? parseInt(body.usefulLife) : undefined,
        locationId: body.locationId ? parseInt(body.locationId) : undefined,
        productionYear: body.productionYear ? parseInt(body.productionYear) : null,
        calibrationPeriod: body.calibrationPeriod ? parseInt(body.calibrationPeriod) : null,
        calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
        imageUrl: body.imageUrl || null,
        distributor: body.distributor || null,
        picName: body.picName || null,
        picContact: body.picContact || null,
    };

    const updatedAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: id },
        data: dataToUpdate,
      });

      // --- PENAMBAHAN LOG JURNAL UNTUK EDIT ASET ---
      await tx.assetLog.create({
        data: {
          assetId: asset.id,
          userId: decodedToken.userId, // <-- Ambil dari token
          activity: "Update Aset",
          description: `Detail aset "${asset.productName}" telah diperbarui.`,
        },
      });
      // --- AKHIR PENAMBAHAN JURNAL ---

      // Logika lama untuk perubahan status bisa tetap di sini jika dibutuhkan
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
                userId: decodedToken.userId, // <-- Jangan lupa tambahkan userId juga di sini
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.$transaction(async (tx) => {
      await tx.assetLog.deleteMany({ where: { assetId: id } });
      await tx.maintenance.deleteMany({ where: { assetId: id } });
      await tx.asset.delete({ where: { id: id } });
    });
    return NextResponse.json({ message: "Aset berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Gagal menghapus aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}