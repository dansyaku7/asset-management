// File: app/(dashboard)/dashboardAccounting/reports/profit-loss/page.tsx
// VERSI REFACTOR: Responsive Filters + Polished Report Structure

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Branch } from '@prisma/client';
import { Loader2, Filter, Calendar } from 'lucide-react';

// Helper
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Rp 0.00';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(value);
};

const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];

const initialReport = {
    period: { startDate: '', endDate: '' },
    revenues: [], totalRevenue: 0,
    expenses: [], totalExpense: 0,
    netIncome: 0,
};

// Komponen Pembantu untuk Baris Item
const ReportRow = ({ name, total, isSubTotal = false }: { name: string, total: number, isSubTotal?: boolean }) => (
    <div className={`flex justify-between text-sm py-1 ${isSubTotal ? 'pl-4 text-gray-700' : 'pl-0 text-gray-800'}`}>
        <span className={isSubTotal ? 'font-medium' : 'font-normal'}>{name}</span>
        <span className="font-mono">{formatCurrency(total)}</span>
    </div>
);


export default function ProfitLossPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [startDate, setStartDate] = useState(formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [endDate, setEndDate] = useState(formatDateForInput(new Date()));
    const [reportData, setReportData] = useState<any>(initialReport);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang (Konsolidasi)');

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${getToken()}` } });
                if (!res.ok) throw new Error('Gagal memuat cabang');
                const data = await res.json();
                setBranches(data);
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

        const params = new URLSearchParams({
            branchId: selectedBranch,
            startDate,
            endDate,
        });

        try {
            const res = await fetch(`/api/v1/accounting/reports/profit-loss?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat laporan laba rugi');
            setReportData(await res.json());
            
            if (selectedBranch === 'all') {
                setSelectedBranchName('Semua Cabang (Konsolidasi)');
            } else {
                const branch = branches.find(b => b.id.toString() === selectedBranch);
                setSelectedBranchName(branch?.name || 'Cabang Terpilih');
            }
        } catch (error: any) {
            toast.error(error.message);
            setReportData(initialReport);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBranch, startDate, endDate, branches]);

    useEffect(() => {
        if(branches.length > 0 || selectedBranch === 'all') fetchReport();
    }, [fetchReport, branches]);


    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <h1 className="text-3xl font-bold text-gray-900">Laporan Laba Rugi</h1>

            {/* --- PERUBAHAN: Filter Section (Responsive + Style) --- */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-[200px] sm:min-w-[200px]">
                        <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Filter size={14} /> Pilih Cabang</label>
                        <select 
                            id="branchFilter"
                            value={selectedBranch} 
                            onChange={(e) => setSelectedBranch(e.target.value)} 
                            className="form-select w-full p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10"
                        >
                            <option value="all">Semua Cabang (Konsolidasi)</option>
                            {branches.map(branch => (<option key={branch.id} value={branch.id.toString()}>{branch.name}</option>))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px] sm:flex-shrink-0">
                         <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Calendar size={14} /> Tanggal Mulai</label>
                        <input type="date" id="startDateFilter" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                    <div className="flex-1 min-w-[150px] sm:flex-shrink-0">
                         <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Calendar size={14} /> Tanggal Selesai</label>
                        <input type="date" id="endDateFilter" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" />
                    </div>
                </div>
            </div>

            {/* Report Section */}
            {isLoading ? (
                <div className="flex justify-center items-center p-10 min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-3 text-gray-500">Memuat Laporan Laba Rugi...</p>
                </div>
            ) : (
                <div className="p-4 md:p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
                    {/* Header Report */}
                    <div className="text-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedBranchName}</h2>
                        <p className="font-semibold text-lg">Laporan Laba Rugi</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Untuk Periode {new Date(startDate).toLocaleDateString('id-ID')} s/d {new Date(endDate).toLocaleDateString('id-ID')}
                        </p>
                    </div>

                    {/* Konten Laporan */}
                    <div className="space-y-6 text-base">
                        
                        {/* 1. Revenues */}
                        <div className="space-y-2">
                            <h3 className="font-bold border-b-2 border-gray-800 pb-1 uppercase text-lg">PENDAPATAN</h3>
                            {reportData.revenues.map((item: any) => (
                                <ReportRow key={item.name} name={item.name} total={item.total} isSubTotal={true} />
                            ))}
                            <div className="flex justify-between font-bold border-t pt-1 mt-3">
                                <span>Total Pendapatan</span>
                                <span className="font-mono">{formatCurrency(reportData.totalRevenue)}</span>
                            </div>
                        </div>

                        {/* 2. Expenses */}
                        <div className="space-y-2 pt-4">
                            <h3 className="font-bold border-b-2 border-gray-800 pb-1 uppercase text-lg">BEBAN</h3>
                            {reportData.expenses.map((item: any) => (
                                <ReportRow key={item.name} name={item.name} total={item.total} isSubTotal={true} />
                            ))}
                            <div className="flex justify-between font-bold border-t pt-1 mt-3">
                                <span>Total Beban</span>
                                <span className="font-mono">{formatCurrency(reportData.totalExpense)}</span>
                            </div>
                        </div>

                        {/* 3. Net Income */}
                        <div className={`p-3 rounded-lg border-t-2 mt-4 ${reportData.netIncome >= 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                            <div className="flex justify-between font-extrabold text-xl">
                                <span>LABA / (RUGI) BERSIH</span>
                                <span className="font-mono">{formatCurrency(reportData.netIncome)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}