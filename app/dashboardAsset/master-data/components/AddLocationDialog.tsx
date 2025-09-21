"use client";
import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Location } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(3, { message: "Nama cabang minimal harus 3 karakter." }),
  address: z.string().optional(),
});

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationToEdit: Location | null;
}

export function AddLocationDialog({ isOpen, onClose, onSuccess, locationToEdit }: LocationDialogProps) {
  const isEditing = !!locationToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (isEditing) {
          form.reset({
            name: locationToEdit.name,
            address: locationToEdit.address || "",
          });
        } else {
          form.reset({ name: "", address: "" });
        }
    }
  }, [locationToEdit, isOpen, form, isEditing]);


  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const url = isEditing ? `/api/assets/locations/${locationToEdit.id}` : "/api/assets/locations";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal menyimpan lokasi");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail cabang atau lokasi.' : 'Isi detail cabang atau lokasi baru untuk aset.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control} name="name"
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
              control={form.control} name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jl. Raya Cibitung No. 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button className="bg-[#01449D] hover:bg-blue-800" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Lokasi"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}