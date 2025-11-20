// File: app/(dashboard)/dashboardAccounting/reports/general-ledger/page.tsx
// VERSI REFACTOR: Responsive Filters + Scrollable Table (for Mobile)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ChartOfAccount, Branch } from '@prisma/client';
import { Loader2, Search, Calendar, Filter } from 'lucide-react'; // Tambah icons

type LedgerTransaction = {
    date: Date;
    description: string;
    branchName: string; 
    debit: number;
    credit: number;
    balance: number;
};

type LedgerData = {
    account: ChartOfAccount;
    beginningBalance: number;
    transactions: LedgerTransaction[];
    endingBalance: number;
};

// Helper (Diperbaiki: format mata uang)
const formatCurrency = (value: number | any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(Number(value));
const formatDate = (date: Date) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];

export default function GeneralLedgerPage() {
    const [coaList, setCoaList] = useState<ChartOfAccount[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [filters, setFilters] = useState({
        accountId: '',
        branchId: 'all',
        startDate: formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        endDate: formatDateForInput(new Date()),
    });
    const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [selectedAccountName, setSelectedAccountName] = useState('-- Pilih Akun --');


    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    useEffect(() => {
        const fetchInitialData = async () => {
            const token = getToken();
            if (!token) return;
            try {
                // Fetch COA dan Cabang
                const [coaRes, branchRes] = await Promise.all([
                    fetch('/api/v1/accounting/coa', { headers: { 'Authorization': `Bearer ${token}` } }), 
                    fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!coaRes.ok) throw new Error('Gagal mengambil daftar akun');
                if (!branchRes.ok) throw new Error('Gagal mengambil daftar cabang');
                
                setCoaList(await coaRes.json());
                setBranches(await branchRes.json());

            } catch (error: any) {
                toast.error(error.message);
            }
        };
        fetchInitialData();
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        
        // Update nama akun di UI secara instan (jika ada)
        if (name === 'accountId') {
            const account = coaList.find(c => c.id.toString() === value);
            setSelectedAccountName(account ? `${account.accountName} (${account.accountCode})` : '-- Pilih Akun --');
        }
    };

    const handleGenerateReport = async () => {
        if (!filters.accountId) {
            toast.warn('Silakan pilih akun terlebih dahulu.');
            return;
        }
        setIsLoading(true);
        setLedgerData(null);
        const token = getToken();
        try {
            const params = new URLSearchParams({
                accountId: filters.accountId,
                startDate: filters.startDate,
                endDate: filters.endDate,
                branchId: filters.branchId,
            });
            const res = await fetch(`/api/v1/accounting/reports/general-ledger?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal membuat laporan');
            
            // Perbarui data dan nama cabang/akun
            setLedgerData(result);
            const branch = branches.find(b => b.id.toString() === filters.branchId);
            setSelectedBranchName(branch ? branch.name : 'Semua Cabang');

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* --- PERUBAHAN: Header & Filter Section --- */}
            <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Laporan Buku Besar</h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    {/* Filter Cabang */}
                    <div className="sm:col-span-1">
                        <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Filter size={14}/> Cabang</label>
                        <select id="branchId" name="branchId" value={filters.branchId} onChange={handleFilterChange} className="form-select w-full p-2 border border-gray-300 rounded-lg h-10">
                           <option value="all">Semua Cabang</option>
                           {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    
                    {/* Filter Akun */}
                    <div className="sm:col-span-1 md:col-span-2">
                        <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Search size={14}/> Akun</label>
                        <select id="accountId" name="accountId" value={filters.accountId} onChange={handleFilterChange} className="form-select w-full p-2 border border-gray-300 rounded-lg h-10">
                           <option value="">-- Pilih Akun --</option>
                           {coaList.map(coa => <option key={coa.id} value={coa.id}>{coa.accountCode} - {coa.accountName}</option>)}
                        </select>
                    </div>
                    
                    {/* Filter Tanggal Mulai */}
                    <div className="sm:col-span-1 md:col-span-1">
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={14}/> Mulai</label>
                        <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                    
                    {/* Filter Tanggal Selesai */}
                    <div className="sm:col-span-1 md:col-span-1">
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={14}/> Selesai</label>
                        <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                </div>
                
                {/* Tombol Generate */}
                <div className="mt-4">
                    <button onClick={handleGenerateReport} disabled={isLoading || !filters.accountId} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 flex items-center gap-2">
                        {isLoading ? <><Loader2 className="inline w-4 h-4 animate-spin"/> Memproses...</> : 'Tampilkan Laporan'}
                    </button>
                </div>
            </div>

            {/* --- PERUBAHAN: Report Output Section --- */}
            {ledgerData && (
                 <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-6 text-center border-b pb-3">
                        <h2 className="text-xl font-bold text-gray-900">{selectedBranchName}</h2>
                        <p className="font-semibold text-lg text-blue-700">{ledgerData.account.accountName} ({ledgerData.account.accountCode})</p>
                        <p className="text-sm text-gray-500">Periode: {formatDate(new Date(filters.startDate))} - {formatDate(new Date(filters.endDate))}</p>
                    </div>
                    
                    {/* Container yang memaksa scroll horizontal di HP */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="py-2 px-4 text-left font-medium text-gray-600 w-24 min-w-[90px]">Tanggal</th>
                                    <th className="py-2 px-4 text-left font-medium text-gray-600 min-w-[250px]">Deskripsi</th>
                                    <th className="py-2 px-4 text-left font-medium text-gray-600 w-20 min-w-[80px]">Cabang</th>
                                    <th className="py-2 px-4 text-right font-medium text-gray-600 w-32 min-w-[120px]">Debit</th>
                                    <th className="py-2 px-4 text-right font-medium text-gray-600 w-32 min-w-[120px]">Kredit</th>
                                    <th className="py-2 px-4 text-right font-medium text-gray-600 w-32 min-w-[120px]">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-gray-300">
                                    <td colSpan={5} className="py-2 px-4 font-bold bg-gray-50">Saldo Awal ({formatDate(new Date(filters.startDate))})</td>
                                    <td className="py-2 px-4 text-right font-bold bg-gray-50 font-mono">{formatCurrency(ledgerData.beginningBalance)}</td>
                                </tr>
                                {ledgerData.transactions.map((tx, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-4 text-gray-700 whitespace-nowrap">{formatDate(tx.date)}</td>
                                        <td className="py-2 px-4 text-gray-800">{tx.description}</td>
                                        <td className="py-2 px-4 text-gray-500">{tx.branchName}</td>
                                        <td className="py-2 px-4 text-right font-mono text-green-700">{Number(tx.debit) > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                        <td className="py-2 px-4 text-right font-mono text-red-700">{Number(tx.credit) > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                        <td className="py-2 px-4 text-right font-mono font-semibold">{formatCurrency(tx.balance)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-gray-800">
                                    <td colSpan={5} className="py-2 px-4 font-extrabold bg-gray-100 text-lg">Saldo Akhir</td>
                                    <td className="py-2 px-4 text-right font-extrabold bg-gray-100 text-lg font-mono">{formatCurrency(ledgerData.endingBalance)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}