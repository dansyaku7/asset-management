'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Pastikan CSS ini ada
import { Branch, Role } from '@prisma/client';
import { UserPlus, Users, Briefcase, Building, Edit, Loader2 } from 'lucide-react';

// --- TYPES & HELPERS ---

type EmployeeDetails = { 
    id: number; 
    position: string; 
    hireDate: Date; 
    isActive: boolean; 
    user: { 
        id: number; 
        fullName: string; 
        email: string; 
        role: { name: string, id: number } 
    }; 
    branch: { 
        name: string,
        id: number 
    } 
};

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- UI COMPONENTS ---

const StaffFormModal = ({ isOpen, onClose, onSave, roles, branches, staffToEdit }: {
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: any, isEditing: boolean) => Promise<void>; 
    roles: Role[]; 
    branches: Branch[];
    staffToEdit: EmployeeDetails | null;
}) => {
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!staffToEdit;

    // --- FILTER ROLE LOGIC (Fix: Hapus Super Admin, Tambah Analis) ---
    const staffRoles = roles.filter(r => {
        const name = r.name.toUpperCase();
        // Exclude Super Admin
        if (name.includes('SUPER') || name.includes('OWNER')) return false;
        
        // Include spesifik role
        return name.includes('STAFF') || 
               name.includes('KASIR') || 
               name.includes('ADMIN') || 
               name.includes('ANALIS') ||
               name.includes('FARMASI');
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        // Logic Auto-Position (Opsional: biar user gak capek ngetik)
        const roleId = Number(formData.get('roleId'));
        const selectedRole = roles.find(r => r.id === roleId);
        let currentPosition = formData.get('position') as string;

        // Kalau user kosongin posisi, kita isi default berdasarkan role
        if (!currentPosition || currentPosition.trim() === "") {
            if (selectedRole?.name.toUpperCase().includes('ANALIS')) currentPosition = "Analis Laboratorium";
            else if (selectedRole?.name.toUpperCase().includes('KASIR')) currentPosition = "Kasir Klinik";
            else if (selectedRole?.name.toUpperCase().includes('ADMIN')) currentPosition = "Staff Administrasi";
            else currentPosition = "Staff Operasional";
        }

        const payload = {
            ...Object.fromEntries(formData.entries()),
            position: currentPosition, 
            roleId: roleId,
            hireDate: formData.get('hireDate'),
            userId: staffToEdit?.user.id, // Diperlukan untuk update
        };
        
        try {
            await onSave(payload, isEditing);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Data Pegawai' : 'Daftarkan Pegawai Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Data Akun</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                            <input type="text" name="fullName" defaultValue={staffToEdit?.user.fullName} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" name="email" defaultValue={staffToEdit?.user.email} required readOnly={isEditing} className={`mt-1 w-full p-3 border rounded-lg ${isEditing ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" name="password" required={!isEditing} placeholder={isEditing ? 'Kosongkan jika tidak ingin diubah' : 'Password Awal'} className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role Sistem</label>
                        <select name="roleId" defaultValue={staffToEdit?.user.role.id} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">Pilih Role...</option>
                            {staffRoles.map(role => (<option key={role.id} value={role.id}>{role.name.replace(/_/g, ' ')}</option>))}
                        </select>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 pt-4">Data Kepegawaian</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Posisi / Jabatan</label>
                            {/* INPUT POSISI SEKARANG BISA DIEDIT (Tidak ReadOnly) */}
                            <input type="text" name="position" defaultValue={staffToEdit?.position} placeholder="Contoh: Staff Pendaftaran / Analis Lab" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai Kerja</label>
                            <input type="date" name="hireDate" defaultValue={staffToEdit ? new Date(staffToEdit.hireDate).toISOString().split('T')[0] : ''} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cabang Tugas</label>
                        <select name="branchId" defaultValue={staffToEdit?.branch.id} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">Pilih Cabang...</option>
                            {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-4 pt-5 mt-4 border-t sticky bottom-0 bg-white py-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
                            {isSubmitting ? <><Loader2 size={18} className="animate-spin inline mr-2"/>Menyimpan...</> : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StaffCard = ({ employee, onEdit, onToggleStatus }: {
    employee: EmployeeDetails;
    onEdit: () => void;
    onToggleStatus: () => void;
}) => (
     <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-xl font-bold text-gray-900 truncate">{employee.user.fullName}</p>
                <p className="text-sm text-gray-500 truncate">{employee.user.email}</p>
            </div>
             <span className={`px-3 py-1 text-xs font-semibold rounded-full ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {employee.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
             <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-gray-800">{employee.position}</p>
                    <p className="text-xs text-gray-500">Role: {employee.user.role.name.replace(/_/g, ' ')}</p>
                </div>
            </div>
             <div className="flex items-center gap-3 text-sm">
                <Building className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                     <p className="font-semibold text-gray-800">{employee.branch.name}</p>
                    <p className="text-xs text-gray-500">Tgl. Masuk: {new Date(employee.hireDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
        </div>
         <div className="mt-4 border-t border-gray-100 pt-4 flex justify-end items-center gap-3">
            <button onClick={onToggleStatus} className={`text-sm font-medium px-3 py-1 rounded transition ${employee.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                {employee.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 px-3 py-1 rounded transition"><Edit size={16}/> Edit</button>
        </div>
    </div>
);

const StaffSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 animate-pulse">
        <div className="flex justify-between items-start">
            <div className="w-2/3 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
             <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
            <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded w-2/3"></div>
        </div>
    </div>
);


export default function StaffManagementPage() {
    const [employees, setEmployees] = useState<EmployeeDetails[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [staffToEdit, setStaffToEdit] = useState<EmployeeDetails | null>(null);

    const handleCloseModal = () => { setIsModalOpen(false); setStaffToEdit(null); };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        
        try {
            const [employeesRes, rolesRes, branchesRes] = await Promise.all([
                fetch('/api/v1/management/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            
            if (!employeesRes.ok) throw new Error('Gagal memuat data pegawai');
            if (!rolesRes.ok) throw new Error('Gagal memuat data roles');
            
            const rawEmployees: EmployeeDetails[] = await employeesRes.json();
            // Filter: Hanya tampilkan yang BUKAN dokter
            const staffOnly = rawEmployees.filter(e => !e.position.toUpperCase().includes('DOKTER')); 
            
            setEmployees(staffOnly);
            setRoles(await rolesRes.json());
            setBranches(await branchesRes.json());

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveEmployee = async (formData: any, isEditing: boolean) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }
        
        const url = isEditing ? `/api/v1/management/employees/${staffToEdit!.id}` : '/api/v1/management/employees';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
            
            toast.success(`Staff berhasil ${isEditing ? 'diperbarui' : 'didaftarkan'}!`);
            handleCloseModal();
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    // Fungsi untuk toggle status aktif/nonaktif
    const handleToggleStatus = async (employee: EmployeeDetails) => {
        const token = getToken();
        if (!token) return toast.error("Sesi tidak valid.");
        
        const action = employee.isActive ? "menonaktifkan" : "mengaktifkan";
        if (!confirm(`Yakin ingin ${action} staff "${employee.user.fullName}"?`)) return;

        try {
            const res = await fetch(`/api/v1/management/employees/${employee.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ isActive: !employee.isActive })
            });
            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || `Gagal ${action} staff`);
            }
            toast.success("Status staff berhasil diperbarui!");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    return (
        <main className="bg-gray-50 min-h-screen">
             <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <StaffFormModal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveEmployee} 
                    roles={roles}
                    branches={branches}
                    staffToEdit={staffToEdit}
                />

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <Users size={28} className="text-blue-600"/> Data Staff
                    </h1>
                    <button onClick={() => { setStaffToEdit(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105 active:scale-95">
                        <UserPlus size={20}/> Daftarkan Staff
                    </button>
                </div>

                <div className="mt-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => <StaffSkeleton key={i} />)}
                        </div>
                    ) : employees.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {employees.map((e) => (
                                <StaffCard 
                                    key={e.id} 
                                    employee={e}
                                    onEdit={() => { setStaffToEdit(e); setIsModalOpen(true); }}
                                    onToggleStatus={() => handleToggleStatus(e)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 px-6 bg-white rounded-xl shadow-sm border border-gray-200">
                           <Users className="mx-auto h-16 w-16 text-gray-300 mb-4"/>
                           <h3 className="text-xl font-bold text-gray-800">Belum Ada Data Staff</h3>
                           <p className="mt-2 text-gray-500 max-w-sm mx-auto">
                               Data pegawai seperti Admin, Kasir, atau Analis akan muncul di sini.
                           </p>
                           <button onClick={() => { setStaffToEdit(null); setIsModalOpen(true); }} className="mt-6 text-blue-600 font-semibold hover:text-blue-800 hover:underline">
                               + Tambah Staff Baru
                           </button>
                       </div>
                    )}
                </div>
            </div>
        </main>
    );
}