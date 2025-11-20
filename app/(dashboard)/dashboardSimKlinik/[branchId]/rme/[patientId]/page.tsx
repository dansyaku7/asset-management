// File: app/(dashboard)/dashboardSimKlinik/[branchId]/rme/[patientId]/page.tsx
// VERSI RESPONSIF & LEBIH BAGUS

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Patient, MedicalRecord, Prescription, PrescriptionItem, Drug, LabService } from '@prisma/client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PlusCircle, Trash2, Stethoscope, History, BriefcaseMedical, Pill, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// --- Tipe Data ---
type PatientDetails = Patient & { registeredAtBranch: { name: string } };
type PrescriptionItemDetails = PrescriptionItem & { drug: Drug };
type PrescriptionDetails = Prescription & { items: PrescriptionItemDetails[] };
type RecordDetails = MedicalRecord & { doctor: { user: { fullName: string } }, prescriptions: PrescriptionDetails[] };

// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const formatDate = (date: Date | string) => format(new Date(date), 'dd MMMM yyyy, HH:mm', { locale: idLocale });

// --- Komponen Input Resep ---
const PrescriptionInput = ({ drugs }: { drugs: Drug[] }) => {
    const [items, setItems] = useState<{ drugId: string; quantity: string; dosage: string }[]>([]);

    const addItem = () => setItems([...items, { drugId: '', quantity: '1', dosage: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleChange = (index: number, field: keyof typeof items[0], value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    // Filter item yang sudah terpilih untuk di-submit
    const validItems = items.filter(item => item.drugId !== '');
    const hiddenInputProps = { 
        type: 'hidden', 
        name: 'prescriptionItems', 
        value: JSON.stringify(validItems), 
        readOnly: true 
    };

    return (
        <div className="space-y-4 bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2 border-b pb-3 mb-2">
                <Pill className="w-5 h-5 text-indigo-500" /> Resep Obat
            </h4>
            
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 sm:gap-4 p-3 border border-indigo-100 rounded-lg bg-white items-end shadow-sm">
                        {/* Kolom 1: Obat */}
                        <div className="col-span-6 sm:col-span-3">
                            <label className="text-xs block mb-1 text-gray-500">Obat</label>
                            <select 
                                value={item.drugId} 
                                onChange={(e) => handleChange(index, 'drugId', e.target.value)} 
                                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            >
                                <option value="" disabled>Pilih Obat...</option>
                                {drugs.map(drug => <option key={drug.id} value={drug.id.toString()}>{drug.name} ({drug.unit})</option>)}
                            </select>
                        </div>
                        
                        {/* Kolom 2: Jumlah */}
                        <div className="col-span-3 sm:col-span-1">
                            <label className="text-xs block mb-1 text-gray-500">Jumlah</label>
                            <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => handleChange(index, 'quantity', e.target.value)} 
                                min="1" 
                                required 
                                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                            />
                        </div>
                        
                        {/* Kolom 3: Dosis */}
                        <div className="col-span-3 sm:col-span-2">
                            <label className="text-xs block mb-1 text-gray-500">Dosis</label>
                            <div className='flex gap-2'>
                                <input 
                                    type="text" 
                                    value={item.dosage} 
                                    onChange={(e) => handleChange(index, 'dosage', e.target.value)} 
                                    placeholder="e.g., 3 x 1, Sebelum tidur" 
                                    required
                                    className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                />
                                {/* Tombol Hapus */}
                                <button 
                                    type="button" 
                                    onClick={() => removeItem(index)} 
                                    className="flex-shrink-0 bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors shadow-md"
                                    aria-label="Hapus Obat"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button 
                type="button" 
                onClick={addItem} 
                className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold mt-2 flex items-center gap-1 transition-colors"
            >
                <PlusCircle size={18}/> Tambah Obat
            </button>
            <input {...hiddenInputProps} />
        </div>
    );
};

// --- Komponen Order Pemeriksaan ---
const LabOrderInput = ({ labServices }: { labServices: LabService[] }) => {
    const [items, setItems] = useState<{ labServiceId: string; notes: string }[]>([]);

    const addItem = () => setItems([...items, { labServiceId: '', notes: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleChange = (index: number, field: 'labServiceId' | 'notes', value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const validItems = items.filter(item => item.labServiceId !== '');
    const hiddenInputProps = { 
        type: 'hidden', 
        name: 'labOrders', 
        value: JSON.stringify(validItems), 
        readOnly: true 
    };

    return (
        <div className="space-y-4 bg-blue-50 p-4 sm:p-6 rounded-xl border-l-4 border-blue-500 shadow-inner">
            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2 border-b border-blue-200 pb-3 mb-2">
                <FlaskConical className="w-5 h-5 text-blue-600" /> Order Pemeriksaan Penunjang (Lab/Radiologi)
            </h4>
            
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 sm:gap-4 p-3 border border-blue-200 rounded-lg bg-white items-end shadow-sm">
                        {/* Kolom 1: Jenis Pemeriksaan */}
                        <div className="col-span-6 sm:col-span-3">
                            <label className="text-xs block mb-1 text-gray-500">Jenis Pemeriksaan</label>
                            <select 
                                value={item.labServiceId} 
                                onChange={(e) => handleChange(index, 'labServiceId', e.target.value)} 
                                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                                <option value="" disabled>Pilih Pemeriksaan...</option>
                                {labServices.map(service => <option key={service.id} value={service.id.toString()}>{service.name} ({service.category})</option>)}
                            </select>
                        </div>
                        
                        {/* Kolom 2: Catatan */}
                        <div className="col-span-6 sm:col-span-3">
                            <label className="text-xs block mb-1 text-gray-500">Catatan (Opsional)</label>
                            <div className='flex gap-2'>
                                <input 
                                    type="text" 
                                    value={item.notes} 
                                    onChange={(e) => handleChange(index, 'notes', e.target.value)} 
                                    placeholder="e.g., Cito, Puasa 10 jam" 
                                    className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                                />
                                {/* Tombol Hapus */}
                                <button 
                                    type="button" 
                                    onClick={() => removeItem(index)} 
                                    className="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-md transition-colors"
                                    aria-label="Hapus Order"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button 
                type="button" 
                onClick={addItem} 
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold mt-2 flex items-center gap-1 transition-colors"
            >
                <PlusCircle size={18}/> Tambah Order
            </button>
            <input {...hiddenInputProps} />
        </div>
    );
};

// --- Komponen Riwayat Kunjungan (Card) ---
const RecordHistoryCard = ({ record }: { record: RecordDetails }) => (
    <div key={record.id} className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-gray-400 transition-shadow hover:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-3">
            <h4 className="font-extrabold text-xl text-gray-800 mb-1 sm:mb-0">
                <History className='w-5 h-5 inline mr-2 text-gray-500' /> Kunjungan {format(new Date(record.visitDate), 'dd MMMM yyyy', { locale: idLocale })}
            </h4>
            <p className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
                Dokter: {record.doctor.user.fullName}
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Kolom 1: Data Klinis */}
            <div className="space-y-2">
                <p className='font-semibold text-gray-700'>Anamnesis:</p>
                <p className='pl-2 text-gray-800'>{record.anamnesis}</p>
                
                <p className='font-semibold text-gray-700 pt-1'>Pemeriksaan Fisik:</p>
                <p className='pl-2 text-gray-800'>{record.physicalExam || 'Tidak diisi'}</p>
                
                <p className='font-semibold text-gray-700 pt-1'>Diagnosis:</p>
                <p className='pl-2 text-gray-800'>{record.diagnosis || 'Tidak diisi'}</p>
            </div>
            
            {/* Kolom 2: Tindakan & Resep */}
            <div className="space-y-2">
                <p className='font-semibold text-gray-700'>Tindakan:</p>
                <p className='pl-2 text-gray-800'>{record.actions || 'Tidak diisi'}</p>

                {record.prescriptions.length > 0 && (
                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="font-bold text-indigo-800 mb-2 flex items-center gap-1">
                            <Pill className='w-4 h-4' /> Resep Diberikan:
                        </p>
                        <ul className="list-disc ml-5 text-gray-700 space-y-1">
                            {record.prescriptions[0].items.map(item => (
                                <li key={item.id} className="text-sm">
                                    <span className='font-semibold'>{item.quantity} x {item.drug.name}</span> (<span className='text-xs italic'>{item.dosage}</span>)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    </div>
);


// --- Komponen Halaman Utama ---
export default function RmePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const patientId = params.patientId as string;
    const branchId = params.branchId as string;
    const appointmentId = searchParams.get('appointmentId');

    const [patient, setPatient] = useState<PatientDetails | null>(null);
    const [records, setRecords] = useState<RecordDetails[]>([]);
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [labServices, setLabServices] = useState<LabService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('new');
    const [doctorId, setDoctorId] = useState<number | null>(null);
    const [isDoctorValidated, setIsDoctorValidated] = useState(false);
    
    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchInitialData = useCallback(async () => {
        const token = getToken();
        if (!token || !patientId || !branchId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [rmeRes, drugsRes, labServicesRes, doctorRes] = await Promise.all([
                fetch(`/api/v1/clinic/rme/${branchId}/${patientId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/clinic/drugs', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/clinic/lab-services', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/clinic/doctors/current', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!rmeRes.ok) throw new Error('Gagal memuat RME');
            const rmeData = await rmeRes.json();
            setPatient(rmeData.patient);
            // Sort records by visit date descending (terbaru di atas)
            const sortedRecords = rmeData.records.sort((a: MedicalRecord, b: MedicalRecord) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
            setRecords(sortedRecords);
            
            if (drugsRes.ok) setDrugs(await drugsRes.json());
            if (labServicesRes.ok) setLabServices(await labServicesRes.json());
            
            const doctorData = await doctorRes.json();
            if (doctorRes.ok && doctorData.isDoctor) {
                setDoctorId(doctorData.doctorId);
            } else {
                setDoctorId(null);
            }
            setIsDoctorValidated(true);

        } catch (error: any) {
            toast.error(`Gagal memuat data: ${error.message}`);
            setPatient(null);
        } finally {
            setIsLoading(false);
        }
    }, [patientId, branchId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (doctorId === null || !appointmentId) {
            toast.error("Error: ID Dokter atau Janji Temu tidak ditemukan.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());
        
        // Pastikan parsing stringified JSON
        data.prescriptionItems = JSON.parse(data.prescriptionItems || '[]');
        data.labOrders = JSON.parse(data.labOrders || '[]');
        
        // Tambahkan metadata yang diperlukan
        data.doctorId = doctorId;
        data.visitDate = new Date().toISOString();
        data.appointmentId = Number(appointmentId);
        
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsSubmitting(false); return; }

        try {
            const res = await fetch(`/api/v1/clinic/rme/${branchId}/${patientId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal menyimpan RME');
            }
            
            toast.success("Rekam medis dan semua order berhasil disimpan!");
            setActiveTab('history');
            fetchInitialData(); // Refresh data
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return (
        <div className="p-8 space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
    );
    if (!appointmentId) return ( <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md"> <h3 className="font-bold">Error: ID Janji Temu Hilang</h3> <p>Harap kembali ke halaman <b>Antrean</b> dan klik "Mulai Pemeriksaan" lagi.</p> </div> );
    if (!patient) return <p className="text-red-500 font-semibold p-4 bg-red-100 rounded-lg">Pasien tidak ditemukan. Periksa kembali ID Pasien.</p>;
    if (!isDoctorValidated || doctorId === null) return <p className="text-red-500 font-semibold p-4 bg-red-100 rounded-lg">Error: Akun Anda tidak terdaftar sebagai Dokter. Harap hubungi administrator.</p>; 

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6">
            <ToastContainer position="top-right" autoClose={3000} newestOnTop />
            
            {/* Header Utama */}
            <div className="flex items-center gap-3 border-b pb-4">
                <BriefcaseMedical className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-extrabold text-gray-900">Rekam Medis Elektronik (RME)</h1>
            </div>

            {/* Informasi Pasien (Card) */}
            <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-blue-600">
                <h2 className="text-xl font-bold text-gray-800 mb-3">{patient.fullName}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-sm text-gray-700">
                    <p><strong>No. RM:</strong> <span className='font-semibold text-blue-700'>{patient.medicalRecordNo}</span></p>
                    <p><strong>Tgl Lahir:</strong> {formatDate(patient.dateOfBirth).split(',')[0]}</p>
                    <p className='col-span-2 md:col-span-1'><strong>Jenis Kelamin:</strong> {patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</p>
                    <p><strong>Cabang:</strong> {patient.registeredAtBranch.name}</p>
                </div>
            </div>

            {/* Navigasi Tab */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('new')} 
                    className={`py-3 px-6 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'new' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Stethoscope className='w-5 h-5' /> Input Pemeriksaan Baru
                </button>
                <button 
                    onClick={() => setActiveTab('history')} 
                    className={`py-3 px-6 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <History className='w-5 h-5' /> Riwayat Kunjungan ({records.length})
                </button>
            </div>

            {/* Konten Tab: Input Pemeriksaan Baru */}
            {activeTab === 'new' && (
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h3 className="text-xl font-bold border-b pb-2 text-gray-800">Data Klinis Kunjungan</h3>
                        
                        {/* Clinical Data Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Anamnesis (Keluhan Utama)*</label>
                                <textarea name="anamnesis" rows={4} required placeholder="Keluhan utama, riwayat penyakit sekarang, dsb." className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Pemeriksaan Fisik</label>
                                <textarea name="physicalExam" rows={4} placeholder="Pemeriksaan vital sign, status generalis, dsb." className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"></textarea>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Diagnosis (ICD-10)</label>
                                <textarea name="diagnosis" rows={2} placeholder="e.g., A09 Diare dan gastroenteritis" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tindakan (ICD-9-CM)</label>
                                <textarea name="actions" rows={2} placeholder="e.g., 99.21 Injeksi antibiotik" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"></textarea>
                            </div>
                        </div>
                        
                        {/* Prescription and Lab Orders */}
                        <PrescriptionInput drugs={drugs} />
                        <LabOrderInput labServices={labServices} />
                        
                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className={`flex items-center gap-2 ${isSubmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg`}
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Rekam Medis & Buat Tagihan'}
                                {isSubmitting && <FlaskConical className="w-5 h-5 animate-spin"/>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Konten Tab: Riwayat Kunjungan */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {records.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl shadow-md">
                            <p className="text-gray-500">Pasien ini belum memiliki riwayat kunjungan.</p>
                        </div>
                    ) : (
                        records.map(record => <RecordHistoryCard key={record.id} record={record} />)
                    )}
                </div>
            )}
        </div>
    );
}