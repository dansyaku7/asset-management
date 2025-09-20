// File: app/api/assets/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { addMonths, subMonths, isAfter } from "date-fns";

const generateBarcode = (productName: string): string => {
  const prefix = productName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
};

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        location: true,
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
      const usefulLife = asset.usefulLife;
      const annualDepreciation = usefulLife > 0 ? (price - salvageValue) / usefulLife : 0;
      const ageInYears = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      let accumulatedDepreciation = Math.max(0, annualDepreciation * ageInYears);
      if (accumulatedDepreciation > price - salvageValue) {
        accumulatedDepreciation = price - salvageValue;
      }
      const currentValue = price - accumulatedDepreciation;
      const { maintenances, ...restOfAsset } = asset;

      return {
        ...restOfAsset,
        price,
        salvageValue,
        currentValue,
        accumulatedDepreciation,
        qrCodeValue: `${asset.productName} - ${asset.location.name}`,
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productName, purchaseDate, locationId, assetType, price,
      usefulLife, salvageValue, picName, picContact, status,
      imageUrl, productionYear, distributor, calibrationDate, calibrationPeriod,
    } = body;

    if (!productName || !locationId) {
      return NextResponse.json({ message: "Nama Produk dan Lokasi wajib diisi" }, { status: 400 });
    }

    const barcode = generateBarcode(productName);

    const newAsset = await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
            data: {
                productName, barcode, purchaseDate: new Date(purchaseDate),
                locationId: parseInt(locationId, 10), assetType,
                price: new Decimal(price), usefulLife: parseInt(usefulLife, 10),
                salvageValue: new Decimal(salvageValue), picName, picContact, status,
                imageUrl: imageUrl || null,
                productionYear: productionYear ? parseInt(productionYear) : null,
                distributor: distributor || null,
                calibrationDate: calibrationDate ? new Date(calibrationDate) : null,
                calibrationPeriod: calibrationPeriod ? parseInt(calibrationPeriod) : null,
            },
        });
        await tx.assetLog.create({
            data: {
                assetId: asset.id, activity: "Pembelian Baru",
                description: `Aset "${asset.productName}" telah ditambahkan.`,
                createdAt: asset.purchaseDate,
            },
        });
        return asset;
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat aset:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}