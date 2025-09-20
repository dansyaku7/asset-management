"use client";
import { useState, useEffect, useRef } from 'react';
import { Location, Asset, AssetStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';

// --- Ikon untuk tombol upload ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;


interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  assetToEdit?: (Omit<Asset, 'price' | 'salvageValue'> & { 
      location: Location; price: number; salvageValue: number;
  }) | null;
}

type AssetFormData = {
    productName: string; purchaseDate: string; locationId: string;
    assetType: string; price: string; usefulLife: string;
    salvageValue: string; picName: string; picContact: string;
    status: AssetStatus; imageUrl: string; productionYear: string;
    distributor: string; calibrationDate: string; calibrationPeriod: string;
};

export default function AssetForm({ isOpen, onClose, onFormSubmit, assetToEdit }: AssetFormProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    productName: '', purchaseDate: '', locationId: '', assetType: '',
    price: '', usefulLife: '', salvageValue: '', picName: '', 
    picContact: '', status: 'BAIK', imageUrl: '', productionYear: '',
    distributor: '', calibrationDate: '', calibrationPeriod: '',
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const computerInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
        productName: '', purchaseDate: '', locationId: '', assetType: '',
        price: '', usefulLife: '', salvageValue: '', picName: '', 
        picContact: '', status: 'BAIK', imageUrl: '', productionYear: '',
        distributor: '', calibrationDate: '', calibrationPeriod: '',
    });
    setImagePreview(null);
  }

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/assets/locations');
        if (!res.ok) throw new Error("Gagal memuat data lokasi.");
        setLocations(await res.json());
      } catch (err: any) { setError(err.message); }
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
                imageUrl: assetToEdit.imageUrl || '',
                productionYear: assetToEdit.productionYear?.toString() || '',
                distributor: assetToEdit.distributor || '',
                calibrationDate: assetToEdit.calibrationDate ? new Date(assetToEdit.calibrationDate).toISOString().split('T')[0] : '',
                calibrationPeriod: assetToEdit.calibrationPeriod?.toString() || '',
            });
            setImagePreview(assetToEdit.imageUrl || null);
        } else {
            resetForm();
        }
        setError(null);
    }
  }, [assetToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value as any }));
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsUploading(true);
    setError(null);

    try {
        const response = await fetch(`/api/assets/upload?filename=${file.name}`, {
            method: 'POST',
            body: file,
        });
        if (!response.ok) {
            throw new Error('Gagal mengunggah file.');
        }
        const newBlob = await response.json();
        setFormData(prev => ({ ...prev, imageUrl: newBlob.url }));
    } catch (err: any) {
        setError(err.message);
        setImagePreview(null);
    } finally {
        setIsUploading(false);
        event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const method = assetToEdit ? 'PUT' : 'POST';
    const url = assetToEdit ? `/api/assets/${assetToEdit.id}` : '/api/assets';
    
    // --- PERBAIKAN DI SINI ---
    // Buat objek baru untuk memastikan format tanggal sudah benar (ISO string)
    // sebelum dikirim ke backend.
    const dataToSend = {
      ...formData,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : '',
      calibrationDate: formData.calibrationDate ? new Date(formData.calibrationDate).toISOString() : '',
    };
    
    try {
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        // Kirim data yang sudah diformat dengan benar
        body: JSON.stringify(dataToSend),
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-h-[95vh] flex flex-col" style={{ maxWidth: 'min(900px, 95vw)' }}>
        <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">{assetToEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
            <form id="asset-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                <div className="flex-grow space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                        <input type="text" name="productName" value={formData.productName} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Aset (Opsional)</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-32 h-32 bg-gray-100 rounded-md flex items-center justify-center border-2 border-dashed overflow-hidden">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400"><UploadIcon /></div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <input type="file" accept="image/*" ref={computerInputRef} onChange={handleFileChange} className="hidden" />
                                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                                
                                <button type="button" onClick={() => computerInputRef.current?.click()} disabled={isUploading} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                                    <ComputerIcon/> Pilih dari Komputer
                                </button>
                                <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isUploading} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                                    <CameraIcon/> Ambil Foto
                                </button>
                            </div>
                            {isUploading && <p className="text-sm text-blue-600 animate-pulse">Mengunggah...</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi (Cabang)</label>
                            <select name="locationId" value={formData.locationId} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required>
                                <option value="">Pilih Cabang...</option>
                                {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tipe Aset</label>
                            <input type="text" name="assetType" placeholder="e.g., Elektronik" value={formData.assetType} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                        </div>
                         <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tahun Produksi</label>
                            <input type="number" name="productionYear" placeholder="2024" value={formData.productionYear} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Distributor</label>
                            <input type="text" name="distributor" placeholder="Nama PT Distributor" value={formData.distributor} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Beli</label>
                            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status Awal</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required>
                                {Object.values(AssetStatus).filter(s => s !== 'KALIBRASI_EXPIRED').map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <hr className="my-4"/>
                    <h3 className="text-lg font-bold text-gray-600 -mt-1">Data Kalibrasi (Opsional)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Kalibrasi Terakhir</label>
                            <input type="date" name="calibrationDate" value={formData.calibrationDate} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Masa Berlaku (Bulan)</label>
                            <input type="number" name="calibrationPeriod" placeholder="12" value={formData.calibrationPeriod} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                    </div>
                    
                    <hr className="my-4"/>
                    <h3 className="text-lg font-bold text-gray-600 -mt-1">Data Finansial</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli (Rp)</label>
                            <input type="number" name="price" placeholder="25000000" value={formData.price} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Masa Manfaat (Tahun)</label>
                            <input type="number" name="usefulLife" placeholder="5" value={formData.usefulLife} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                        </div>
                         <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nilai Sisa (Rp)</label>
                            <input type="number" name="salvageValue" placeholder="2500000" value={formData.salvageValue} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm" required />
                        </div>
                    </div>

                    <hr className="my-4"/>
                    <h3 className="text-lg font-bold text-gray-600 -mt-1">Penanggung Jawab (PIC)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama PIC (Opsional)</label>
                            <input type="text" name="picName" value={formData.picName} onChange={handleChange} placeholder="Nama Penanggung Jawab" className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kontak PIC (Opsional)</label>
                            <input type="text" name="picContact" value={formData.picContact} onChange={handleChange} placeholder="No. HP atau Email" className="w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-52 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border-dashed border-2 self-start">
                    <h4 className="font-bold mb-3 text-gray-700">Barcode Preview</h4>
                    <div className="p-2 bg-white border rounded-md">
                        <QRCodeSVG value={previewQrValue} size={160} level={"L"} />
                    </div>
                    <p className="text-xs text-center mt-3 text-gray-500">
                        Konten QR akan sesuai input.
                    </p>
                </div>
            </form>
        </div>
        <div className="flex justify-end gap-4 p-6 border-t bg-gray-50 rounded-b-xl">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold">Batal</button>
            <button type="submit" form="asset-form" disabled={isSubmitting || isUploading} className="px-6 py-2 bg-[#01449D] text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 font-semibold">
                {isSubmitting ? 'Menyimpan...' : (isUploading ? 'Mengunggah...' : 'Simpan')}
            </button>
        </div>
      </div>
    </div>
  );
}

