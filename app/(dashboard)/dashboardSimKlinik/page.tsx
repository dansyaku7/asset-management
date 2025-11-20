// File: app/(dashboard)/dashboardSimKlinik/page.tsx
// VERSI REFACTOR: Polished UI untuk Seleksi Cabang

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Branch } from '@prisma/client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2 } from 'lucide-react'; // Tambah Loader2

// Kita pakai ulang komponen dialog yang sudah ada dari modul Aset!
import { AddBranchDialog } from '../dashboardAsset/master-data/components/AddBranchDialog';

// --- PERUBAHAN: Komponen Card Cabang ---
const BranchCard = ({ branch }: { branch: Branch }) => (
    <Link href={`/dashboardSimKlinik/${branch.id}`} legacyBehavior>
        <a className="block bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl hover:border-blue-400 transform hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
                <i className="fas fa-hospital text-2xl text-blue-600"></i> {/* Icon Font Awesome */}
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{branch.name}</h3>
                    <p className="text-sm text-gray-500">{branch.address || 'Alamat belum diatur'}</p>
                </div>
            </div>
        </a>
    </Link>
);

// --- PERUBAHAN: Komponen Card Tambah Cabang ---
const AddBranchCard = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="w-full h-full p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 transition-all duration-300 min-h-[150px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span className="mt-3 font-bold text-lg">Tambah Cabang Baru</span>
    </button>
);

export default function SelectBranchPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchBranches = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        
        try {
            const res = await fetch('/api/v1/management/branches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat data cabang');
            setBranches(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <AddBranchDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={fetchBranches}
                branchToEdit={null} // Rename prop locationToEdit to branchToEdit if backend context is used
            />

            <h1 className="text-3xl font-bold text-gray-900 border-b pb-3">Pilih Cabang Klinik</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                {isLoading ? (
                    <div className="flex justify-center items-center p-10 min-h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat daftar cabang...</p>
                    </div>
                ) : (
                    // Grid Layout: 1 kolom di HP, 2 kolom di tablet, 3 kolom di desktop
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {branches.map(branch => (
                            <BranchCard key={branch.id} branch={branch} />
                        ))}
                        <AddBranchCard onClick={() => setIsDialogOpen(true)} />
                    </div>
                )}
            </div>
        </div>
    );
}