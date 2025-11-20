'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { Drug } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import ConfirmationDialog from '../../../components/ConfirmationDialog'; // Asumsi komponen ini sudah ada

// --- HELPER & ICONS ---

// Helper untuk format Rupiah
const formatCurrency = (value: number | Decimal | string) => {
    const numberValue = Number(value);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(numberValue);
};

// Icon Components (SVG)
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm3.44 0a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const PillIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-3.75 2.063M21.75 12l-4.179-2.25m0 4.5l-5.571 3-5.571-3m11.142 0l4.179 2.25L12 21.75l-9.75-5.25 3.75-2.063" />
    </svg>
);

// --- UI COMPONENTS ---

// Komponen Modal Form Obat yang sudah dipercantik
const DrugFormModal = ({ isOpen, onClose, onSave, drugToEdit }: { 
    isOpen: boolean; onClose: () => void; onSave: (formData: any) => void; drugToEdit: Drug | null;
}) => {
    if (!isOpen) return null;
    const isEditing = !!drugToEdit;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            unit: formData.get('unit'),
            sellingPrice: parseFloat(formData.get('sellingPrice') as string)
        };
        onSave(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg transform transition-all duration-300 scale-95 hover:scale-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Data Obat' : 'Tambah Obat Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Obat</label>
                        <input type="text" name="name" defaultValue={drugToEdit?.name || ''} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. Paracetamol 500mg"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                            <input type="text" name="unit" defaultValue={drugToEdit?.unit || ''} required placeholder="e.g. Tablet, Botol" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (Rp)</label>
                            <input type="number" name="sellingPrice" defaultValue={drugToEdit?.sellingPrice.toString() || ''} required min="0" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. 5000" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Komponen Kartu Obat untuk tampilan mobile-first
const DrugCard = ({ drug, onEdit, onDelete }: { drug: Drug; onEdit: () => void; onDelete: () => void; }) => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200">
         <div className="flex justify-between items-start">
            <div>
                <p className="text-xl font-bold text-gray-900">{drug.name}</p>
                <p className="text-sm text-gray-500">{drug.unit}</p>
            </div>
            <p className="text-lg font-semibold text-blue-600">{formatCurrency(drug.sellingPrice)}</p>
         </div>
         <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800">
                <EditIcon/> Edit
            </button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800">
                <DeleteIcon/> Hapus
            </button>
         </div>
    </div>
);

// Komponen Baris Data Obat untuk tampilan desktop
const DrugRow = ({ drug, onEdit, onDelete }: { drug: Drug; onEdit: () => void; onDelete: () => void; }) => (
    <div className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-200 hover:bg-gray-50">
        <div className="col-span-5 font-semibold text-gray-800">{drug.name}</div>
        <div className="col-span-3 text-gray-600">{drug.unit}</div>
        <div className="col-span-2 font-medium text-gray-700">{formatCurrency(drug.sellingPrice)}</div>
        <div className="col-span-2 text-right space-x-2">
             <button onClick={onEdit} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-bold py-2 px-3 rounded-lg text-xs transition">Edit</button>
             <button onClick={onDelete} className="bg-red-100 text-red-800 hover:bg-red-200 font-bold py-2 px-3 rounded-lg text-xs transition">Hapus</button>
        </div>
    </div>
);

// Komponen Skeleton untuk Loading State
const DrugSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200 animate-pulse">
        <div className="flex justify-between items-center">
            <div className="w-2/3 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
             <div className="h-8 bg-gray-200 rounded w-20"></div>
             <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---
export default function DrugMasterPage() {
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [drugToEdit, setDrugToEdit] = useState<Drug | null>(null);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchDrugs = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        
        try {
            const res = await fetch('/api/v1/clinic/drugs', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat data obat');
            setDrugs(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchDrugs(); }, [fetchDrugs]);

    const handleOpenModal = (drug: Drug | null = null) => { setDrugToEdit(drug); setIsModalOpen(true); };
    const handleCloseModal = () => { setDrugToEdit(null); setIsModalOpen(false); };

    const handleSaveDrug = async (formData: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }

        const url = drugToEdit ? `/api/v1/clinic/drugs/${drugToEdit.id}` : '/api/v1/clinic/drugs';
        const method = drugToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
            
            toast.success(`Obat berhasil ${drugToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseModal();
            fetchDrugs();
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    const handleDeleteDrug = (drug: Drug) => {
        setConfirmation({
            title: 'Konfirmasi Hapus Obat',
            message: `Yakin ingin menghapus obat "${drug.name}"?`,
            onConfirm: async () => {
                const token = getToken();
                if (!token) { toast.error("Sesi Anda telah berakhir."); return; }
                try {
                    const res = await fetch(`/api/v1/clinic/drugs/${drug.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const result = await res.json();
                        throw new Error(result.error || 'Gagal menghapus obat');
                    }
                    toast.success('Obat berhasil dihapus!');
                    fetchDrugs();
                } catch (error: any) {
                    toast.error(error.message);
                }
            }
        });
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <DrugFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveDrug} drugToEdit={drugToEdit} />
                {confirmation && <ConfirmationDialog isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} confirmText="Ya, Hapus" />}
                
                {/* Header Halaman */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Master Data Obat</h1>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusIcon />
                        <span>Tambah Obat</span>
                    </button>
                </div>

                {/* Desktop Headers (hidden on mobile) */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-4 px-4 pb-2 border-b border-gray-200">
                    <div className="col-span-5 text-left text-xs font-semibold text-gray-500 uppercase">Nama Obat</div>
                    <div className="col-span-3 text-left text-xs font-semibold text-gray-500 uppercase">Satuan</div>
                    <div className="col-span-2 text-left text-xs font-semibold text-gray-500 uppercase">Harga Jual</div>
                    <div className="col-span-2 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</div>
                </div>

                {/* Konten Utama */}
                <div className="mt-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <DrugSkeleton key={i} />)
                    ) : drugs.length > 0 ? (
                        <>
                            {/* Mobile View */}
                            <div className="md:hidden">
                                {drugs.map((d) => (
                                    <DrugCard key={d.id} drug={d} onEdit={() => handleOpenModal(d)} onDelete={() => handleDeleteDrug(d)} />
                                ))}
                            </div>
                            {/* Desktop View */}
                            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
                                {drugs.map((d) => (
                                    <DrugRow key={d.id} drug={d} onEdit={() => handleOpenModal(d)} onDelete={() => handleDeleteDrug(d)} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <PillIcon/>
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Data Obat</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Silakan tambahkan data obat baru untuk memulai.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
