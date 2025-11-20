'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { Service } from '@prisma/client';
import { PlusCircle, Edit, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { Decimal } from '@prisma/client/runtime/library';

// --- HELPERS & ICONS ---

// Helper untuk format Rupiah
const formatCurrency = (value: number | Decimal | string) => {
    const numberValue = Number(value);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(numberValue);
};

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- UI COMPONENTS ---

const ServiceDialog = ({ isOpen, onClose, onSave, serviceToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    serviceToEdit: Service | null;
}) => {
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!serviceToEdit;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
        };
        
        try {
            await onSave(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg transform transition-all duration-300">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Jasa/Layanan' : 'Tambah Jasa/Layanan Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jasa/Layanan</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={serviceToEdit?.name || ''}
                            required
                            placeholder="e.g., Konsultasi Dokter Umum"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                        <input
                            type="number"
                            name="price"
                            defaultValue={serviceToEdit?.price.toString() || ''}
                            required
                            min="0"
                            placeholder="e.g., 75000"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ServiceCard = ({ service, onEdit, onDelete }: {
    service: Service;
    onEdit: () => void;
    onDelete: () => void;
}) => (
     <div className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between border border-gray-200">
        <div>
            <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
            <p className="text-2xl font-semibold text-green-600 mt-2">
                {formatCurrency(service.price)}
            </p>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"><Edit size={16}/> Edit</button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800"><Trash2 size={16}/> Hapus</button>
        </div>
    </div>
);

const ServiceSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3 mt-3"></div>
        <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);

// Komponen Halaman Utama
export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

    const handleCloseDialog = () => { setIsDialogOpen(false); setServiceToEdit(null); };

    const fetchServices = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const res = await fetch('/api/v1/clinic/services', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat data jasa');
            setServices(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleSaveService = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }

        const url = serviceToEdit
            ? `/api/v1/clinic/services/${serviceToEdit.id}`
            : '/api/v1/clinic/services';
        const method = serviceToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal menyimpan data');
            }
            toast.success(`Jasa berhasil ${serviceToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchServices();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteService = async (serviceId: number) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }

        if (confirm("Yakin ingin menghapus jasa ini?")) {
            try {
                const res = await fetch(`/api/v1/clinic/services/${serviceId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                   const errorData = await res.json();
                   throw new Error(errorData.error || 'Gagal menghapus data');
                }
                toast.success("Jasa berhasil dihapus!");
                fetchServices();
            } catch (error: any) {
                toast.error(error.message);
            }
        }
    };

    return (
        <main className="bg-gray-50 min-h-screen">
             <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <ServiceDialog
                    isOpen={isDialogOpen}
                    onClose={handleCloseDialog}
                    onSave={handleSaveService}
                    serviceToEdit={serviceToEdit}
                />

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <ClipboardList size={28}/> Master Jasa & Layanan
                    </h1>
                    <button
                        onClick={() => { setServiceToEdit(null); setIsDialogOpen(true); }}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105"
                    >
                        <PlusCircle size={20}/> Tambah Jasa Baru
                    </button>
                </div>

                <div className="mt-4">
                    {isLoading ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => <ServiceSkeleton key={i} />)}
                        </div>
                    ) : services.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {services.map(service => (
                               <ServiceCard
                                    key={service.id}
                                    service={service}
                                    onEdit={() => { setServiceToEdit(service); setIsDialogOpen(true); }}
                                    onDelete={() => handleDeleteService(service.id)}
                               />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <ClipboardList className="mx-auto h-16 w-16 text-gray-400"/>
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Jasa/Layanan</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Klik tombol "Tambah Jasa Baru" untuk membuat layanan baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
