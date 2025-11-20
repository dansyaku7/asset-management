'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Drug, Branch } from '@prisma/client';

// Tipe data yang digunakan
type AggregatedStock = {
    drugId: number;
    drugName: string;
    unit: string;
    branchId: number;
    branchName: string;
    totalQuantity: number;
    batches: { quantity: number; expiryDate: Date; stockId: number }[];
};

type StockForm = {
    drugId: string;
    branchId: string;
    quantity: string;
    expiryDate: string;
};

// --- ICON COMPONENTS (SVG) ---
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const PackageIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
);


// --- UI COMPONENTS ---

// Komponen Modal Tambah Stok yang sudah dipercantik
const AddStockModal = ({ isOpen, onClose, onSave, drugs, branches }: { 
    isOpen: boolean; onClose: () => void; onSave: (formData: StockForm) => void; drugs: Drug[]; branches: Branch[];
}) => {
    if (!isOpen) return null;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data: StockForm = {
            drugId: formData.get('drugId') as string,
            branchId: formData.get('branchId') as string,
            quantity: formData.get('quantity') as string,
            expiryDate: formData.get('expiryDate') as string,
        };
        await onSave(data);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg transform transition-all duration-300 scale-95 hover:scale-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Tambah Stok Obat Baru</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Obat</label>
                        <select name="drugId" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                            <option value="">Pilih Obat...</option>
                            {drugs.map(drug => (<option key={drug.id} value={drug.id}>{drug.name} ({drug.unit})</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cabang Penyimpanan</label>
                        <select name="branchId" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                            <option value="">Pilih Cabang...</option>
                            {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                            <input type="number" name="quantity" min="1" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. 100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tgl. Kedaluwarsa</label>
                            <input type="date" name="expiryDate" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Stok'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Komponen Kartu Stok untuk tampilan mobile-first
const StockCard = ({ stockItem }: { stockItem: AggregatedStock }) => {
    const getExpiryStatus = (batches: AggregatedStock['batches']): { color: string; text: string } => {
        const soon = new Date();
        soon.setDate(soon.getDate() + 90);
        const expired = batches.some(b => new Date(b.expiryDate) < new Date());
        const warning = batches.some(b => new Date(b.expiryDate) < soon && new Date(b.expiryDate) >= new Date());

        if (expired) return { color: 'bg-red-100 text-red-800', text: 'Kedaluwarsa' };
        if (warning) return { color: 'bg-yellow-100 text-yellow-800', text: 'Akan Kedaluwarsa' };
        return { color: 'bg-green-100 text-green-800', text: 'Aman' };
    };
    
    const expiryStatus = getExpiryStatus(stockItem.batches);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 p-5 border border-gray-200">
            {/* Tampilan Mobile & Tablet (default) */}
            <div className="md:hidden">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xl font-bold text-gray-900">{stockItem.drugName}</p>
                        <p className="text-sm text-gray-500">{stockItem.branchName}</p>
                    </div>
                     <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${expiryStatus.color}`}>{expiryStatus.text}</span>
                 </div>
                 <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between items-center">
                     <div>
                        <p className="text-sm text-gray-600">Total Stok</p>
                        <p className="text-2xl font-bold text-blue-600">{stockItem.totalQuantity} <span className="text-base font-medium text-gray-500">{stockItem.unit}</span></p>
                     </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                            Lihat Batch ({stockItem.batches.length})
                        </summary>
                        <ul className="text-left mt-2 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg space-y-1">
                            {stockItem.batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(b => (
                                <li key={b.stockId} className="flex justify-between">
                                    <span>{b.quantity} unit</span>
                                    <span className="font-semibold">Exp: {new Date(b.expiryDate).toLocaleDateString('id-ID')}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                 </div>
            </div>

            {/* Tampilan Desktop (md and up) */}
            <div className="hidden md:grid md:grid-cols-6 md:gap-4 md:items-center">
                <div className="col-span-2">
                    <p className="text-lg font-bold text-gray-900">{stockItem.drugName}</p>
                    <p className="text-sm text-gray-500">{stockItem.branchName}</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stockItem.totalQuantity}</p>
                    <p className="text-sm text-gray-500">{stockItem.unit}</p>
                </div>
                <div className="text-center">
                     <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${expiryStatus.color}`}>{expiryStatus.text}</span>
                </div>
                <div className="col-span-2 text-center">
                     <details className="text-sm relative inline-block">
                        <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                            Lihat Batch ({stockItem.batches.length})
                        </summary>
                        <ul className="absolute z-10 right-0 text-left mt-2 text-xs text-gray-700 bg-white border border-gray-200 shadow-lg p-3 rounded-lg space-y-1 w-52">
                             {stockItem.batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(b => (
                                <li key={b.stockId} className="flex justify-between">
                                    <span>{b.quantity} unit</span>
                                    <span className="font-semibold">Exp: {new Date(b.expiryDate).toLocaleDateString('id-ID')}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            </div>
        </div>
    );
};

// Komponen Skeleton untuk Loading State
const StockCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 mb-4 border border-gray-200 animate-pulse">
        <div className="flex justify-between items-center">
            <div className="w-2/3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between items-center">
            <div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24 mt-1"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-28"></div>
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---
export default function DrugStockPage() {
    const [stock, setStock] = useState<AggregatedStock[]>([]);
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchStockData = useCallback(async (branchIdFilter: string = '') => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const params = branchIdFilter ? `?branchId=${branchIdFilter}` : '';
            const stockRes = await fetch(`/api/v1/clinic/drugs/stock${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
            
            if (!stockRes.ok) throw new Error('Gagal memuat data stok');
            setStock(await stockRes.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const fetchDependencies = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const [drugsRes, branchesRes] = await Promise.all([
                fetch('/api/v1/clinic/drugs', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            setDrugs(await drugsRes.json());
            setBranches(await branchesRes.json());
        } catch (e) { console.error('Failed to load dependencies', e); }
    }, []);

    useEffect(() => {
        fetchDependencies();
        fetchStockData();
    }, [fetchDependencies, fetchStockData]);

    useEffect(() => {
        fetchStockData(selectedBranchId);
    }, [selectedBranchId, fetchStockData]);

    const handleSaveStock = async (formData: StockForm) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }
        
        try {
            const res = await fetch('/api/v1/clinic/drugs/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan stok');
            
            toast.success('Stok berhasil ditambahkan!');
            setIsModalOpen(false);
            fetchStockData(selectedBranchId);
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    return (
        <main className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <AddStockModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveStock} drugs={drugs} branches={branches} />
                
                {/* Header Halaman */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Manajemen Stok Obat</h1>
                    <div className="flex items-center gap-3">
                        <select 
                            value={selectedBranchId} 
                            onChange={(e) => setSelectedBranchId(e.target.value)} 
                            className="p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
                        >
                            <option value="">Semua Cabang</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105"
                        >
                            <PlusIcon />
                            <span>Tambah Stok</span>
                        </button>
                    </div>
                </div>

                 {/* Desktop Headers */}
                <div className="hidden md:grid md:grid-cols-6 md:gap-4 px-5 pb-2 border-b border-gray-200">
                    <div className="col-span-2 text-left text-xs font-semibold text-gray-500 uppercase">Obat & Cabang</div>
                    <div className="text-center text-xs font-semibold text-gray-500 uppercase">Total Stok</div>
                    <div className="text-center text-xs font-semibold text-gray-500 uppercase">Status Kedaluwarsa</div>
                    <div className="col-span-2 text-center text-xs font-semibold text-gray-500 uppercase">Detail Batch</div>
                </div>

                {/* Konten Utama (Daftar Stok) */}
                <div className="mt-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <StockCardSkeleton key={i} />)
                    ) : stock.length > 0 ? (
                        stock.map((s) => <StockCard key={`${s.drugId}-${s.branchId}`} stockItem={s} />)
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
                            <PackageIcon/>
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Stok Obat Kosong</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Belum ada data stok obat. Silakan tambahkan stok baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
