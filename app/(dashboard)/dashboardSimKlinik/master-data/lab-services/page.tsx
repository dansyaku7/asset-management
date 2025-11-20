'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { LabService, LabServiceCategory, LabParameter } from '@prisma/client';
import { PlusCircle, Edit, Trash2, Loader2, Beaker, Radio, ListChecks, Search } from 'lucide-react';
import { Decimal } from '@prisma/client/runtime/library';

// --- HELPERS & ICONS ---
const formatCurrency = (value: number | string | Decimal) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// Tipe gabungan untuk data fetch
type ServiceWithParameters = LabService & {
    parameters: { parameter: LabParameter }[];
};


// ==========================================
// Dialog Layanan (dengan Search Parameter)
// ==========================================
const LabServiceDialog = ({ isOpen, onClose, onSave, serviceToEdit }: {
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: any) => Promise<void>; 
    serviceToEdit: ServiceWithParameters | null;
}) => {
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allParameters, setAllParameters] = useState<LabParameter[]>([]);
    const [selectedParameters, setSelectedParameters] = useState<Set<number>>(
        new Set(serviceToEdit?.parameters.map(p => p.parameter.id) || [])
    );
    const [isLoadingParams, setIsLoadingParams] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); // State untuk search
    const isEditing = !!serviceToEdit;

    // Fetch semua master parameter
    useEffect(() => {
        const fetchParameters = async () => {
            setIsLoadingParams(true);
            const token = getToken();
            try {
                const res = await fetch('/api/v1/clinic/lab-parameters', { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                if (!res.ok) throw new Error('Gagal memuat master parameter');
                const data: LabParameter[] = await res.json();
                setAllParameters(data);
            } catch (error: any) {
                toast.error(error.message);
            } finally {
                setIsLoadingParams(false);
            }
        };
        fetchParameters();
    }, []);

    const handleToggleParameter = (paramId: number) => {
        setSelectedParameters(prev => {
            const next = new Set(prev);
            if (next.has(paramId)) {
                next.delete(paramId);
            } else {
                next.add(paramId);
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());
        data.parameterIds = Array.from(selectedParameters);
        
        try { 
            await onSave(data); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    // Filter parameter berdasarkan search term
    const filteredParameters = allParameters.filter(param => 
        param.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    {/* Form Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Layanan</label>
                            <input type="text" name="name" defaultValue={serviceToEdit?.name || ''} required placeholder="e.g., Tes Darah Lengkap" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select name="category" defaultValue={serviceToEdit?.category || ''} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                                <option value="" disabled>Pilih Kategori...</option>
                                <option value={LabServiceCategory.LABORATORY}>Laboratorium</option>
                                <option value={LabServiceCategory.RADIOLOGY}>Radiologi</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                        <input type="number" name="price" defaultValue={serviceToEdit ? Number(serviceToEdit.price) : ''} required min="0" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>

                    {/* Form Pemilihan Parameter */}
                    <div className="border-t pt-4">
                        <label className="block text-lg font-semibold text-gray-800 mb-2">Parameter Pemeriksaan</label>
                        <p className="text-sm text-gray-500 mb-3">Pilih item tes yang termasuk dalam paket layanan ini.</p>
                        
                        {isLoadingParams ? <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-600" /></div> :
                            allParameters.length === 0 ? <p className="text-sm text-red-500 p-4 bg-red-50 rounded-lg">Master parameter kosong. Harap isi terlebih dahulu.</p> :
                            (<>
                                <div className="relative mb-3">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari parameter..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 bg-gray-50">
                                    {filteredParameters.map(param => (
                                        <label key={param.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
                                            <input 
                                                type="checkbox"
                                                checked={selectedParameters.has(param.id)}
                                                onChange={() => handleToggleParameter(param.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-900">{param.name}</span>
                                            <span className="text-xs text-gray-500">({param.unit || 'N/A'})</span>
                                        </label>
                                    ))}
                                    {filteredParameters.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center py-4">Parameter tidak ditemukan.</p>}
                                </div>
                            </>)
                        }
                    </div>

                    <div className="flex justify-end gap-4 pt-5 mt-4 border-t sticky bottom-0 bg-white py-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting || isLoadingParams} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// Komponen Kartu (Mobile), Skeleton, dan Halaman Utama
// ==========================================

const ServiceCard = ({ service, onEdit, onDelete }: {
    service: ServiceWithParameters;
    onEdit: () => void;
    onDelete: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-xl font-bold text-gray-900">{service.name}</p>
                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${service.category === 'LABORATORY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {service.category === 'LABORATORY' ? <Beaker size={14}/> : <Radio size={14}/>}
                    {service.category}
                </span>
            </div>
            <p className="text-lg font-semibold text-green-600 whitespace-nowrap">{formatCurrency(service.price)}</p>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
             <h4 className="text-sm font-semibold text-gray-700 mb-2">Parameter:</h4>
            {service.parameters.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                    {service.parameters.slice(0, 3).map(p => (
                        <li key={p.parameter.id} className="text-sm text-gray-600">{p.parameter.name}</li>
                    ))}
                    {service.parameters.length > 3 && <li className="text-sm italic text-gray-500">...dan {service.parameters.length - 3} lainnya</li>}
                </ul>
            ) : <p className="text-sm italic text-red-500">Belum ada parameter yang di-set.</p>}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800 px-3 py-1.5 rounded-md hover:bg-yellow-50 transition"><Edit size={16}/> Edit</button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 px-3 py-1.5 rounded-md hover:bg-red-50 transition"><Trash2 size={16}/> Hapus</button>
        </div>
    </div>
);

const ServiceSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200 animate-pulse">
        <div className="flex justify-between items-start">
            <div className="w-2/3 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="h-7 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
             <div className="h-8 bg-gray-200 rounded w-20"></div>
             <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);

export default function LabServicesPage() {
    const [services, setServices] = useState<ServiceWithParameters[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<ServiceWithParameters | null>(null);

    const handleCloseDialog = () => { setIsDialogOpen(false); setServiceToEdit(null); };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        try {
            const res = await fetch('/api/v1/clinic/lab-services', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat data');
            const data: ServiceWithParameters[] = await res.json();
            setServices(data);
        } catch (error: any) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        const url = serviceToEdit ? `/api/v1/clinic/lab-services/${serviceToEdit.id}` : '/api/v1/clinic/lab-services';
        const method = serviceToEdit ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan'); }
            toast.success(`Layanan berhasil ${serviceToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Yakin ingin menghapus layanan ini?")) return;
        const token = getToken();
        try {
            const res = await fetch(`/api/v1/clinic/lab-services/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus'); }
            toast.success("Layanan berhasil dihapus!");
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <LabServiceDialog isOpen={isDialogOpen} onClose={handleCloseDialog} onSave={handleSave} serviceToEdit={serviceToEdit} />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <ListChecks size={28} /> Master Layanan Lab
                    </h1>
                    <button onClick={() => { setServiceToEdit(null); setIsDialogOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusCircle size={20} /> Tambah Layanan
                    </button>
                </div>

                <div className="mt-4">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <ServiceSkeleton key={i} />)
                    ) : services.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {services.map(s => (
                                <ServiceCard 
                                    key={s.id} 
                                    service={s} 
                                    onEdit={() => { setServiceToEdit(s); setIsDialogOpen(true); }}
                                    onDelete={() => handleDelete(s.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <Beaker className="mx-auto h-16 w-16 text-gray-400" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Layanan</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Klik tombol "Tambah Layanan" untuk membuat paket pemeriksaan baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
