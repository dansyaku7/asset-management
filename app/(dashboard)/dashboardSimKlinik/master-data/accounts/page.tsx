// File: app/(dashboard)/dashboardSimKlinik/[branchId]/master-data/accounts/page.tsx
// VERSI RESPONSIF & LEBIH BAGUS

"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ChartOfAccount, AccountCategory, PaymentAccountMapping } from '@prisma/client';
import { Loader2, DollarSign, BarChart3, Edit, Trash2 } from 'lucide-react';

// --- Helper Fungsi ---
const getMappingText = (mapping: PaymentAccountMapping | null | undefined) => { // Handle null/undefined
    if (!mapping) return "Tidak Ada Mapping Khusus"; // Default text
    switch (mapping) {
        case PaymentAccountMapping.CASH_RECEIPT: return "Kas/Bank Penerimaan (Cash Receipt)";
        case PaymentAccountMapping.SERVICE_REVENUE: return "Pendapatan Jasa (Service Revenue)";
        case PaymentAccountMapping.DRUG_REVENUE: return "Pendapatan Obat (Drug Revenue)";
        case PaymentAccountMapping.INVENTORY_ASSET: return "Persediaan Obat (Inventory Asset)";
        case PaymentAccountMapping.ACCOUNTS_PAYABLE: return "Hutang Usaha (Accounts Payable)";
        case PaymentAccountMapping.FIXED_ASSET: return "Aset Tetap (Fixed Asset)";
        case PaymentAccountMapping.ACCUMULATED_DEPRECIATION: return "Akumulasi Penyusutan (Acct. Depreciation)";
        case PaymentAccountMapping.DEPRECIATION_EXPENSE: return "Beban Penyusutan (Depreciation Expense)";
        case PaymentAccountMapping.ASSET_DISPOSAL_LOSS: return "Rugi Pelepasan Aset (Asset Disposal Loss)";
        case PaymentAccountMapping.SALARY_EXPENSE: return "Beban Gaji (Salary Expense)";
        case PaymentAccountMapping.SALARY_PAYABLE: return "Hutang Gaji (Salary Payable)";
        default: return "Tidak Ada Mapping Khusus";
    }
};

const getCategoryBadge = (category: AccountCategory) => {
    switch (category) {
        case 'ASSET': return { text: 'ASET', color: 'bg-blue-100 text-blue-800 border-blue-300' };
        case 'LIABILITY': return { text: 'LIABILITAS', color: 'bg-red-100 text-red-800 border-red-300' };
        case 'EQUITY': return { text: 'EKUITAS', color: 'bg-purple-100 text-purple-800 border-purple-300' };
        case 'REVENUE': return { text: 'PENDAPATAN', color: 'bg-green-100 text-green-800 border-green-300' };
        case 'EXPENSE': return { text: 'BEBAN', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
        default: return { text: category, color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
};

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- Komponen Card View untuk Mobile ---
const AccountCard = ({ account, onEdit, onDelete }: { 
    account: ChartOfAccount, 
    onEdit: (account: ChartOfAccount) => void, 
    onDelete: (id: number) => void 
}) => {
    const category = getCategoryBadge(account.category);
    return (
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow space-y-2">
            <div className="flex justify-between items-start border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900">{account.accountCode} - {account.accountName}</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${category.color}`}>
                    {category.text}
                </span>
            </div>

            <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                    <strong className="font-semibold text-gray-700">Mapping Jurnal:</strong> 
                    <br className="sm:hidden" /> {getMappingText(account.paymentMapping)}
                </p>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                    onClick={() => onEdit(account)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                > 
                    <Edit size={16} className="mr-1" /> Edit
                </button>
                <button
                    onClick={() => onDelete(account.id)}
                    className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium bg-red-50 px-3 py-1 rounded-lg transition-colors"
                > 
                    <Trash2 size={16} className="mr-1" /> Hapus
                </button>
            </div>
        </div>
    );
};

// --- Komponen Skeleton Loader untuk Tabel ---
const TableSkeleton = () => (
    <>
        {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 float-right"></div></td>
            </tr>
        ))}
    </>
);

// --- Komponen Dialog (Modal) ---
const AccountDialog = ({ isOpen, onClose, onSave, accountToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    accountToEdit: ChartOfAccount | null;
}) => {
    // Hanya render jika terbuka
    if (!isOpen) return null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!accountToEdit;

    // Reset form state saat modal dibuka/tutup
    useEffect(() => {
        if (!isOpen) return;
        // Optionally reset internal form state if needed, but using defaultValue handles it well.
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        // Buat objek data yang dikirim
        const data = {
            id: isEditing ? accountToEdit?.id : undefined, // Sertakan ID jika Edit
            accountCode: formData.get('accountCode') as string,
            accountName: formData.get('accountName') as string,
            category: formData.get('category') as AccountCategory,
            paymentMapping: formData.get('paymentMapping') as PaymentAccountMapping,
        };
        
        try {
            await onSave(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-transform duration-300 scale-100">
                <h2 className="text-2xl font-bold mb-5 text-blue-700">{isEditing ? 'Edit Akun COA' : 'Tambah Akun COA Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Akun</label>
                        <input
                            type="text" name="accountCode"
                            defaultValue={accountToEdit?.accountCode || ''}
                            required placeholder="Contoh: 1-1120"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Akun</label>
                        <input
                            type="text" name="accountName"
                            defaultValue={accountToEdit?.accountName || ''}
                            required placeholder="Contoh: Kas di Bank Mandiri"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                            <select
                                name="category"
                                defaultValue={accountToEdit?.category || ''}
                                required
                                className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition-shadow appearance-none"
                            >
                                <option value="" disabled>Pilih Kategori...</option>
                                {Object.values(AccountCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mapping Jurnal Otomatis</label>
                            <select
                                name="paymentMapping"
                                defaultValue={accountToEdit?.paymentMapping || PaymentAccountMapping.NONE}
                                className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition-shadow appearance-none"
                            >
                                {/* Loop melalui enum dan tampilkan teks yang benar */}
                                {(Object.keys(PaymentAccountMapping) as Array<keyof typeof PaymentAccountMapping>).map(key => (
                                    <option key={key} value={key}>
                                        {getMappingText(PaymentAccountMapping[key])}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Peran akun untuk jurnal otomatis.</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">Batal</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Komponen Halaman Utama ---
export default function AccountsPage() {
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<ChartOfAccount | null>(null);

    const handleCloseDialog = () => { setIsDialogOpen(false); setAccountToEdit(null); };

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
        
        try {
            const res = await fetch('/api/v1/clinic/accounts', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal memuat Chart of Accounts');
            const data: ChartOfAccount[] = await res.json();
            
            // Urutkan berdasarkan Kode Akun (Ascending)
            const sortedAccounts = data.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
            setAccounts(sortedAccounts);
        } catch (error: any) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    const handleSaveAccount = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        const url = accountToEdit ? `/api/v1/clinic/accounts/${accountToEdit.id}` : '/api/v1/clinic/accounts';
        const method = accountToEdit ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data), });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menyimpan data'); }
            toast.success(`Akun berhasil ${accountToEdit ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseDialog();
            fetchAccounts(); 
        } catch (error: any) { toast.error(error.message); throw error; /* rethrow for dialog to catch */ }
    };

    const handleDeleteAccount = async (accountId: number) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        if (confirm("Yakin ingin menghapus akun ini? Tindakan ini tidak dapat dibatalkan.")) {
            try {
                const res = await fetch(`/api/v1/clinic/accounts/${accountId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Gagal menghapus data'); }
                toast.success("Akun berhasil dihapus!");
                fetchAccounts(); 
            } catch (error: any) { toast.error(error.message); }
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6">
            <ToastContainer position="top-right" autoClose={3000} newestOnTop />
            <AccountDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSaveAccount}
                accountToEdit={accountToEdit}
            />

            {/* Header Halaman */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 mb-3 sm:mb-0">
                    <BarChart3 className='w-7 h-7 text-blue-600' />
                    Master Data Chart of Accounts (COA)
                </h1>
                <button
                    onClick={() => { setAccountToEdit(null); setIsDialogOpen(true); }}
                    className="flex items-center gap-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all shadow-md"
                >
                    <DollarSign size={20} /> Tambah Akun Baru
                </button>
            </div>

            {/* Konten Utama (Tabel/Card) */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl">
                {/* Desktop/Tablet View (Tabel) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[10%]">Kode Akun</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[25%]">Nama Akun</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[15%]">Kategori</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[35%]">Mapping Jurnal Otomatis</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-[15%]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? <TableSkeleton /> : accounts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        Belum ada data Chart of Accounts. Silakan tambahkan akun baru.
                                    </td>
                                </tr>
                            ) : (
                                accounts.map(account => {
                                    const category = getCategoryBadge(account.category);
                                    return (
                                        <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-700">{account.accountCode}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{account.accountName}</td>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border ${category.color}`}>
                                                    {category.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-700">
                                                {getMappingText(account.paymentMapping)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => { setAccountToEdit(account); setIsDialogOpen(true); }}
                                                    className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                                                > Edit </button>
                                                <button
                                                    onClick={() => handleDeleteAccount(account.id)}
                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                > Hapus </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Card) */}
                <div className="md:hidden space-y-4">
                    {isLoading ? (
                        <>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="p-4 bg-gray-100 rounded-xl h-32 animate-pulse shadow-md"></div>
                            ))}
                        </>
                    ) : accounts.length === 0 ? (
                        <div className="py-10 text-center text-gray-500">
                            Belum ada data Chart of Accounts. Silakan tambahkan akun baru.
                        </div>
                    ) : (
                        accounts.map(account => (
                            <AccountCard 
                                key={account.id} 
                                account={account} 
                                onEdit={() => { setAccountToEdit(account); setIsDialogOpen(true); }}
                                onDelete={handleDeleteAccount}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}