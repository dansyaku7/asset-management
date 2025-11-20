'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { toast, ToastContainer } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { LabParameter, LabParameterRange, Gender } from '@prisma/client';
import { PlusCircle, Edit, Trash2, Loader2, ListOrdered, NotebookPen } from 'lucide-react';

// Tipe gabungan untuk data fetch
type ParameterWithRanges = LabParameter & {
    normalRanges: LabParameterRange[];
};

// Helper
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// ==========================================
// Dialog 1: Parameter (Hemoglobin, Leukosit, dll)
// ==========================================
const ParameterDialog = ({ isOpen, onClose, onSave, paramToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    paramToEdit: ParameterWithRanges | null;
}) => {
    if (!isOpen) return null;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!paramToEdit;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try { await onSave(data); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xl transform transition-all duration-300">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Parameter' : 'Parameter Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Parameter</label>
                        <input type="text" name="name" defaultValue={paramToEdit?.name || ''} required placeholder="e.g., Hemoglobin" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                        <input type="text" name="unit" defaultValue={paramToEdit?.unit || ''} placeholder="e.g., g/dL" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// Dialog 2: Nilai Normal (Kelola LabParameterRange)
// ==========================================
const NormalRangeDialog = ({ isOpen, onClose, parameter }: {
    isOpen: boolean;
    onClose: () => void;
    parameter: ParameterWithRanges | null;
}) => {
    if (!isOpen || !parameter) return null;

    const [ranges, setRanges] = useState<LabParameterRange[]>(parameter.normalRanges);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const reloadRanges = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/clinic/lab-parameters/${parameter.id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Gagal memuat data');
            const data: ParameterWithRanges = await res.json();
            setRanges(data.normalRanges);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsLoading(false); }
    };

    const handleAddRange = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await fetch(`/api/v1/clinic/lab-parameters/${parameter.id}/ranges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            toast.success('Nilai normal ditambahkan!');
            (e.target as HTMLFormElement).reset(); // Reset form
            await reloadRanges(); // Muat ulang daftar
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteRange = async (rangeId: number) => {
        if (!confirm('Yakin ingin menghapus nilai normal ini?')) return;
        
        try {
            const res = await fetch(`/api/v1/clinic/lab-parameters/ranges/${rangeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            toast.success('Nilai normal dihapus!');
            await reloadRanges();
        } catch (error: any) { toast.error(error.message); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-5 text-gray-800">
                    Kelola Nilai Normal: <span className="text-blue-600">{parameter.name}</span>
                </h2>
                
                {/* Form Tambah Baru */}
                <form onSubmit={handleAddRange} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50 mb-5">
                    <h3 className="col-span-full text-lg font-semibold mb-1 text-gray-700">Tambah Rentang Baru</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select name="gender" className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">Semua (Pria/Wanita)</option>
                            <option value={Gender.MALE}>Pria (MALE)</option>
                            <option value={Gender.FEMALE}>Wanita (FEMALE)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Umur Min (Hari)</label>
                        <input type="number" name="ageMin" required defaultValue="0" min="0" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Umur Max (Hari)</label>
                        <input type="number" name="ageMax" required defaultValue="99999" min="0" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Min</label>
                        <input type="number" step="0.01" name="normalValueMin" placeholder="e.g., 12.5" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Max</label>
                        <input type="number" step="0.01" name="normalValueMax" placeholder="e.g., 15.5" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teks Normal</label>
                        <input type="text" name="normalText" placeholder="e.g., Negatif" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-full text-right mt-2">
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400">
                            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <PlusCircle size={18}/>}
                            {isSubmitting ? 'Menyimpan...' : 'Tambah Rentang'}
                        </button>
                    </div>
                </form>

                {/* Daftar Rentang yang Ada */}
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Rentang Saat Ini</h3>
                <div className="flex-grow overflow-y-auto overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Umur (Hari)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai Normal</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? <tr><td colSpan={4} className="p-6 text-center"><Loader2 className="animate-spin inline-block text-blue-600"/></td></tr> :
                                ranges.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Belum ada nilai normal yang ditambahkan.</td></tr> :
                                ranges.map(range => (
                                <tr key={range.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{range.gender || 'Semua'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{range.ageMin} - {range.ageMax}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">
                                        {range.normalText ? range.normalText : `${range.normalValueMin ?? '?'} - ${range.normalValueMax ?? '?'}`}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <button onClick={() => handleDeleteRange(range.id)} className="text-red-600 hover:text-red-800 p-1.5 rounded-md hover:bg-red-100" title="Hapus">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4 pt-5 mt-5 border-t">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Tutup</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// Komponen Kartu (Mobile) & Skeleton
// ==========================================
const ParameterCard = ({ param, onEdit, onDelete, onManageRanges }: {
    param: ParameterWithRanges;
    onEdit: () => void;
    onDelete: () => void;
    onManageRanges: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xl font-bold text-gray-900">{param.name}</p>
                <p className="text-sm text-gray-500">{param.unit || 'Tanpa satuan'}</p>
            </div>
            <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full whitespace-nowrap">
                {param.normalRanges.length} Rentang
            </span>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onManageRanges} className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-800 px-3 py-1.5 rounded-md hover:bg-green-50 transition">
                <NotebookPen size={16}/> Kelola Nilai
            </button>
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800 px-3 py-1.5 rounded-md hover:bg-yellow-50 transition">
                <Edit size={16}/> Edit
            </button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 px-3 py-1.5 rounded-md hover:bg-red-50 transition">
                <Trash2 size={16}/> Hapus
            </button>
        </div>
    </div>
);

const ParameterSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200 animate-pulse">
        <div className="flex justify-between items-center">
            <div className="w-2/3 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-7 bg-gray-200 rounded-full w-24"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
             <div className="h-8 bg-gray-200 rounded w-28"></div>
             <div className="h-8 bg-gray-200 rounded w-20"></div>
             <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);


// ==========================================
// Halaman Utama
// ==========================================
export default function LabParametersPage() {
    const [parameters, setParameters] = useState<ParameterWithRanges[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State Dialog Parameter
    const [isParamDialogOpen, setIsParamDialogOpen] = useState(false);
    const [paramToEdit, setParamToEdit] = useState<ParameterWithRanges | null>(null);

    // State Dialog Nilai Normal
    const [isRangeDialogOpen, setIsRangeDialogOpen] = useState(false);
    const [paramToManage, setParamToManage] = useState<ParameterWithRanges | null>(null);

    const handleCloseParamDialog = () => { setIsParamDialogOpen(false); setParamToEdit(null); };
    const handleCloseRangeDialog = () => { setIsRangeDialogOpen(false); setParamToManage(null); fetchData(); }; // Reload data saat tutup modal range

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        try {
            const res = await fetch('/api/v1/clinic/lab-parameters', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat data');
            const data = await res.json();
            setParameters(data);
        } catch (error: any) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Save/Edit Parameter (Dialog 1)
    const handleSaveParameter = async (data: any) => {
        const token = getToken();
        const url = paramToEdit ? `/api/v1/clinic/lab-parameters/${paramToEdit.id}` : '/api/v1/clinic/lab-parameters';
        const method = paramToEdit ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan'); }
            toast.success(`Parameter berhasil ${paramToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseParamDialog();
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    // Hapus Parameter
    const handleDeleteParameter = async (id: number) => {
        if (!confirm("Yakin ingin menghapus parameter ini? Semua nilai normal dan relasi ke paket layanan akan terhapus.")) return;
        const token = getToken();
        try {
            const res = await fetch(`/api/v1/clinic/lab-parameters/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus'); }
            toast.success("Parameter berhasil dihapus!");
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                
                {/* Dialog untuk CRUD Parameter */}
                <ParameterDialog isOpen={isParamDialogOpen} onClose={handleCloseParamDialog} onSave={handleSaveParameter} paramToEdit={paramToEdit} />
                
                {/* Dialog untuk CRUD Nilai Normal */}
                {isRangeDialogOpen && (
                    <NormalRangeDialog isOpen={isRangeDialogOpen} onClose={handleCloseRangeDialog} parameter={paramToManage} />
                )}
                
                {/* Header Halaman */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <ListOrdered size={28} /> Master Parameter Lab
                    </h1>
                    <button onClick={() => { setParamToEdit(null); setIsParamDialogOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusCircle size={20} /> Tambah Parameter
                    </button>
                </div>

                {/* Desktop Headers (hidden on mobile) */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-4 px-4 pb-2 border-b border-gray-200">
                    <div className="col-span-4 text-left text-xs font-semibold text-gray-500 uppercase">Nama Parameter</div>
                    <div className="col-span-2 text-left text-xs font-semibold text-gray-500 uppercase">Satuan</div>
                    <div className="col-span-2 text-left text-xs font-semibold text-gray-500 uppercase">Jml. Nilai Normal</div>
                    <div className="col-span-4 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</div>
                </div>

                {/* Konten Utama (Daftar Parameter) */}
                <div className="mt-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <ParameterSkeleton key={i} />)
                    ) : parameters.length > 0 ? (
                        <>
                            {/* Mobile View (Cards) */}
                            <div className="md:hidden">
                                {parameters.map((p) => (
                                    <ParameterCard 
                                        key={p.id} 
                                        param={p}
                                        onEdit={() => { setParamToEdit(p); setIsParamDialogOpen(true); }}
                                        onDelete={() => handleDeleteParameter(p.id)}
                                        onManageRanges={() => { setParamToManage(p); setIsRangeDialogOpen(true); }}
                                    />
                                ))}
                            </div>
                            
                            {/* Desktop View (Table-like) */}
                            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
                                {parameters.map((p) => (
                                    <div key={p.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                        <div className="col-span-4 font-medium text-gray-900">{p.name}</div>
                                        <div className="col-span-2 text-gray-700">{p.unit || '-'}</div>
                                        <div className="col-span-2 text-blue-700 font-medium">{p.normalRanges.length} rentang</div>
                                        <div className="col-span-4 text-right text-sm font-medium space-x-2">
                                            <button 
                                                onClick={() => { setParamToManage(p); setIsRangeDialogOpen(true); }} 
                                                className="text-green-600 hover:text-green-800 p-2 bg-green-50 hover:bg-green-100 rounded-lg"
                                                title="Kelola Nilai Normal"
                                            >
                                                <NotebookPen size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => { setParamToEdit(p); setIsParamDialogOpen(true); }} 
                                                className="text-yellow-600 hover:text-yellow-800 p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg"
                                                title="Edit Parameter"
                                            >
                                                <Edit size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteParameter(p.id)} 
                                                className="text-red-600 hover:text-red-800 p-2 bg-red-50 hover:bg-red-100 rounded-lg"
                                                title="Hapus Parameter"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <ListOrdered className="mx-auto h-16 w-16 text-gray-400" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Parameter Lab</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Silakan tambahkan parameter baru untuk memulai.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}