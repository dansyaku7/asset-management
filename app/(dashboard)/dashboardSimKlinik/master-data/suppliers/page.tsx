'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { Supplier } from '@prisma/client';
import { Loader2, PlusCircle, Edit, Trash2, Truck, User, Phone, MapPin } from 'lucide-react';

// --- HELPERS & ICONS ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- UI COMPONENTS ---

const SupplierDialog = ({ isOpen, onClose, onSave, supplierToEdit }: {
    isOpen: boolean; onClose: () => void; onSave: (data: any) => Promise<void>; supplierToEdit: Supplier | null;
}) => {
    if (!isOpen) return null;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!supplierToEdit;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try { await onSave(data); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Supplier</label>
                            <input type="text" name="name" defaultValue={supplierToEdit?.name || ''} required placeholder="e.g., PT Sehat Farma" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                            <input type="text" name="contactPerson" defaultValue={supplierToEdit?.contactPerson || ''} placeholder="e.g., Budi Sanjaya" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                        <input type="tel" name="phone" defaultValue={supplierToEdit?.phone || ''} placeholder="e.g., 08123456789" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                        <textarea name="address" rows={3} defaultValue={supplierToEdit?.address || ''} placeholder="Alamat lengkap supplier" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                    <div className="flex justify-end gap-4 pt-5 mt-4 border-t sticky bottom-0 bg-white py-4">
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

const SupplierCard = ({ supplier, onEdit, onDelete }: {
    supplier: Supplier;
    onEdit: () => void;
    onDelete: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between border border-gray-200">
        <div>
            <h3 className="text-xl font-bold text-gray-900">{supplier.name}</h3>
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                {supplier.contactPerson && (
                    <div className="flex items-center gap-3 text-sm">
                        <User className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-700">{supplier.contactPerson}</span>
                    </div>
                )}
                 {supplier.phone && (
                    <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-700">{supplier.phone}</span>
                    </div>
                )}
                 {supplier.address && (
                    <div className="flex items-start gap-3 text-sm">
                        <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{supplier.address}</span>
                    </div>
                )}
            </div>
        </div>
         <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"><Edit size={16}/> Edit</button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800"><Trash2 size={16}/> Hapus</button>
        </div>
    </div>
);

const SupplierSkeleton = () => (
     <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-full"></div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);

// Halaman Utama
export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

    const handleCloseDialog = () => { setIsDialogOpen(false); setSupplierToEdit(null); };

    const fetchSuppliers = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const res = await fetch('/api/v1/purchasing/suppliers', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat data supplier');
            setSuppliers(await res.json());
        } catch (error: any) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleSave = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        const url = supplierToEdit ? `/api/v1/purchasing/suppliers/${supplierToEdit.id}` : '/api/v1/purchasing/suppliers';
        const method = supplierToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan data'); }
            toast.success(`Supplier berhasil ${supplierToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchSuppliers();
        } catch (error: any) { toast.error(error.message); }
    };

    const handleDelete = async (supplierId: number) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        if (confirm("Yakin ingin menghapus supplier ini?")) {
            try {
                const res = await fetch(`/api/v1/purchasing/suppliers/${supplierId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus data'); }
                toast.success("Supplier berhasil dihapus!");
                fetchSuppliers();
            } catch (error: any) { toast.error(error.message); }
        }
    };

    return (
        <main className="bg-gray-50 min-h-screen">
             <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <SupplierDialog isOpen={isDialogOpen} onClose={handleCloseDialog} onSave={handleSave} supplierToEdit={supplierToEdit} />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <Truck size={28}/> Master Data Supplier
                    </h1>
                    <button onClick={() => { setSupplierToEdit(null); setIsDialogOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusCircle size={20} /> Tambah Supplier
                    </button>
                </div>

                 <div className="mt-4">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => <SupplierSkeleton key={i} />)}
                        </div>
                    ) : suppliers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {suppliers.map(s => (
                               <SupplierCard 
                                    key={s.id} 
                                    supplier={s}
                                    onEdit={() => { setSupplierToEdit(s); setIsDialogOpen(true); }}
                                    onDelete={() => handleDelete(s.id)}
                               />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                           <Truck className="mx-auto h-16 w-16 text-gray-400"/>
                           <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Supplier</h3>
                           <p className="mt-1 text-sm text-gray-500">
                               Klik tombol "Tambah Supplier" untuk menambahkan data baru.
                           </p>
                       </div>
                    )}
                </div>
            </div>
        </main>
    );
}
