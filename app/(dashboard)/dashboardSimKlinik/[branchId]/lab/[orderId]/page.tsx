// File: app/(dashboard)/(modulepages)/dashboardSimKlinik/[branchId]/lab/[orderId]/page.tsx
// (REVISI BESAR - Tambah Uploader Radiologi)

'use client';

import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  LabOrder, LabService, LabParameter, LabParameterRange, MedicalRecord, Patient, Gender, LabResult, Employee,
  RadiologyImage, // <-- IMPORT BARU
  LabServiceCategory // <-- IMPORT BARU
} from '@prisma/client';
import { 
  Loader2, ArrowLeft, User, Beaker, Save, Stethoscope, CalendarDays, FlaskConical, CheckSquare, FileText, 
  UploadCloud, Image as ImageIcon, XCircle // <-- IMPORT BARU
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image'; // <-- IMPORT BARU

// --- Helper & Tipe Data ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// Tipe data gabungan (REVISI: Tambah RadiologyImage)
type ParameterWithRanges = LabParameter & {
  normalRanges: LabParameterRange[];
};
type ServiceWithParameters = LabService & {
  parameters: { parameter: ParameterWithRanges, sortOrder: number | null }[];
};
type FullLabOrder = LabOrder & {
  labService: ServiceWithParameters;
  medicalRecord: { patient: Patient };
  results: (LabResult & { labParameter: LabParameter })[]; 
  validator: (Employee & { user: { fullName: string } }) | null;
  radiologyImages: RadiologyImage[]; // <-- TAMBAHAN BARU
};

// Fungsi helper (Sama: getAgeInDays, findNormalRange)
const getAgeInDays = (dob: string | Date): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
const findNormalRange = (
  param: ParameterWithRanges, 
  patientAgeInDays: number, 
  patientGender: Gender
): LabParameterRange | null => {
  const ranges = param.normalRanges;
  if (!ranges || ranges.length === 0) return null;
  let matchingRange = ranges.find(r => 
    r.gender === patientGender && patientAgeInDays >= r.ageMin && patientAgeInDays <= r.ageMax
  );
  if (matchingRange) return matchingRange;
  matchingRange = ranges.find(r => 
    r.gender === null && patientAgeInDays >= r.ageMin && patientAgeInDays <= r.ageMax
  );
  return matchingRange || null;
};

// ===================================================
// KOMPONEN 0A: UPLOADER GAMBAR (BARU)
// ===================================================
const ImageUploader = ({ onUploadSuccess, onRemove, existingImages }: {
  onUploadSuccess: (url: string) => void;
  onRemove: (url: string) => void;
  existingImages: string[];
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/v1/upload/radiology', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal upload file');
      }
      const data = await res.json();
      toast.success('Gambar berhasil di-upload!');
      onUploadSuccess(data.url);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input file
    }
  };

  return (
    <div className="space-y-4">
      {/* Area Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tambah Gambar</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                <span>Upload file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/jpeg, image/png, image/dicom" disabled={isUploading} />
              </label>
              <p className="pl-1">atau drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, (DICOM jika didukung)</p>
          </div>
        </div>
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
            <Loader2 className="animate-spin" size={16} />
            <span>Mengupload...</span>
          </div>
        )}
      </div>
      
      {/* Galeri Mini (Hasil Upload) */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700">Gambar Ter-upload:</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-2">
            {existingImages.map(url => (
              <div key={url} className="relative group border rounded-md overflow-hidden">
                <Image src={url} alt="Upload" width={150} height={150} className="object-cover w-full h-24" />
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus gambar"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================
// KOMPONEN 0B: GALERI HASIL (BARU)
// ===================================================
const RadiologyGallery = ({ images }: { images: RadiologyImage[] }) => {
  if (images.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
        <ImageIcon className="text-blue-600" /> Gambar Radiologi
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map(image => (
          <a key={image.id} href={image.imageUrl} target="_blank" rel="noopener noreferrer" className="border rounded-lg overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            <div className="relative w-full h-40">
              <Image src={image.imageUrl} alt={image.description || 'Gambar Radiologi'} layout="fill" className="object-cover" />
            </div>
            <p className="p-2 text-xs text-center text-gray-600 truncate">{image.description || 'Lihat Gambar'}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

// ===================================================
// KOMPONEN 1: FORM INPUT HASIL (REVISI)
// ===================================================
const ResultInputForm = ({ order }: { order: FullLabOrder }) => {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<string[]>([]); // <-- STATE BARU

  const patientAgeInDays = getAgeInDays(order.medicalRecord.patient.dateOfBirth);
  const patientGender = order.medicalRecord.patient.gender;

  const sortedParameters = [...order.labService.parameters].sort((a, b) => {
    if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
    return a.parameter.name.localeCompare(b.parameter.name);
  });

  const handleInputChange = (paramId: number, value: string) => {
    setFormData(prev => ({ ...prev, [paramId]: value }));
  };

  // Handler Uploader
  const handleUploadSuccess = (url: string) => {
    setImageUrls(prev => [...prev, url]);
  };
  const handleRemoveImage = (url: string) => {
    if (confirm('Yakin ingin menghapus gambar ini?')) {
      setImageUrls(prev => prev.filter(u => u !== url));
      // TODO: Panggil API delete file di server (opsional)
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (Object.keys(formData).length < sortedParameters.length) {
      toast.warn('Harap isi semua hasil parameter (teks).'); return;
    }
    if (order.labService.category === 'RADIOLOGY' && imageUrls.length === 0) {
      toast.warn('Untuk Radiologi, harap upload minimal 1 gambar.'); return;
    }

    setIsSubmitting(true);
    // PAYLOAD DI-UPDATE
    const payload = {
      results: Object.entries(formData).map(([paramId, value]) => ({
        labParameterId: parseInt(paramId), value: value,
      })),
      imageUrls: imageUrls, // <-- KIRIM GAMBAR
    };

    try {
      const res = await fetch(`/api/v1/clinic/lab-orders/${order.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan hasil'); }
      
      toast.success('Hasil lab berhasil disimpan! Order menunggu validasi.');
      setTimeout(() => {
        router.push(`/dashboardSimKlinik/${params.branchId}/lab`);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TAMPILKAN UPLOADER JIKA KATEGORI RADIOLOGI */}
      {order.labService.category === LabServiceCategory.RADIOLOGY && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
            <ImageIcon className="text-blue-600" /> Upload Gambar
          </h2>
          <ImageUploader 
            onUploadSuccess={handleUploadSuccess}
            onRemove={handleRemoveImage}
            existingImages={imageUrls}
          />
        </div>
      )}

      {/* Form Input Teks (Tetap ada untuk 'Kesan' dll) */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
          <FlaskConical className="text-blue-600" /> Form Input Hasil (Interpretasi/Teks)
        </h2>
        {sortedParameters.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Tidak ada parameter teks untuk layanan ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Parameter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Hasil</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Satuan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Nilai Normal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedParameters.map(({ parameter }) => {
                  const normalRange = findNormalRange(parameter, patientAgeInDays, patientGender);
                  // Untuk Radiologi, parameter 'Kesan' biasanya tidak punya nilai normal
                  const isTextarea = parameter.unit === null || parameter.unit === '';
                  
                  return (
                    <tr key={parameter.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{parameter.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isTextarea ? (
                          <textarea
                            onChange={(e) => handleInputChange(parameter.id, e.target.value)}
                            required
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Kesan:..."
                          />
                        ) : (
                          <input 
                            type="text"
                            onChange={(e) => handleInputChange(parameter.id, e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 14.5"
                          />
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{parameter.unit || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {normalRange ? (normalRange.normalText || `${normalRange.normalValueMin} - ${normalRange.normalValueMax}`) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Batal</button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Simpan Hasil
        </button>
      </div>
    </form>
  );
};

// ===================================================
// KOMPONEN 2: TABEL HASIL (REVISI - Tambah Galeri)
// ===================================================
const ResultDisplayTable = ({ order }: { order: FullLabOrder }) => {
  const patientAgeInDays = getAgeInDays(order.medicalRecord.patient.dateOfBirth);
  const patientGender = order.medicalRecord.patient.gender;

  const resultsMap = new Map<number, LabResult>();
  order.results.forEach(res => {
    resultsMap.set(res.labParameterId, res);
  });

  const sortedParameters = [...order.labService.parameters].sort((a, b) => {
    if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
    return a.parameter.name.localeCompare(b.parameter.name);
  });

  return (
    <div className="space-y-6">
      {/* TAMPILKAN GALERI JIKA RADIOLOGI */}
      {order.labService.category === LabServiceCategory.RADIOLOGY && (
        <RadiologyGallery images={order.radiologyImages} />
      )}

      {/* Tabel Hasil Teks */}
      {sortedParameters.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
            <FileText className="text-green-600" /> Hasil Pemeriksaan (Teks)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Parameter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Hasil</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Satuan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Nilai Normal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedParameters.map(({ parameter }) => {
                  const result = resultsMap.get(parameter.id);
                  const normalRange = findNormalRange(parameter, patientAgeInDays, patientGender);
                  const isAbnormal = result ? result.isAbnormal : false;
                  const value = result ? result.value : <span className="text-red-500 italic">N/A</span>;
                  const isTextarea = parameter.unit === null || parameter.unit === '';

                  return (
                    <tr key={parameter.id} className={isAbnormal ? 'bg-red-50' : 'bg-white'}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{parameter.name}</td>
                      <td className={`px-4 py-4 text-sm font-bold ${isAbnormal ? 'text-red-600' : 'text-gray-900'} ${isTextarea ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}>
                        {value}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{parameter.unit || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {normalRange ? (normalRange.normalText || `${normalRange.normalValueMin} - ${normalRange.normalValueMax}`) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================
// KOMPONEN 3: FORM VALIDASI (Sama)
// ===================================================
const ValidationForm = ({ order }: { order: FullLabOrder }) => {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interpretation, setInterpretation] = useState(order.interpretation || ''); // <-- Bisa pre-fill jika mau edit

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!interpretation) {
      toast.warn('Harap isi Interpretasi / Kesimpulan Dokter.'); return;
    }
    setIsSubmitting(true);
    const payload = { interpretation };
    try {
      const res = await fetch(`/api/v1/clinic/lab-orders/${order.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memvalidasi hasil'); }
      toast.success('Hasil lab berhasil divalidasi!');
      setTimeout(() => {
        router.push(`/dashboardSimKlinik/${params.branchId}/lab/validation`);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
        <Stethoscope className="text-green-600" /> Validasi Dokter
      </h2>
      <div>
        <label htmlFor="interpretation" className="block text-sm font-medium text-gray-700 mb-1">
          Interpretasi / Kesimpulan
        </label>
        <textarea
          id="interpretation" name="interpretation" rows={5}
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Tuliskan kesimpulan dan interpretasi hasil lab di sini..."
        />
      </div>
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Batal</button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckSquare size={20} />}
          Validasi & Selesaikan
        </button>
      </div>
    </form>
  );
};

// ===================================================
// KOMPONEN 4: TAMPILAN HASIL SELESAI (Sama)
// ===================================================
const CompletedResultDisplay = ({ order }: { order: FullLabOrder }) => {
  return (
    <div className="space-y-6">
      <ResultDisplayTable order={order} />
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
          <Stethoscope className="text-green-600" /> Interpretasi Dokter
        </h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
          {order.interpretation || <span className="italic">Tidak ada interpretasi.</span>}
        </p>
        <div className="border-t pt-4 text-sm text-gray-600">
          <p>Divalidasi oleh: <span className="font-semibold">{order.validator?.user.fullName || 'N/A'}</span></p>
          <p>Tanggal Validasi: <span className="font-semibold">
            {order.validatedAt ? format(new Date(order.validatedAt), 'dd MMMM yyyy, HH:mm', { locale: idLocale }) : 'N/A'}
          </span></p>
        </div>
      </div>
    </div>
  );
};

// ===================================================
// KOMPONEN HEADER PASIEN (Sama)
// ===================================================
const PatientHeader = ({ order }: { order: FullLabOrder }) => {
  const patient = order.medicalRecord.patient;
  const age = format(new Date(), 'yyyy') - format(new Date(patient.dateOfBirth), 'yyyy');
  return (
    <div className="bg-white p-5 rounded-lg shadow-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 border-r pr-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><User size={14} /> Pasien</h3>
          <p className="text-xl font-bold text-blue-800">{patient.fullName}</p>
          <p className="text-sm text-gray-700">{patient.medicalRecordNo}</p>
          <p className="text-sm text-gray-700">{patient.gender === 'MALE' ? 'Pria' : 'Wanita'} / {age} Tahun</p>
        </div>
        <div className="col-span-1 border-r pr-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><Beaker size={14} /> Info Order Lab</h3>
          <p className="text-xl font-bold text-gray-800">{order.labService.name}</p>
          <p className="text-sm text-gray-700">No. Order: {order.id}</p>
          <p className="text-sm text-gray-700">{order.labService.category}</p>
        </div>
        <div className="col-span-1">
          <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><CalendarDays size={14} /> Kunjungan</h3>
          <p className="text-xl font-bold text-gray-800">{format(new Date(order.orderDate), 'dd MMMM yyyy', { locale: idLocale })}</p>
          <p className="text-sm text-gray-700">Jam Order: {format(new Date(order.orderDate), 'HH:mm')}</p>
        </div>
      </div>
    </div>
  );
};


// ===================================================
// Halaman Utama (Sama)
// ===================================================
export default function InputLabResultPage() {
  const router = useRouter();
  const params = useParams();
  const { branchId, orderId } = params;
  
  const [order, setOrder] = useState<FullLabOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrderDetails = async () => {
      setIsLoading(true);
      setError(null);
      const token = getToken();
      try {
        const res = await fetch(`/api/v1/clinic/lab-orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 404) throw new Error('Order Lab tidak ditemukan');
        if (!res.ok) throw new Error('Gagal memuat data order');
        const data: FullLabOrder = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

  // Fungsi render konten (Sama)
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-lg">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="ml-4 text-lg text-gray-600">Memuat data order...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-lg">
          <p className="text-lg text-red-600">{error}</p>
        </div>
      );
    }
    if (!order) {
      return (
        <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-lg">
          <p className="text-lg text-gray-500">Data order tidak ditemukan.</p>
        </div>
      );
    }

    switch (order.status) {
      case 'ORDERED':
        return (
          <>
            <PatientHeader order={order} />
            <ResultInputForm order={order} />
          </>
        );
      case 'PENDING_VALIDATION':
        return (
          <div className="space-y-6">
            <PatientHeader order={order} />
            <ResultDisplayTable order={order} />
            <ValidationForm order={order} />
          </div>
        );
      case 'COMPLETED':
      default:
        return (
          <div className="space-y-6">
            <PatientHeader order={order} />
            <CompletedResultDisplay order={order} />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Stethoscope className="w-8 h-8 mr-3 text-blue-600" />
          Detail Hasil Pemeriksaan
        </h1>
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
      
      {renderContent()}
    </div>
  );
}