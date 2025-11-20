// File: app/(dashboard)/dashboardAccounting/master-data/payroll-components/page.tsx
// VERSI REFACTOR: Responsive Table + Refactored Modal + Style Polish

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PayrollComponent, PayrollComponentType } from '@prisma/client';
import { PlusCircle, Pencil, Trash2, Loader2, X } from 'lucide-react'; // Tambah icons

// --- PERUBAHAN: Komponen Modal Gaji (Refactor Total) ---
const ComponentDialog = ({ isOpen, onClose, onSave, componentToEdit }: {
    isOpen: boolean; onClose: () => void; onSave: (data: any) => Promise<void>; componentToEdit: PayrollComponent | null;
}) => {
    if (!isOpen) return null;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!componentToEdit;

    // Style konsisten
    const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
    const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out h-10";
    const inputStyle = `${baseStyle} form-input`;
    const selectStyle = `${baseStyle} form-select`;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try { await onSave(data); } finally { 
            // Pastikan tidak mereset isSubmitting jika onSave melempar error dan harusnya dihandle di parent
            // Untuk skenario ini, kita biarkan parent menutup dialog
            // Jika onSave sukses, dialog tertutup, isSubmitting tidak masalah
            // Jika onSave gagal, isSubmitting tetap true sampai parent handle (tapi disini kita set false saja)
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                 {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Komponen Gaji' : 'Tambah Komponen Gaji'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>
                {/* Form Body */}
                <form onSubmit={handleSubmit} id="component-form" className="flex-grow overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className={labelStyle}>Nama Komponen</label>
                        <input type="text" name="name" defaultValue={componentToEdit?.name || ''} required placeholder="e.g., Gaji Pokok, Tunjangan Transportasi" className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>Tipe Komponen</label>
                        <select name="type" defaultValue={componentToEdit?.type || ''} required className={selectStyle}>
                            <option value="" disabled>Pilih Tipe...</option>
                            <option value={PayrollComponentType.EARNING}>Pendapatan (Earning)</option>
                            <option value={PayrollComponentType.DEDUCTION}>Potongan (Deduction)</option>
                        </select>
                    </div>
                </form>
                {/* Footer Tombol */}
                <div className="flex justify-end gap-4 p-5 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all">
                        Batal
                    </button>
                    <button type="submit" form="component-form" disabled={isSubmitting} className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all">
                        {isSubmitting ? <><Loader2 size={18} className="animate-spin mr-2"/> Menyimpan...</> : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- HELPER BARU: Tombol Aksi Desktop ---
const TooltipIconButton = ({ 
  onClick, 
  icon, 
  tooltip, 
  colorClass
}: { 
  onClick: () => void; 
  icon: React.ReactNode; 
  tooltip: string;
  colorClass: string;
}) => (
  <button onClick={onClick} className={`group relative ${colorClass} p-2 rounded-md hover:bg-gray-100 transition-colors`}>
    {icon}
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
      {tooltip}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
    </span>
  </button>
);


// Halaman Utama
export default function PayrollComponentsPage() {
    const [components, setComponents] = useState<PayrollComponent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [componentToEdit, setComponentToEdit] = useState<PayrollComponent | null>(null);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const handleCloseDialog = () => { setIsDialogOpen(false); setComponentToEdit(null); };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const res = await fetch('/api/v1/accounting/payroll-components', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat data');
            setComponents(await res.json());
        } catch (error: any) { toast.error(error.message); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        
        const url = componentToEdit ? `/api/v1/accounting/payroll-components/${componentToEdit.id}` : '/api/v1/accounting/payroll-components';
        const method = componentToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan'); }
            toast.success(`Komponen berhasil ${componentToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    const handleDelete = async (id: number) => { 
        if (!confirm('Yakin ingin menghapus komponen ini?')) return;
        
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        
        try {
            const res = await fetch(`/api/v1/accounting/payroll-components/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus'); }
            toast.success('Komponen berhasil dihapus!');
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };
    
    const handleEdit = (component: PayrollComponent) => { 
        setComponentToEdit(component); 
        setIsDialogOpen(true); 
    };

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            {isDialogOpen && <ComponentDialog isOpen={isDialogOpen} onClose={handleCloseDialog} onSave={handleSave} componentToEdit={componentToEdit} />}
            
            {/* --- PERUBAHAN: Header & Tombol (Responsive) --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Master Komponen Gaji</h1>
                <button 
                    onClick={() => { setComponentToEdit(null); setIsDialogOpen(true); }} 
                    className="flex items-center justify-center gap-2 bg-[#01449D] hover:bg-[#013b8a] text-white font-semibold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto"
                >
                    <PlusCircle size={18} /> <span>Tambah Komponen</span>
                </button>
            </div>
            
            {/* --- PERUBAHAN: Container Tabel (Responsive) --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                {isLoading ? (
                    <div className="flex justify-center items-center p-10 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat data komponen...</p>
                    </div> 
                ) : (
                    <>
                        {/* 1. Tabel Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nama Komponen</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tipe</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {components.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-500">Belum ada data komponen gaji.</td></tr>
                                    ) : (
                                        components.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{c.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${c.type === 'EARNING' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {c.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <TooltipIconButton 
                                                        onClick={() => handleEdit(c)} 
                                                        icon={<Pencil size={16}/>}
                                                        tooltip="Edit Komponen" 
                                                        colorClass="text-yellow-600 hover:text-yellow-900" 
                                                    />
                                                    <TooltipIconButton 
                                                        onClick={() => handleDelete(c.id)} 
                                                        icon={<Trash2 size={16}/>}
                                                        tooltip="Hapus Komponen" 
                                                        colorClass="text-red-600 hover:text-red-900" 
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Tampilan Card Mobile */}
                        <div className="block md:hidden space-y-4">
                            {components.length === 0 ? (
                                <div className="py-10 text-center text-gray-500">Belum ada data komponen gaji.</div>
                            ) : (
                                components.map(c => (
                                    <div key={c.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-gray-900">{c.name}</h4>
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${c.type === 'EARNING' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {c.type}
                                            </span>
                                        </div>
                                        
                                        {/* Card Footer (Actions) */}
                                        <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                            <button 
                                                onClick={() => handleEdit(c)} 
                                                className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full hover:bg-yellow-200 flex items-center gap-1 mr-2"
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(c.id)} 
                                                className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full hover:bg-red-200 flex items-center gap-1"
                                            >
                                                <Trash2 size={14} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}