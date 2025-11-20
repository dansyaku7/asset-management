// File: app/(dashboard)/dashboardAccounting/master-data/coa/page.tsx
// VERSI REFACTOR: Responsive Table + Refactored Modal + Style Polish

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AccountCategory, PaymentAccountMapping } from '@prisma/client';
import { Loader2, PlusCircle, Pencil, X } from 'lucide-react'; // Tambah icons

// Tipe Data (Tidak ada perubahan)
type ChartOfAccount = {
    id: number;
    accountCode: string;
    accountName: string;
    category: AccountCategory;
    paymentMapping: PaymentAccountMapping;
};

// Helper (Tidak ada perubahan)
const getMappingText = (mapping: PaymentAccountMapping | null | undefined) => { // Handle null/undefined
    if (!mapping) return "Tidak Ada Mapping Khusus"; // Default text
    switch (mapping) {
        case PaymentAccountMapping.CASH_RECEIPT: return "Kas/Bank Penerimaan (Penjualan)";
        case PaymentAccountMapping.SERVICE_REVENUE: return "Pendapatan Jasa";
        case PaymentAccountMapping.DRUG_REVENUE: return "Pendapatan Obat";
        case PaymentAccountMapping.INVENTORY_ASSET: return "Persediaan Obat (Aset)";
        case PaymentAccountMapping.ACCOUNTS_PAYABLE: return "Hutang Usaha (Liabilitas)";
        case PaymentAccountMapping.FIXED_ASSET: return "Aset Tetap";
        case PaymentAccountMapping.ACCUMULATED_DEPRECIATION: return "Akumulasi Penyusutan";
        case PaymentAccountMapping.DEPRECIATION_EXPENSE: return "Beban Penyusutan";
        case PaymentAccountMapping.ASSET_DISPOSAL_LOSS: return "Rugi Pelepasan Aset";
        case PaymentAccountMapping.SALARY_EXPENSE: return "Beban Gaji";
        case PaymentAccountMapping.SALARY_PAYABLE: return "Hutang Gaji";
        default: return "Tidak Ada Mapping Khusus";
    }
};

// --- PERUBAHAN: Komponen Modal COA (Refactor Total) ---
const CoaFormModal = ({ isOpen, onClose, onSave, accountToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: any) => Promise<void>; // Make async
    accountToEdit: ChartOfAccount | null;
}) => {
    if (!isOpen) return null;
    
    const [isSubmitting, setIsSubmitting] = useState(false); // State submitting

    // Style konsisten
    const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
    const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out h-10";
    const inputStyle = `${baseStyle} form-input`;
    const selectStyle = `${baseStyle} form-select`;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true); // Mulai submitting
        const formData = new FormData(e.currentTarget);
        const data = {
            ...Object.fromEntries(formData.entries()),
            // Pastikan paymentMapping adalah enum yang valid atau 'NONE' string
            paymentMapping: formData.get('paymentMapping') as PaymentAccountMapping || PaymentAccountMapping.NONE, 
        };
        try {
            await onSave(data); // Tunggu proses save selesai
        } catch (error) {
           // Error sudah dihandle di onSave, tidak perlu toast lagi di sini
        } finally {
            setIsSubmitting(false); // Selesai submitting
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{accountToEdit ? 'Edit Akun' : 'Tambah Akun Baru'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form onSubmit={handleSubmit} id="coa-form" className="flex-grow overflow-y-auto p-5 space-y-4">
                    <div>
                        <label htmlFor="accountCode" className={labelStyle}>Kode Akun</label>
                        <input type="text" name="accountCode" id="accountCode" defaultValue={accountToEdit?.accountCode} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="accountName" className={labelStyle}>Nama Akun</label>
                        <input type="text" name="accountName" id="accountName" defaultValue={accountToEdit?.accountName} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="category" className={labelStyle}>Kategori</label>
                        <select name="category" id="category" defaultValue={accountToEdit?.category} required className={selectStyle}>
                            <option value="" disabled>Pilih Kategori</option>
                            {/* Pastikan Enum AccountCategory tersedia */}
                            {Object.values(AccountCategory).map(cat => (
                                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option> // Replace underscore
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="paymentMapping" className={labelStyle}>Mapping Jurnal Otomatis</label>
                        <select name="paymentMapping" id="paymentMapping" defaultValue={accountToEdit?.paymentMapping || 'NONE'} className={selectStyle}>
                             {/* Pastikan Enum PaymentAccountMapping tersedia */}
                             {(Object.keys(PaymentAccountMapping) as Array<keyof typeof PaymentAccountMapping>).map(key => (
                                <option key={key} value={key}>
                                    {getMappingText(PaymentAccountMapping[key])} 
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Pilih peran akun untuk jurnal otomatis (opsional).</p>
                    </div>
                </form>

                {/* Footer Tombol */}
                <div className="flex justify-end gap-4 p-5 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all">
                        Batal
                    </button>
                    <button type="submit" form="coa-form" disabled={isSubmitting} className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all">
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


export default function CoaPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        try {
            const res = await fetch('/api/v1/clinic/accounts', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal mengambil data COA');
            setAccounts(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (account: ChartOfAccount | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingAccount(null);
        setIsModalOpen(false);
    };

    const handleSave = async (formData: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return Promise.reject(); } // Return reject

        const url = editingAccount ? `/api/v1/clinic/accounts/${editingAccount.id}` : '/api/v1/clinic/accounts';
        const method = editingAccount ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (!res.ok) { 
                const result = await res.json();
                throw new Error(result.error || 'Gagal menyimpan data');
            }
            
            toast.success(`Akun berhasil ${editingAccount ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseModal();
            fetchData();
            return Promise.resolve(); // Return resolve
        } catch (error: any) {
            toast.error(error.message);
            return Promise.reject(); // Return reject agar modal tahu save gagal
        }
    };
    // --- End of Logic ---

    return (
        // --- PERUBAHAN: Container Utama ---
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* --- PERUBAHAN: Header & Tombol (Responsive) --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Master Chart of Accounts (COA)</h1>
                <button 
                    onClick={() => handleOpenModal()} 
                    // Style disamakan
                    className="flex items-center justify-center gap-2 bg-[#01449D] hover:bg-[#013b8a] text-white font-semibold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto"
                >
                    <PlusCircle size={18}/>
                    <span>Tambah Akun</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10 min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-3 text-gray-500">Memuat data COA...</p>
                </div> 
            ) : (
                <>
                    {/* --- 1. Tampilan Tabel Desktop --- */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Kode Akun</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Nama Akun</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Kategori</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Mapping Jurnal</th>
                                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-600 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {accounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-gray-50">
                                        <td className="py-4 px-4 font-mono text-gray-700">{acc.accountCode}</td>
                                        <td className="py-4 px-4 font-medium text-gray-900">{acc.accountName}</td>
                                        <td className="py-4 px-4 text-gray-600">{acc.category.replace('_', ' ')}</td>
                                        <td className="py-4 px-4 text-xs text-gray-500">
                                            {getMappingText(acc.paymentMapping)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <TooltipIconButton 
                                                onClick={() => handleOpenModal(acc)} 
                                                icon={<Pencil size={16}/>}
                                                tooltip="Edit Akun" 
                                                colorClass="text-blue-600 hover:text-blue-900" 
                                            />
                                            {/* Tombol Hapus bisa ditambahkan di sini jika perlu */}
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                     <tr><td colSpan={5} className="py-10 text-center text-gray-500">Belum ada data akun.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- 2. Tampilan Card Mobile --- */}
                    <div className="block md:hidden space-y-4">
                        {accounts.length === 0 ? (
                             <div className="py-10 text-center text-gray-500">Belum ada data akun.</div>
                        ) : (
                            accounts.map((acc) => (
                                <div key={acc.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{acc.accountName}</h4>
                                            <p className="text-sm text-gray-500 font-mono">{acc.accountCode}</p>
                                        </div>
                                         <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full whitespace-nowrap">
                                            {acc.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="text-xs text-gray-600 mb-4">
                                        <span className="font-semibold">Mapping:</span> {getMappingText(acc.paymentMapping)}
                                    </div>
                                    
                                    {/* Card Footer (Actions) */}
                                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                        <button 
                                            onClick={() => handleOpenModal(acc)} 
                                            className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full hover:bg-blue-200 flex items-center gap-1"
                                        >
                                            <Pencil size={14} /> Edit
                                        </button>
                                        {/* Tombol Hapus bisa ditambahkan di sini jika perlu */}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {isModalOpen && <CoaFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} accountToEdit={editingAccount} />}
        </div>
    );
}