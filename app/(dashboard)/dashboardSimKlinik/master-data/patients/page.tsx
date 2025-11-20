'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
// Catatan: Pastikan 'react-toastify/dist/ReactToastify.css' diimpor di file layout utama aplikasi Anda
import { Branch, Patient, Gender } from '@prisma/client';
import ConfirmationDialog from '../../../components/ConfirmationDialog'; // Sesuaikan path jika perlu
import { PlusCircle, Edit, Trash2, Loader2, Users } from 'lucide-react';

// --- HELPERS & ICONS ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// Menghitung umur dari tanggal lahir
const calculateAge = (dateOfBirth: Date): string => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return `${age} tahun`;
};

// --- UI COMPONENTS ---

const PatientFormModal = ({ isOpen, onClose, onSave, patientToEdit, branches }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (formData: any) => void; 
    patientToEdit: Patient | null; 
    branches: Branch[]; 
}) => {
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await onSave(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{patientToEdit ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                            <input type="text" name="fullName" id="fullName" defaultValue={patientToEdit?.fullName} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                            <input type="date" name="dateOfBirth" id="dateOfBirth" defaultValue={patientToEdit ? new Date(patientToEdit.dateOfBirth).toISOString().split('T')[0] : ''} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                            <select name="gender" id="gender" defaultValue={patientToEdit?.gender} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                                <option value="" disabled>Pilih...</option>
                                <option value={Gender.MALE}>Laki-laki</option>
                                <option value={Gender.FEMALE}>Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                            <input type="tel" name="phone" id="phone" defaultValue={patientToEdit?.phone || ''} className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                        <textarea name="address" id="address" defaultValue={patientToEdit?.address || ''} rows={3} className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1">Didaftarkan di Cabang</label>
                        <select name="branchId" id="branchId" defaultValue={patientToEdit?.branchId} required className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">Pilih Cabang</option>
                            {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                        </select>
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

const PatientCard = ({ patient, onEdit, onDelete }: { 
    patient: (Patient & { registeredAtBranch: Branch });
    onEdit: () => void;
    onDelete: () => void;
}) => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-xl font-bold text-gray-900">{patient.fullName}</p>
                <p className="text-sm text-gray-500">{patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} &bull; {calculateAge(patient.dateOfBirth)}</p>
            </div>
            <p className="text-lg font-semibold text-blue-600 whitespace-nowrap">
                <span className="text-xs font-normal text-gray-500 block text-right">No. RM</span>
                {patient.medicalRecordNo}
            </p>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between items-center">
            <div>
                <p className="text-xs text-gray-500">Terdaftar di</p>
                <p className="text-sm font-semibold text-gray-700">{patient.registeredAtBranch.name}</p>
            </div>
             <div className="flex items-center gap-3">
                <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"><Edit size={16}/> Edit</button>
                <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800"><Trash2 size={16}/> Hapus</button>
            </div>
        </div>
    </div>
);

const PatientSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200 animate-pulse">
         <div className="flex justify-between items-start">
            <div className="w-2/3 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-1/4 space-y-2">
                 <div className="h-4 bg-gray-200 rounded w-1/2 ml-auto"></div>
                 <div className="h-6 bg-gray-200 rounded w-full"></div>
            </div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between items-center">
            <div className="w-1/3 space-y-2">
                 <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                 <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="flex items-center gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
        </div>
    </div>
);


export default function PatientManagementPage() {
    const [patients, setPatients] = useState<(Patient & { registeredAtBranch: Branch })[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        try {
            const [patientsRes, branchesRes] = await Promise.all([
                fetch('/api/v1/clinic/patients', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!patientsRes.ok || !branchesRes.ok) throw new Error('Gagal memuat data');
            setPatients(await patientsRes.json());
            setBranches(await branchesRes.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (patient: Patient | null = null) => { setEditingPatient(patient); setIsModalOpen(true); };
    const handleCloseModal = () => { setEditingPatient(null); setIsModalOpen(false); };

    const handleSavePatient = async (formData: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }

        const url = editingPatient ? `/api/v1/clinic/patients/${editingPatient.id}` : '/api/v1/clinic/patients';
        const method = editingPatient ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
            
            toast.success(`Data pasien berhasil ${editingPatient ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseModal();
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeletePatient = (patient: Patient) => {
        setConfirmation({
            title: 'Konfirmasi Hapus Pasien',
            message: `Yakin ingin menghapus pasien "${patient.fullName}" dengan No. RM ${patient.medicalRecordNo}?`,
            onConfirm: async () => {
                const token = getToken();
                if (!token) { toast.error("Sesi Anda telah berakhir."); return; }
                try {
                    const res = await fetch(`/api/v1/clinic/patients/${patient.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const result = await res.json();
                        throw new Error(result.error || 'Gagal menghapus pasien');
                    }
                    toast.success('Pasien berhasil dihapus!');
                    fetchData();
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
                <PatientFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSavePatient} patientToEdit={editingPatient} branches={branches} />
                {confirmation && <ConfirmationDialog isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} confirmText="Ya, Hapus" />}
                
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                        <Users size={28}/> Master Data Pasien
                    </h1>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105">
                        <PlusCircle size={20}/> Tambah Pasien
                    </button>
                </div>

                <div className="mt-4">
                     {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <PatientSkeleton key={i} />)
                    ) : patients.length > 0 ? (
                         patients.map((p) => (
                           <PatientCard 
                                key={p.id} 
                                patient={p}
                                onEdit={() => handleOpenModal(p)}
                                onDelete={() => handleDeletePatient(p)}
                           />
                        ))
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border">
                            <Users className="mx-auto h-16 w-16 text-gray-400"/>
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Belum Ada Data Pasien</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Klik tombol "Tambah Pasien" untuk mendaftarkan pasien baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
