// app/api/assets/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } } // <--- INI PERUBAHAN UTAMANYA
) {
  try {
    const { id } = context.params; // <--- dan cara mengambil 'id' nya
    const body = await req.json();

    const dataToUpdate: any = {};

    if (body.productName !== undefined) dataToUpdate.productName = body.productName;
    if (body.purchaseDate !== undefined) dataToUpdate.purchaseDate = new Date(body.purchaseDate);
    if (body.locationId !== undefined) dataToUpdate.locationId = parseInt(body.locationId, 10);
    if (body.assetType !== undefined) dataToUpdate.assetType = body.assetType;
    if (body.price !== undefined) dataToUpdate.price = new Decimal(body.price);
    if (body.usefulLife !== undefined) dataToUpdate.usefulLife = parseInt(body.usefulLife, 10);
    if (body.salvageValue !== undefined) dataToUpdate.salvageValue = new Decimal(body.salvageValue);
    if (body.picName !== undefined) dataToUpdate.picName = body.picName;
    if (body.picContact !== undefined) dataToUpdate.picContact = body.picContact;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    
    const updatedAsset = await prisma.asset.update({
      where: { id: id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Gagal update aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } } // <-- Sekalian kita seragamkan
) {
  try {
    const { id } = context.params;
    await prisma.maintenance.deleteMany({
      where: { assetId: id },
    });
    
    await prisma.asset.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: "Aset berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Gagal menghapus aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}