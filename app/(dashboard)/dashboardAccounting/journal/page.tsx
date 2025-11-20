// File: app/(dashboard)/dashboardAccounting/journal/page.tsx
// VERSI REFACTOR: Responsive Filters + Refactored Modal + Style Polish

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { JournalEntry, JournalEntryItem, ChartOfAccount, Branch } from '@prisma/client';
import { Loader2, PlusCircle, Trash2, X } from 'lucide-react'; // Tambah icons

// Tipe data (Tidak ada perubahan)
type Coa = { id: number; accountCode: string; accountName: string; };
type JournalItemWithCoa = JournalEntryItem & { chartOfAccount: Coa };
type JournalEntryWithDetails = JournalEntry & { 
    items: JournalItemWithCoa[], 
    branch: { name: string } 
};

// Helper (Tidak ada perubahan)
const formatCurrency = (value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value || 0)); // Ubah ke 0 desimal
const formatDate = (date: Date | string | undefined) => { // Tambah undefined
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); // Ubah format
};
const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];

// --- PERUBAHAN: Komponen Modal Jurnal Manual (Refactor Total) ---
const JournalFormModal = ({ isOpen, onClose, onSave, coaList, branches }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    coaList: Coa[];
    branches: Branch[];
}) => {
    const [items, setItems] = useState([
        { chartOfAccountId: '', amount: '', type: 'DEBIT' },
        { chartOfAccountId: '', amount: '', type: 'CREDIT' },
    ]);
    const [totalDebit, setTotalDebit] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- State untuk header form ---
    const [transactionDate, setTransactionDate] = useState(formatDateForInput(new Date()));
    const [branchId, setBranchId] = useState('');
    const [description, setDescription] = useState('');

    // --- Kalkulasi total (Tidak berubah) ---
    useEffect(() => {
        let debit = 0;
        let credit = 0;
        items.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            if (item.type === 'DEBIT') debit += amount;
            else credit += amount;
        });
        setTotalDebit(debit);
        setTotalCredit(credit);
    }, [items]);

    // --- Styling konsisten ---
    const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
    const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out h-10";
    const inputStyle = `${baseStyle} form-input`;
    const selectStyle = `${baseStyle} form-select`;

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { chartOfAccountId: '', amount: '', type: 'DEBIT' }]);
    const removeItem = (index: number) => {
        if (items.length > 2) setItems(items.filter((_, i) => i !== index));
        else toast.warn('Jurnal harus memiliki minimal 2 baris.');
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const validItems = items.filter(item => item.chartOfAccountId && item.amount);
        const data = {
            transactionDate,
            description,
            branchId, 
            items: validItems.map(item => ({ // Pastikan format item sesuai API
                chartOfAccountId: parseInt(item.chartOfAccountId),
                amount: parseFloat(item.amount),
                type: item.type as 'DEBIT' | 'CREDIT'
            }))
        };
        try {
            await onSave(data);
            // Reset form on success (optional)
            setTransactionDate(formatDateForInput(new Date()));
            setBranchId('');
            setDescription('');
            setItems([
                { chartOfAccountId: '', amount: '', type: 'DEBIT' },
                { chartOfAccountId: '', amount: '', type: 'CREDIT' },
            ]);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Buat Entri Jurnal Manual</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form onSubmit={handleSubmit} id="journal-form" className="flex-grow overflow-y-auto p-5 space-y-4">
                    {/* Header Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="transactionDate" className={labelStyle}>Tanggal</label>
                            <input type="date" id="transactionDate" name="transactionDate" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className={inputStyle} />
                        </div>
                        <div>
                             <label htmlFor="branchId" className={labelStyle}>Cabang</label>
                            <select id="branchId" name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required className={selectStyle}>
                                <option value="" disabled>Pilih Cabang...</option>
                                {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-3">
                             <label htmlFor="description" className={labelStyle}>Deskripsi</label>
                            <input type="text" id="description" name="description" placeholder="Deskripsi Transaksi" value={description} onChange={(e) => setDescription(e.target.value)} required className={inputStyle} />
                        </div>
                    </div>

                    {/* Journal Items */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                        {/* Header Item */}
                        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_120px_auto] gap-2 text-xs font-medium text-gray-500 uppercase">
                            <span>Akun</span>
                            <span className="text-right">Debit</span>
                            <span className="text-right">Kredit</span>
                            <span></span> {/* Kolom Hapus */}
                        </div>
                        {items.map((item, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-2 items-center">
                                <select 
                                    value={item.chartOfAccountId} 
                                    onChange={e => handleItemChange(index, 'chartOfAccountId', e.target.value)} 
                                    className={`${selectStyle} flex-grow`}
                                    required // Tambah required
                                >
                                    <option value="" disabled>Pilih Akun...</option>
                                    {coaList.map(coa => <option key={coa.id} value={coa.id}>{coa.accountCode} - {coa.accountName}</option>)}
                                </select>
                                <input 
                                    type="number" 
                                    step="any" // Ubah step
                                    placeholder="Debit" 
                                    value={item.type === 'DEBIT' ? item.amount : ''} 
                                    onChange={e => handleItemChange(index, 'amount', e.target.value)} 
                                    onFocus={() => handleItemChange(index, 'type', 'DEBIT')} 
                                    className={`${inputStyle} w-full md:w-28 flex-shrink-0 text-right`} 
                                    required={item.type === 'DEBIT'} // Tambah required
                                />
                                <input 
                                    type="number" 
                                    step="any" // Ubah step
                                    placeholder="Kredit" 
                                    value={item.type === 'CREDIT' ? item.amount : ''} 
                                    onChange={e => handleItemChange(index, 'amount', e.target.value)} 
                                    onFocus={() => handleItemChange(index, 'type', 'CREDIT')} 
                                    className={`${inputStyle} w-full md:w-28 flex-shrink-0 text-right`} 
                                    required={item.type === 'CREDIT'} // Tambah required
                                />
                                <button 
                                    type="button" 
                                    onClick={() => removeItem(index)} 
                                    className="text-red-500 hover:text-red-700 p-2 flex-shrink-0"
                                    disabled={items.length <= 2} // Disable jika tinggal 2 item
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={addItem} 
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                        >
                            <PlusCircle size={14} /> Tambah Baris
                        </button>
                    </div>

                    {/* Total Section */}
                     <div className={`flex flex-col md:flex-row justify-between font-semibold p-3 rounded-md text-sm ${totalDebit === totalCredit && totalDebit > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <span>Total Debit: {formatCurrency(totalDebit)}</span>
                        <span>Total Kredit: {formatCurrency(totalCredit)}</span>
                        {totalDebit !== totalCredit && <span className="text-xs">(Belum Balance!)</span>}
                    </div>
                </form>

                {/* Footer Tombol */}
                <div className="flex justify-end gap-4 p-5 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        form="journal-form" // Link ke ID form
                        disabled={totalDebit !== totalCredit || totalDebit === 0 || isSubmitting} 
                        className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function JournalPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [journals, setJournals] = useState<JournalEntryWithDetails[]>([]);
    const [coaList, setCoaList] = useState<Coa[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [startDate, setStartDate] = useState(formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [endDate, setEndDate] = useState(formatDateForInput(new Date()));

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { setIsLoading(false); return; }

        try {
            if (coaList.length === 0 || branches.length === 0) {
                 const [coaRes, branchRes] = await Promise.all([
                     fetch('/api/v1/clinic/accounts', { headers: { 'Authorization': `Bearer ${token}` } }), 
                     fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } })
                 ]);
                 if (!coaRes.ok) throw new Error('Gagal memuat COA');
                 if (!branchRes.ok) throw new Error('Gagal memuat cabang');
                 setCoaList(await coaRes.json());
                 setBranches(await branchRes.json());
            }

            const params = new URLSearchParams({
                branchId: selectedBranch,
                startDate,
                endDate,
            });
            const journalRes = await fetch(`/api/v1/accounting/journal-entries?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!journalRes.ok) throw new Error('Gagal mengambil data jurnal');
            setJournals(await journalRes.json());

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBranch, startDate, endDate, coaList.length, branches.length]); // Dependencies tidak berubah

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const handleSave = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }

        try {
            const res = await fetch('/api/v1/accounting/journal', { // Ganti URL jika perlu
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan jurnal');
            
            toast.success(`Jurnal berhasil ditambahkan!`);
            setIsModalOpen(false);
            fetchData(); // Refresh data
        } catch (error: any) {
            toast.error(error.message);
            // Jangan tutup modal jika error
            throw error; // Re-throw error agar isSubmitting tetap true di modal
        }
    };
    // --- End of Logic ---

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* --- PERUBAHAN: Header & Tombol (Responsive + Style) --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Jurnal Umum</h1>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    // Style disamakan
                    className="flex items-center justify-center gap-2 bg-[#01449D] hover:bg-[#013b8a] text-white font-semibold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto"
                >
                    <PlusCircle size={18}/>
                    <span>Buat Entri Jurnal</span>
                </button>
            </div>
            
            {/* --- PERUBAHAN: Filter Section (Responsive + Style) --- */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Dibuat flex-col di HP, md:flex-row di desktop */}
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1 min-w-0 md:min-w-[200px]">
                        <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
                        <select 
                            id="branchFilter"
                            value={selectedBranch} 
                            onChange={(e) => setSelectedBranch(e.target.value)} 
                            // Pakai form-select
                            className="form-select w-full p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10"
                        >
                            <option value="all">Semua Cabang</option>
                            {branches.map(branch => (<option key={branch.id} value={branch.id.toString()}>{branch.name}</option>))}
                        </select>
                    </div>
                    <div className="flex-shrink-0">
                         <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                         {/* Pakai form-input */}
                        <input type="date" id="startDateFilter" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                     <div className="flex-shrink-0">
                         <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                         {/* Pakai form-input */}
                        <input type="date" id="endDateFilter" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                     {/* Optional: Tombol Apply Filter jika tidak mau auto-refresh */}
                     {/* <button onClick={() => fetchData()} className="...">Terapkan</button> */}
                </div>
            </div>

            {/* --- PERUBAHAN: Jurnal List Container --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                {isLoading ? (
                    <div className="flex justify-center items-center p-10 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat jurnal...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {journals.length === 0 ? (
                             <p className="text-center text-gray-500 py-8">Tidak ada entri jurnal untuk filter yang dipilih.</p>
                        ) : (
                            journals.map(journal => (
                                // Card Jurnal
                                <div key={journal.id} className="border border-gray-200 rounded-lg overflow-hidden transition hover:shadow-md">
                                    {/* Header Jurnal */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-3 border-b border-gray-200 gap-2">
                                        <div>
                                            <p className="font-semibold text-gray-800">{journal.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">{journal.branch.name}</span>
                                                <span className="text-xs text-gray-500">{formatDate(journal.transactionDate)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item Jurnal */}
                                    <div className="divide-y divide-gray-100">
                                        {journal.items.map(item => (
                                            <div key={item.id} className="grid grid-cols-12 gap-2 text-sm p-3">
                                                <p className={`col-span-12 sm:col-span-6 ${item.type === 'CREDIT' ? 'sm:pl-8' : 'sm:pl-0'} text-gray-700`}>
                                                    ({item.chartOfAccount.accountCode}) {item.chartOfAccount.accountName}
                                                </p>
                                                <p className="col-span-6 sm:col-span-3 font-mono text-left sm:text-right text-gray-800">
                                                    {item.type === 'DEBIT' ? formatCurrency(item.amount) : ''}
                                                </p>
                                                <p className="col-span-6 sm:col-span-3 font-mono text-left sm:text-right text-gray-800">
                                                    {item.type === 'CREDIT' ? formatCurrency(item.amount) : ''}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
             <JournalFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} coaList={coaList} branches={branches} />
        </div>
    );
}