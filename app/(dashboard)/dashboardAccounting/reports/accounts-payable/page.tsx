// File: app/(dashboard)/dashboardAccounting/reports/accounts-payable/page.tsx
// VERSI REFACTOR: Responsive Table (Cards) + Polished Summary

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Branch, PurchaseInvoice, Supplier } from '@prisma/client';
import { Loader2, Banknote, Filter } from 'lucide-react'; // Tambah Filter

// Helper (Tidak ada perubahan)
const formatCurrency = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
};
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const addDays = (date: Date | string, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Types (Tidak ada perubahan)
type PayableInvoice = PurchaseInvoice & {
    supplier: { name: string };
    branch: { name: string };
};

export default function AccountsPayablePage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [reportData, setReportData] = useState<{ invoices: PayableInvoice[], totalPayables: number }>({ invoices: [], totalPayables: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState<number | null>(null);
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang (Konsolidasi)');

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${getToken()}` } });
                if (!res.ok) throw new Error('Gagal memuat cabang');
                setBranches(await res.json());
            } catch (error: any) {
                toast.error(error.message);
            }
        };
        fetchBranches();
    }, []);

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { setIsLoading(false); return; }

        const params = new URLSearchParams({ branchId: selectedBranch });

        try {
            const res = await fetch(`/api/v1/accounting/reports/accounts-payable?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Gagal memuat laporan');
            }
            const data = await res.json();
            setReportData({
                invoices: data.invoices,
                totalPayables: parseFloat(data.totalPayables)
            });
            
            const branch = branches.find(b => b.id.toString() === selectedBranch);
            setSelectedBranchName(selectedBranch === 'all' ? 'Semua Cabang (Konsolidasi)' : branch?.name || '');
        } catch (error: any) {
            toast.error(error.message);
            setReportData({ invoices: [], totalPayables: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [selectedBranch, branches]);

    useEffect(() => {
        if (branches.length > 0 || selectedBranch === 'all') {
            fetchReport();
        }
    }, [fetchReport, branches, selectedBranch]);

    const handlePayDebt = async (invoiceId: number) => {
        if (!confirm("Yakin ingin melunasi hutang untuk faktur ini? Jurnal pelunasan akan dibuat secara otomatis.")) {
            return;
        }

        setIsProcessingPayment(invoiceId);
        const token = getToken();
        try {
            const res = await fetch('/api/v1/clinic/purchases/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ purchaseInvoiceId: invoiceId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal memproses pelunasan');

            toast.success(`Pelunasan untuk faktur #${result.internalRefNumber || result.invoiceNumber} berhasil!`);
            fetchReport(); // Refresh data
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessingPayment(null);
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <h1 className="text-3xl font-bold text-gray-900">Laporan Hutang Usaha</h1>

            {/* --- PERUBAHAN: Filter & Summary (Responsive) --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Filter Cabang */}
                <div className="flex-1 min-w-[200px] w-full md:w-auto">
                    <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                         <Filter size={14}/> Filter Cabang
                    </label>
                    <select
                        id="branchFilter"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                         // Style disamakan
                        className="form-select block w-full p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10"
                    >
                        <option value="all">Semua Cabang (Konsolidasi)</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id.toString()}>{branch.name}</option>
                        ))}
                    </select>
                </div>
                
                {/* Total Hutang Card */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex-shrink-0 w-full md:w-56 text-center md:text-right">
                    <p className="text-sm font-medium text-red-700">Total Hutang Usaha Belum Lunas</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(reportData.totalPayables)}</p>
                </div>
            </div>

            {/* --- PERUBAHAN: Report Table/Cards --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Daftar Hutang Belum Dibayar - {selectedBranchName}</h2>
                
                {isLoading ? (
                    <div className="flex justify-center items-center p-10 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat laporan hutang...</p>
                    </div>
                ) : reportData.invoices.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 border rounded-lg bg-gray-50">Tidak ada hutang yang belum dibayar. 🎉</div>
                ) : (
                    <>
                        {/* 1. Tabel Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Tgl. Faktur</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Jatuh Tempo</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">No. Faktur</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Supplier</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Cabang</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Total Hutang</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.invoices.map(invoice => {
                                        const dueDate = addDays(invoice.transactionDate, 30);
                                        const isOverdue = new Date() > dueDate;
                                        return (
                                            <tr key={invoice.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(invoice.transactionDate)}</td>
                                                <td className={`px-4 py-3 whitespace-nowrap font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                                                    {formatDate(dueDate)}
                                                    {isOverdue && <span className="ml-2 text-xs text-white bg-red-500 px-2 py-0.5 rounded-full">Lewat</span>}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{invoice.internalRefNumber}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{invoice.supplier.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{invoice.branch.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handlePayDebt(invoice.id)}
                                                        disabled={isProcessingPayment === invoice.id}
                                                        className="bg-green-600 text-white text-xs px-3 py-1 rounded-full hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1 mx-auto"
                                                    >
                                                        {isProcessingPayment === invoice.id ? <Loader2 size={14} className="animate-spin"/> : <Banknote size={14} />}
                                                        Lunas
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. List Card Mobile */}
                        <div className="block md:hidden space-y-4">
                            {reportData.invoices.map(invoice => {
                                const dueDate = addDays(invoice.transactionDate, 30);
                                const isOverdue = new Date() > dueDate;
                                return (
                                    <div key={invoice.id} className={`bg-white border border-gray-200 p-4 rounded-lg shadow-sm ${isOverdue ? 'ring-2 ring-red-400/50 bg-red-50' : ''}`}>
                                        
                                        {/* Header Card */}
                                        <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{invoice.supplier.name}</h4>
                                                <p className="text-sm text-gray-600">No. Faktur: {invoice.internalRefNumber}</p>
                                            </div>
                                            <span className={`text-xl font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(invoice.totalAmount)}</span>
                                        </div>
                                        
                                        {/* Body Card */}
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Jatuh Tempo</span>
                                                <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{formatDate(dueDate)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Tgl. Faktur</span>
                                                <span className="text-gray-700">{formatDate(invoice.transactionDate)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Cabang</span>
                                                <span className="text-gray-700">{invoice.branch.name}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Footer Card */}
                                        <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handlePayDebt(invoice.id)}
                                                disabled={isProcessingPayment === invoice.id}
                                                className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1.5"
                                            >
                                                {isProcessingPayment === invoice.id ? <Loader2 size={16} className="animate-spin"/> : <Banknote size={16} />}
                                                Lunasi Hutang
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}