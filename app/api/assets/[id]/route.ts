// File: app/api/assets/[id]/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { verifyAuth } from "@/lib/auth-helper";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
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
        usefulLife: body.usefulLife ? parseInt(body.usefulLife) : undefined,
        locationId: body.locationId ? parseInt(body.locationId) : undefined,
        productionYear: body.productionYear ? parseInt(body.productionYear) : null,
        calibrationPeriod: body.calibrationPeriod ? parseInt(body.calibrationPeriod) : null,
        calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
        imageUrl: body.imageUrl || null,
        distributor: body.distributor || null,
        picName: body.picName || null,
        picContact: body.picContact || null,
        accessories: body.accessories || null,
        position: body.position || null,
    };

    const updatedAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: id },
        data: dataToUpdate,
      });

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