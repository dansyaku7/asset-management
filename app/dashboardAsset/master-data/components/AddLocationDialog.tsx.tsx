// app/dashboardAsset/master-data/components/AddLocationDialog.tsx

"use client";
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Skema validasi menggunakan Zod
const formSchema = z.object({
  name: z.string().min(3, { message: "Nama cabang minimal harus 3 karakter." }),
  address: z.string().optional(),
});

interface AddLocationDialogProps {
  onSuccess: () => void; // Callback untuk refresh data di halaman utama
}

export function AddLocationDialog({ onSuccess }: AddLocationDialogProps) {
  // State untuk kontrol buka/tutup dialog secara manual
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  const { isSubmitting } = form.formState;

  // Fungsi yang dijalankan saat form di-submit
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/assets/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal menambahkan lokasi");
      }

      // Jika sukses:
      form.reset(); // Reset field form
      onSuccess(); // Panggil callback untuk refresh tabel
      setIsOpen(false); // Tutup dialog
    } catch (err: any) {
      // Di sini bisa ditambahkan notifikasi error (e.g., toast)
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#01449D] hover:bg-blue-800">
          + Tambah Lokasi Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Lokasi Baru</DialogTitle>
          <DialogDescription>
            Isi detail cabang atau lokasi baru untuk aset. Klik simpan jika
            sudah selesai.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Cabang</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Klinik YM Cibitung" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Jl. Raya Cibitung No. 123"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                className="bg-[#01449D] hover:bg-blue-800"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Lokasi"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
