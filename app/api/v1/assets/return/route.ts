// File: app/api/v1/assets/return/route.ts
// API baru untuk proses pengembalian aset

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { verifyAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken || !decodedToken.userId) {
        return NextResponse.json({ message: "Otentikasi gagal, silakan login kembali." }, { status: 401 });
    }

    try {
        const userId = Number(decodedToken.userId);
        const { assetId } = await req.json();

        if (!assetId) {
            return NextResponse.json({ message: "ID Aset wajib diisi." }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const assetToReturn = await tx.asset.findUnique({
                where: { id: assetId },
            });

            if (!assetToReturn) throw new Error("Aset tidak ditemukan.");
            if (assetToReturn.status !== AssetStatus.DIPINJAM) {
                throw new Error(`Aset tidak dalam status DIPINJAM.`);
            }

            // Temukan log peminjaman terakhir untuk aset ini untuk mencari cabang asal
            const lastBorrowLog = await tx.assetLog.findFirst({
                where: {
                    assetId: assetId,
                    activity: { contains: "Dipinjam" }
                },
                orderBy: { createdAt: 'desc' }
            });

            let originalBranchId = assetToReturn.branchId; // Default ke cabang sekarang jika log tidak ditemukan

            if (lastBorrowLog) {
                const match = lastBorrowLog.description.match(/dari cabang asal (.*?)\./);
                if (match && match[1]) {
                    const originalBranch = await tx.branch.findUnique({
                        where: { name: match[1] }
                    });
                    if (originalBranch) {
                        originalBranchId = originalBranch.id;
                    }
                }
            }

            // Update status aset kembali ke BAIK dan kembalikan ke cabang asalnya
            const updatedAsset = await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: AssetStatus.BAIK,
                    picName: null, // Kosongkan lagi PIC peminjam
                    picContact: null,
                    branchId: originalBranchId, // Kembalikan ke cabang asal
                },
            });

            // Buat log bahwa aset telah dikembalikan
            await tx.assetLog.create({
                data: {
                    assetId: assetId,
                    recordedById: userId,
                    activity: "Aset Dikembalikan",
                    description: `Aset "${updatedAsset.productName}" telah dikembalikan.`,
                },
            });

            return updatedAsset;
        });

        return NextResponse.json(result, { status: 200 });

    } catch (error: any) {
        console.error("Gagal memproses pengembalian:", error);
        return NextResponse.json({ message: error.message || "Terjadi kesalahan pada server." }, { status: 500 });
    }
}