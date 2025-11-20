'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { toast, ToastContainer } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { Role, Permission } from '@prisma/client';
import { PlusCircle, Edit, Trash2, Loader2, User, ShieldCheck, Search } from 'lucide-react';

// Tipe data gabungan untuk fetch
type RoleWithPermissions = Role & {
    permissions: { permission: Permission }[];
};

// Helper
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// ==========================================
// Dialog Role (Dengan Fitur Search)
// ==========================================
const RoleDialog = ({ isOpen, onClose, onSave, roleToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    roleToEdit: RoleWithPermissions | null;
}) => {
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(
        new Set(roleToEdit?.permissions.map(p => p.permission.id) || [])
    );
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const isEditing = !!roleToEdit;

    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoadingPermissions(true);
            try {
                const res = await fetch('/api/v1/management/permissions', { headers: { 'Authorization': `Bearer ${getToken()}` } });
                if (!res.ok) throw new Error('Gagal memuat master permissions');
                const data: Permission[] = await res.json();
                setAllPermissions(data);
            } catch (error: any) {
                toast.error(error.message);
            } finally {
                setIsLoadingPermissions(false);
            }
        };
        fetchPermissions();
    }, []);

    const handleTogglePermission = (permissionId: number) => {
        setSelectedPermissions(prev => {
            const next = new Set(prev);
            if (next.has(permissionId)) {
                next.delete(permissionId);
            } else {
                next.add(permissionId);
            }
            return next;
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());
        data.permissionIds = Array.from(selectedPermissions);
        
        try { 
            await onSave(data); 
        } finally { 
            setIsSubmitting(false); 
        }
    };
    
    const filteredPermissions = allPermissions.filter(p => 
        p.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? `Edit Role: ${roleToEdit.name}` : 'Tambah Role Baru'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Role</label>
                        <input type="text" name="name" defaultValue={roleToEdit?.name || ''} required placeholder="e.g., Apoteker, Kasir" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-lg font-semibold text-gray-800 mb-2">Hak Akses (Permissions)</label>
                        {isLoadingPermissions ? <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-600" /></div> :
                            allPermissions.length === 0 ? <p className="text-sm text-red-500 bg-red-50 p-4 rounded-lg">Master permission kosong.</p> :
                            (<>
                                <div className="relative mb-3">
                                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari hak akses..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 bg-gray-50">
                                    {filteredPermissions.map(perm => (
                                        <label key={perm.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-blue-50 cursor-pointer transition">
                                            <input 
                                                type="checkbox"
                                                checked={selectedPermissions.has(perm.id)}
                                                onChange={() => handleTogglePermission(perm.id)}
                                                className="h-4 w-4 mt-1 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">{perm.action}</span>
                                                <p className="text-xs text-gray-500">{perm.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                     {filteredPermissions.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center py-4">Hak akses tidak ditemukan.</p>}
                                </div>
                            </>)
                        }
                    </div>

                    <div className="flex justify-end gap-4 pt-5 mt-4 border-t sticky bottom-0 bg-white py-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting || isLoadingPermissions} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
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

const RoleCard = ({ role, onEdit, onDelete }: {
    role: RoleWithPermissions;
    onEdit: () => void;
    onDelete: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between border border-gray-200">
        <div>
            <h3 className="text-xl font-bold text-gray-900">{role.name}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
                Memiliki {role.permissions.length} hak akses
            </p>
            <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-2">
                    {role.permissions.slice(0, 5).map(({ permission }) => (
                        <span key={permission.id} className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center gap-1.5">
                            <ShieldCheck size={14} /> {permission.action}
                        </span>
                    ))}
                    {role.permissions.length > 5 && (
                         <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            +{role.permissions.length - 5} lainnya
                        </span>
                    )}
                     {role.permissions.length === 0 && <span className="text-xs italic text-gray-500">Belum ada hak akses</span>}
                </div>
            </div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"><Edit size={16}/> Edit</button>
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800"><Trash2 size={16}/> Hapus</button>
        </div>
    </div>
);

const RoleSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-2"></div>
        <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex flex-wrap gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                <div className="h-6 bg-gray-200 rounded-full w-28"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end items-center gap-4">
             <div className="h-8 bg-gray-200 rounded w-20"></div>
             <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);


export default function RolesPage() {
    const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<RoleWithPermissions | null>(null);

    const handleCloseDialog = () => { setIsDialogOpen(false); setRoleToEdit(null); };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/management/roles', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Gagal memuat data roles');
            const data = await res.json();
            setRoles(data);
        } catch (error: any) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data: any) => {
        const url = roleToEdit ? `/api/v1/management/roles/${roleToEdit.id}` : '/api/v1/management/roles';
        const method = roleToEdit ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan'); }
            toast.success(`Role berhasil ${roleToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Yakin ingin menghapus role ini? Pastikan tidak ada user yang menggunakan role ini.")) return;
        try {
            const res = await fetch(`/api/v1/management/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus'); }
            toast.success("Role berhasil dihapus!");
            fetchData();
        } catch (error: any) { toast.error(error.message); }
    };

    return (
        <main className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <RoleDialog isOpen={isDialogOpen} onClose={handleCloseDialog} onSave={handleSave} roleToEdit={roleToEdit} />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <User size={28}/> Manajemen Role
                    </h1>
                    <button onClick={() => { setRoleToEdit(null); setIsDialogOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusCircle size={20}/> Tambah Role
                    </button>
                </div>

                <div className="mt-4">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => <RoleSkeleton key={i} />)}
                        </div>
                    ) : roles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roles.map(role => (
                               <RoleCard 
                                    key={role.id} 
                                    role={role}
                                    onEdit={() => { setRoleToEdit(role); setIsDialogOpen(true); }}
                                    onDelete={() => handleDelete(role.id)}
                               />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <ShieldCheck className="mx-auto h-16 w-16 text-gray-400"/>
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Role</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Klik tombol "Tambah Role" untuk membuat role pengguna baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
