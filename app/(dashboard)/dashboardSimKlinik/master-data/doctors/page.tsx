// File: app/(dashboard)/dashboardSimKlinik/master-data/doctors/page.tsx
// VERSI REFACTOR: Responsive Table (Cards) + Refactored Modal

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Branch, Role } from '@prisma/client';
import { PlusCircle, User, Stethoscope, Briefcase, X, Loader2 } from 'lucide-react';

type EmployeeDetails = { id: number; position: string; hireDate: Date; isActive: boolean; user: { id: number; fullName: string; email: string; role: { name: string } }; branch: { name: string } };

// Helper
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// --- PERUBAHAN: Component Modal Dokter (Refactor Total) ---
const DoctorFormModal = ({ isOpen, onClose, onSave, roles, branches }: {
    isOpen: boolean; onClose: () => void; onSave: (formData: any) => void; roles: Role[]; branches: Branch[];
}) => {
    if (!isOpen) return null;
    
    // Style konsisten
    const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
    const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out h-10";
    const inputStyle = `${baseStyle} form-input`;
    const selectStyle = `${baseStyle} form-select`;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const specialization = formData.get('specialization');
        
        const payload = {
            ...Object.fromEntries(formData.entries()),
            position: `Dokter ${specialization}`, // POSISI BAKU: Dokter [Spesialisasi]
            roleId: Number(formData.get('roleId')),
            hireDate: formData.get('hireDate'),
        };
        
        try {
             await onSave(payload);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter role yang relevan
    const doctorRoles = roles.filter(r => r.name.toUpperCase().includes('DOKTER') || r.name.toUpperCase().includes('ADMIN'));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Daftarkan Dokter Baru</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>
                
                {/* Form Body (Scrollable) */}
                <form onSubmit={handleSubmit} id="doctor-form" className="flex-grow overflow-y-auto p-5 space-y-4">
                    
                    <h3 className="text-sm font-semibold text-blue-700 border-b pb-1 flex items-center gap-2">
                        <User size={16}/> Data Akun User (Login)
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className={labelStyle}>Nama Lengkap</label>
                            <input type="text" name="fullName" required placeholder="Nama Lengkap User" className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Email</label>
                            <input type="email" name="email" required placeholder="Email untuk Login" className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Password</label>
                            <input type="password" name="password" required placeholder="Password Awal" className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Role Sistem</label>
                            <select name="roleId" required className={selectStyle}>
                                <option value="">Pilih Role...</option>
                                {doctorRoles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}
                            </select>
                        </div>
                    </div>

                    <h3 className="text-sm font-semibold text-blue-700 border-b pb-1 pt-3 flex items-center gap-2">
                        <Stethoscope size={16}/> Data Kepegawaian Dokter
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className={labelStyle}>Spesialisasi</label>
                            <select name="specialization" required className={selectStyle}>
                                <option value="Umum">Dokter Umum</option>
                                <option value="Gigi">Dokter Gigi</option>
                                <option value="Anak">Dokter Spesialis Anak</option>
                                <option value="Mata">Dokter Spesialis Mata</option>
                                <option value="Laboratorium">Dokter Laboratorium</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyle}>Cabang Tugas</label>
                                <select name="branchId" required className={selectStyle}>
                                    <option value="">Pilih Cabang...</option>
                                    {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className={labelStyle}>Tanggal Mulai Kerja</label>
                                <input type="date" name="hireDate" required className={inputStyle} />
                            </div>
                        </div>
                    </div>
                </form>
                
                {/* Footer Tombol */}
                <div className="flex justify-end gap-4 p-5 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all">
                        Batal
                    </button>
                    <button type="submit" form="doctor-form" disabled={isSubmitting} className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all flex items-center gap-2">
                        {isSubmitting ? <><Loader2 size={18} className="animate-spin"/> Mendaftar...</> : 'Daftarkan Dokter'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- HELPER BARU: Status Badge ---
const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isActive ? 'Aktif' : 'Nonaktif'}
    </span>
);


export default function DoctorManagementPage() {
    const [employees, setEmployees] = useState<EmployeeDetails[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
         const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        
        setIsLoading(true);
        try {
            const [employeesRes, rolesRes, branchesRes] = await Promise.all([
                fetch('/api/v1/management/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            
            if (!employeesRes.ok) throw new Error('Gagal memuat data pegawai');
            if (!rolesRes.ok) throw new Error('Gagal memuat data roles');
            
            const rawEmployees: EmployeeDetails[] = await employeesRes.json();
            // Filter hanya yang posisi mengandung 'Dokter'
            const doctorOnly = rawEmployees.filter(e => e.position.includes('Dokter')); 
            
            setEmployees(doctorOnly);
            setRoles(await rolesRes.json());
            setBranches(await branchesRes.json());

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveEmployee = async (formData: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }

        try {
            const res = await fetch('/api/v1/management/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
            
            toast.success(`Dokter berhasil didaftarkan!`);
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
            throw error; // Re-throw agar modal tahu save gagal
        }
    };
    
    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <DoctorFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveEmployee} 
                roles={roles}
                branches={branches}
            />

            {/* --- PERUBAHAN: Header & Tombol (Responsive) --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Data Dokter</h1>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-[#01449D] hover:bg-[#013b8a] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <PlusCircle size={18}/>
                    <span>Daftarkan Dokter</span>
                </button>
            </div>

            {isLoading ? (
                 <div className="flex justify-center items-center p-10 min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-3 text-gray-500">Memuat data dokter...</p>
                </div>
            ) : (
                <>
                    {/* 1. Tabel Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase min-w-[150px]">Nama Pegawai</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase min-w-[150px]">Posisi</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Role User</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Cabang</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Tgl Masuk</th>
                                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {employees.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-gray-500">Tidak ada data dokter.</td></tr> :
                                employees.map((e) => (
                                    <tr key={e.id} className='hover:bg-gray-50'>
                                        <td className="py-4 px-4 whitespace-nowrap font-semibold text-gray-900">{e.user.fullName}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-700">{e.position}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">{e.user.role.name}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">{e.branch.name}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">{formatDate(e.hireDate)}</td>
                                        <td className="py-4 px-4 text-center">
                                            <StatusBadge isActive={e.isActive} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 2. List Card Mobile */}
                    <div className="block md:hidden space-y-4">
                         {employees.length === 0 ? <div className="py-10 text-center text-gray-500">Tidak ada data dokter.</div> :
                            employees.map((e) => (
                                <div key={e.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{e.user.fullName}</h4>
                                            <p className="text-sm text-blue-700 font-medium">{e.position}</p>
                                        </div>
                                        <StatusBadge isActive={e.isActive} />
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-600">Cabang Tugas</span> 
                                            <span className="text-gray-700">{e.branch.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-600">Role Sistem</span> 
                                            <span className="text-gray-700">{e.user.role.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-600">Tgl Masuk</span> 
                                            <span className="text-gray-700">{formatDate(e.hireDate)}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Card Footer (Placeholder for Edit/Detail) */}
                                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                         {/* Di sini nanti bisa ditambahkan tombol Edit/Detail jika API sudah mendukung */}
                                        <button 
                                            // Placeholder action
                                            onClick={() => toast.info('Fungsi Edit Dokter belum diimplementasikan.')} 
                                            className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full hover:bg-gray-200 flex items-center gap-1"
                                        >
                                            <Briefcase size={14} /> Detail
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}