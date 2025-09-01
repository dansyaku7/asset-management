// app/dashboardAsset/components/AssetForm.tsx

"use client";
import { useState, useEffect } from 'react';
// --- PERBAIKAN DI SINI: Hapus kata kunci 'type' agar 'AssetStatus' bisa digunakan sebagai nilai ---
import { Location, Asset, AssetStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';

// Tipe untuk props yang diterima komponen
interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  assetToEdit?: (Omit<Asset, 'price' | 'salvageValue'> & { 
      location: Location; 
      price: number; 
      salvageValue: number;
  }) | null;
}

// Tipe data internal untuk state form
type AssetFormData = {
    productName: string;
    purchaseDate: string;
    locationId: string;
    assetType: string;
    price: string;
    usefulLife: string;
    salvageValue: string;
    picName: string;
    picContact: string;
    status: AssetStatus; // Menggunakan tipe enum langsung
};

export default function AssetForm({ isOpen, onClose, onFormSubmit, assetToEdit }: AssetFormProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    productName: '', purchaseDate: '', locationId: '', assetType: '',
    price: '', usefulLife: '', salvageValue: '',
    picName: '', picContact: '', status: 'BAIK',
  });
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/assets/locations');
        if (!res.ok) throw new Error("Gagal memuat data lokasi.");
        setLocations(await res.json());
      } catch (err: any) {
        setError(err.message);
      }
    }

    if (isOpen) {
        fetchLocations();
        if (assetToEdit) {
            setFormData({
                productName: assetToEdit.productName,
                purchaseDate: new Date(assetToEdit.purchaseDate).toISOString().split('T')[0],
                locationId: assetToEdit.locationId.toString(),
                assetType: assetToEdit.assetType,
                price: assetToEdit.price.toString(),
                usefulLife: assetToEdit.usefulLife.toString(),
                salvageValue: assetToEdit.salvageValue.toString(),
                picName: assetToEdit.picName || '',
                picContact: assetToEdit.picContact || '',
                status: assetToEdit.status,
            });
        } else {
            setFormData({
                productName: '', purchaseDate: '', locationId: '', assetType: '',
                price: '', usefulLife: '', salvageValue: '',
                picName: '', picContact: '', status: 'BAIK',
            });
        }
        setError(null);
    }
  }, [assetToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value as any }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const method = assetToEdit ? 'PUT' : 'POST';
    const url = assetToEdit ? `/api/assets/${assetToEdit.id}` : '/api/assets';
    
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan data aset');
      }
      onFormSubmit();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedLocationName = locations.find(loc => loc.id.toString() === formData.locationId)?.name || '...';
  const previewQrValue = `Nama Produk: ${formData.productName || '...'}, Lokasi: ${selectedLocationName}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-h-[95vh] flex flex-col"
        style={{ maxWidth: 'min(900px, 95vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">{assetToEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
            <form id="asset-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
              <div className="flex-grow space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                  <input type="text" name="productName" value={formData.productName} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi (Cabang)</label>
                      <select name="locationId" value={formData.locationId} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required>
                          <option value="">Pilih Cabang...</option>
                          {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tipe Aset</label>
                      <input type="text" name="assetType" placeholder="e.g., Elektronik" value={formData.assetType} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Nama PIC (Opsional)</label>
                      <input type="text" name="picName" value={formData.picName} onChange={handleChange} placeholder="Nama Penanggung Jawab" className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Kontak PIC (Opsional)</label>
                      <input type="text" name="picContact" value={formData.picContact} onChange={handleChange} placeholder="No. HP atau Email" className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Beli</label>
                      <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required>
                          {Object.values(AssetStatus).map(status => (
                              <option key={status} value={status}>{status}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli (Rp)</label>
                      <input type="number" name="price" placeholder="25000000" value={formData.price} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Masa Manfaat (Tahun)</label>
                      <input type="number" name="usefulLife" placeholder="5" value={formData.usefulLife} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Nilai Sisa (Rp)</label>
                      <input type="number" name="salvageValue" placeholder="2500000" value={formData.salvageValue} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                    </div>
                </div>
              </div>
              <div className="w-full lg:w-52 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border-dashed border-2 self-start">
                  <h4 className="font-bold mb-3 text-gray-700">Barcode Preview</h4>
                  <div className="p-2 bg-white border rounded-md">
                      <QRCodeSVG 
                        value={previewQrValue} 
                        size={160} 
                        level={"L"} 
                      />
                  </div>
                  <p className="text-xs text-center mt-3 text-gray-500">
                    Konten QR akan sesuai input.
                  </p>
              </div>
            </form>
        </div>
        <div className="flex justify-end gap-4 p-6 border-t bg-gray-50 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold">Batal</button>
            <button type="submit" form="asset-form" disabled={isSubmitting} className="px-6 py-2 bg-[#01449D] text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 font-semibold">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}