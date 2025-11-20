// File: app/(dashboard)/dashboardAsset/components/AssetForm.tsx
// VERSI REFACTOR v3: Fix lebar input (w-full) dengan @tailwindcss/forms [VERSI BERSIH]

"use client";
import { useState, useEffect, useRef } from 'react';
import { Branch, Asset, AssetStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';

// --- Ikon-ikon ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;

// --- Props & Types ---
interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onFormSubmit: () => void;
  assetToEdit?: (Omit<Asset, 'price' | 'salvageValue'> & {
    branch: Branch; price: number; salvageValue: number;
  }) | null;
}

type AssetFormData = {
    productName: string; purchaseDate: string; branchId: string;
    assetType: string; price: string; usefulLife: string;
    salvageValue: string; picName: string; picContact: string;
    status: AssetStatus; imageUrl: string; productionYear: string;
    distributor: string; calibrationDate: string; calibrationPeriod: string;
    accessories: string;
    position: string;
    paymentMethod: 'CASH' | 'CREDIT';
};

export default function AssetForm({ isOpen, onClose, onFormSubmit, assetToEdit }: AssetFormProps) {
  // --- State & Logic ---
  const [formData, setFormData] = useState<AssetFormData>({
    productName: '', purchaseDate: '', branchId: '', assetType: '',
    price: '', usefulLife: '', salvageValue: '', picName: '',
    picContact: '', status: 'BAIK', imageUrl: '', productionYear: '',
    distributor: '', calibrationDate: '', calibrationPeriod: '',
    accessories: '',
    position: '',
    paymentMethod: 'CREDIT',
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const computerInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
        productName: '', purchaseDate: '', branchId: '', assetType: '',
        price: '', usefulLife: '', salvageValue: '', picName: '',
        picContact: '', status: 'BAIK', imageUrl: '', productionYear: '',
        distributor: '', calibrationDate: '', calibrationPeriod: '',
        accessories: '',
        position: '',
        paymentMethod: 'CREDIT',
    });
    setImagePreview(null);
  }

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/v1/management/branches');
        if (!res.ok) throw new Error("Gagal memuat data cabang.");
        setBranches(await res.json());
      } catch (err: any) { setError(err.message); }
    }

    if (isOpen) {
        fetchBranches();
        if (assetToEdit) {
            setFormData({
                productName: assetToEdit.productName,
                purchaseDate: new Date(assetToEdit.purchaseDate).toISOString().split('T')[0],
                branchId: assetToEdit.branchId.toString(),
                assetType: assetToEdit.assetType,
                price: assetToEdit.price.toString(),
                usefulLife: (assetToEdit.usefulLife / 12).toString(),
                salvageValue: assetToEdit.salvageValue.toString(),
                picName: assetToEdit.picName || '',
                picContact: assetToEdit.picContact || '',
                status: assetToEdit.status,
                imageUrl: assetToEdit.imageUrl || '',
                productionYear: assetToEdit.productionYear?.toString() || '',
                distributor: assetToEdit.distributor || '',
                calibrationDate: assetToEdit.calibrationDate ? new Date(assetToEdit.calibrationDate).toISOString().split('T')[0] : '',
                calibrationPeriod: assetToEdit.calibrationPeriod?.toString() || '',
                accessories: assetToEdit.accessories || '',
                position: assetToEdit.position || '',
                paymentMethod: (assetToEdit.paymentMethod as 'CASH' | 'CREDIT') || 'CREDIT',
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
        const response = await fetch(`/api/v1/assets/upload?filename=${file.name}`, { method: 'POST', body: file });
        if (!response.ok) throw new Error('Gagal mengunggah file.');
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
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        setError("Otentikasi gagal. Silakan login kembali.");
        setIsSubmitting(false);
        return;
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const method = assetToEdit ? 'PUT' : 'POST';
    const url = assetToEdit ? `/api/v1/assets/${assetToEdit.id}` : '/api/v1/assets';
    
    const dataToSend = {
      ...formData,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
      calibrationDate: formData.calibrationDate ? new Date(formData.calibrationDate).toISOString() : null,
      usefulLife: formData.usefulLife ? parseInt(formData.usefulLife) * 12 : 0, // Kirim dalam bulan
    };
    
    try {
      const response = await fetch(url, { method, headers: headers, body: JSON.stringify(dataToSend) });
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
   // --- END OF LOGIC ---
 
  const selectedBranchName = branches.find(b => b.id.toString() === formData.branchId)?.name || '...';
  const previewQrValue = `Nama Produk: ${formData.productName || '...'}, Cabang: ${selectedBranchName}`;

  // --- Style dipisah untuk @tailwindcss/forms ---
  const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
  
  // Style dasar yang sama untuk semua
  const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out";

  // Tambahkan class spesifik plugin-nya
  const inputStyle = `${baseStyle} form-input`;
  const selectStyle = `${baseStyle} form-select`;
  const textareaStyle = `${baseStyle} form-textarea`;


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-40 flex justify-center items-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 md:p-6 border-b">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{assetToEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl font-light">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto p-5 md:p-8">
          <form id="asset-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              
              {/* --- Nama Produk (Full-width) --- */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Nama Produk</label>
                <input type="text" name="productName" value={formData.productName} onChange={handleChange} className={inputStyle} required />
              </div>
              
              {/* --- Foto Aset (Full-width) --- */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Foto Aset (Opsional)</label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-full sm:w-40 h-40 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden flex-shrink-0">
                    {imagePreview ? (<img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />) : (<div className="text-gray-400"><UploadIcon /></div>)}
                  </div>
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <input type="file" accept="image/*" ref={computerInputRef} onChange={handleFileChange} className="hidden" />
                    <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => computerInputRef.current?.click()} disabled={isUploading} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-all">
                      <ComputerIcon/> Pilih dari Komputer
                    </button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isUploading} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all">
                      <CameraIcon/> Ambil Foto
                    </button>
                  </div>
                  {isUploading && <p className="text-sm text-blue-600 animate-pulse pt-2">Mengunggah...</p>}
                </div>
              </div>
              
              {/* --- Cabang (Half-width) --- */}
              <div>
                <label className={labelStyle}>Cabang</label>
                <select name="branchId" value={formData.branchId} onChange={handleChange} className={selectStyle} required>
                  <option value="">Pilih Cabang...</option>
                  {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </div>

              {/* --- Tipe Aset (Half-width) --- */}
              <div><label className={labelStyle}>Tipe Aset</label><input type="text" name="assetType" placeholder="e.g., Peralatan Medis" value={formData.assetType} onChange={handleChange} className={inputStyle} required /></div>
              
              {/* --- Tahun Produksi (Half-width) --- */}
              <div><label className={labelStyle}>Tahun Produksi</label><input type="number" name="productionYear" placeholder="2024" value={formData.productionYear} onChange={handleChange} className={inputStyle} /></div>
              
              {/* --- Distributor (Half-width) --- */}
              <div><label className={labelStyle}>Distributor</label><input type="text" name="distributor" placeholder="Nama PT Distributor" value={formData.distributor} onChange={handleChange} className={inputStyle} /></div>
              
              {/* --- Tanggal Beli (Half-width) --- */}
              <div><label className={labelStyle}>Tanggal Beli</label><input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className={inputStyle} required /></div>
              
              {/* --- Status Awal (Half-width) --- */}
              <div><label className={labelStyle}>Status Awal</label><select name="status" value={formData.status} onChange={handleChange} className={selectStyle} required>{Object.values(AssetStatus).filter(s => s !== 'KALIBRASI_EXPIRED').map(status => (<option key={status} value={status}>{status}</option>))}</select></div>

              {/* --- Posisi / Ruangan (Full-width) --- */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Posisi / Ruangan</label>
                <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="e.g., Ruang Dokter, Lab" className={inputStyle} />
              </div>
              
              {/* --- Aksesoris (Full-width) --- */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Aksesoris / Kelengkapan</label>
                <textarea name="accessories" value={formData.accessories} onChange={handleChange} rows={3} placeholder="e.g., Kabel Power, Adaptor, Tas" className={textareaStyle} />
              </div>
                      
              {/* --- Tgl Kalibrasi (Half-width) --- */}
              <div>
                <label className={labelStyle}>Tanggal Kalibrasi Terakhir</label>
                <input type="date" name="calibrationDate" value={formData.calibrationDate} onChange={handleChange} className={inputStyle} />
              </div>
              
              {/* --- Masa Berlaku (Half-width) --- */}
              <div>
                <label className={labelStyle}>Masa Berlaku (Bulan)</label>
                <input type="number" name="calibrationPeriod" placeholder="12" value={formData.calibrationPeriod} onChange={handleChange} className={inputStyle} />
              </div>

              {/* --- Harga Beli (Half-width) --- */}
              <div>
                <label className={labelStyle}>Harga Beli (Rp)</label>
                <input type="number" name="price" placeholder="25000000" value={formData.price} onChange={handleChange} className={inputStyle} required />
              </div>
              
              {/* --- Metode Pembayaran (Half-width) --- */}
              <div>
                <label className={labelStyle}>Metode Pembayaran</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={selectStyle} required>
                  <option value="CREDIT">Kredit / Hutang</option>
                  <option value="CASH">Tunai / Cash</option>
                </select>
              </div>

              {/* --- Masa Manfaat (Half-width) --- */}
              <div>
                <label className={labelStyle}>Masa Manfaat (Tahun)</label>
                <input type="number" name="usefulLife" placeholder="5" value={formData.usefulLife} onChange={handleChange} className={inputStyle} required />
              </div>
              
              {/* --- Nilai Sisa (Half-width) --- */}
              <div> 
                <label className={labelStyle}>Nilai Sisa (Rp)</label>
                <input type="number" name="salvageValue" placeholder="2500000" value={formData.salvageValue} onChange={handleChange} className={inputStyle} required />
              </div>

              {/* --- Nama PIC (Half-width) --- */}
              <div>
                <label className={labelStyle}>Nama PIC (Opsional)</label>
                <input type="text" name="picName" value={formData.picName} onChange={handleChange} placeholder="Nama Penanggung Jawab" className={inputStyle} />
              </div>
              
              {/* --- Kontak PIC (Half-width) --- */}
              <div>
                <label className={labelStyle}>Kontak PIC (Opsional)</label>
                <input type="text" name="picContact" value={formData.picContact} onChange={handleChange} placeholder="No. HP atau Email" className={inputStyle} />
              </div>

            </div> 
            {/* --- END OF GRID --- */}


            {/* --- Sidebar QR Code --- */}
            <div className="w-full md:w-60 flex-shrink-0 flex flex-col items-center md:sticky md:top-6 self-start">
              <div className="w-full bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                <h4 className="text-lg font-semibold mb-4 text-gray-800 text-center">Barcode Preview</h4>
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-inner inline-block">
                  <QRCodeSVG value={previewQrValue} size={160} level={"L"} />
                </div>
                <p className="text-sm text-center mt-4 text-gray-600">
                  Konten QR akan sesuai input di form.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* --- Footer Tombol --- */}
        <div className="flex justify-end items-center gap-4 p-5 border-t bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
          {error && <p className="text-red-500 text-sm flex-grow mr-4">{error}</p>}
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all"
          >
            Batal
          </button>
          <button 
            type="submit" 
            form="asset-form" 
            disabled={isSubmitting || isUploading} 
            className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all"
          >
            {isSubmitting ? 'Menyimpan...' : (isUploading ? 'Mengunggah...' : 'Simpan')}
          </button>
        </div>
      </div>
    </div>
  );
}