// File: app/(dashboard)/dashboardAccounting/reports/balance-sheet/page.tsx
// VERSI REFACTOR: Responsive Filters + Polished Report Structure

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Branch } from '@prisma/client';
import { Loader2, Filter, Calendar } from 'lucide-react';

// Helper
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Rp 0.00'; // Dibuat 2 desimal
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(value);
};

const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];

const initialReport = {
    period: { asOfDate: '' },
    assets: [], totalAssets: 0,
    liabilities: [], totalLiabilities: 0,
    equity: [], totalEquity: 0,
    totalLiabilitiesAndEquity: 0,
};

// Komponen Pembantu untuk Baris Item
const ReportItem = ({ name, total, isSubTotal = false }: { name: string, total: number, isSubTotal?: boolean }) => (
    <div className={`flex justify-between py-1 border-b border-gray-100 ${isSubTotal ? 'pl-4 text-gray-700' : 'pl-0 text-gray-800'}`}>
        <span className={isSubTotal ? 'font-medium' : 'font-normal'}>{name}</span>
        <span className="font-mono">{formatCurrency(total)}</span>
    </div>
);

// Komponen Pembantu untuk Sub Kategori
const SubCategoryHeader = ({ title }: { title: string }) => (
    <h4 className="text-sm font-semibold text-gray-600 border-b border-gray-200 pb-1 pt-3 uppercase">{title}</h4>
);


export default function BalanceSheetPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [asOfDate, setAsOfDate] = useState(formatDateForInput(new Date()));
    const [reportData, setReportData] = useState<any>(initialReport);
    const [isLoading, setIsLoading] = useState(true);
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

        const params = new URLSearchParams({
            branchId: selectedBranch,
            asOfDate,
        });

        try {
            const res = await fetch(`/api/v1/accounting/reports/balance-sheet?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat laporan neraca');
            const data = await res.json();
            setReportData(data);
            
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
    }, [selectedBranch, asOfDate, branches]);

    useEffect(() => {
        if(branches.length > 0 || selectedBranch === 'all') fetchReport();
    }, [fetchReport, branches]);

    // Cek balance
    const isBalanced = Math.abs(reportData.totalAssets - reportData.totalLiabilitiesAndEquity) < 0.01;

    // Render logic untuk grup akun (Asset, Liability, Equity)
    const renderAccountGroup = (title: string, data: any[], total: number, showSubTotal = true) => {
        // Group items by sub-category if available (assuming data structure might contain sub-categories)
        const groupedData = data.reduce((acc: any, item: any) => {
            const category = item.category || 'Lain-lain';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});

        return (
            <div className="space-y-3">
                <h3 className="text-xl font-bold border-b-2 border-gray-800 pb-1 uppercase">{title}</h3>
                {Object.keys(groupedData).map(category => (
                    <div key={category} className="pl-0 space-y-1">
                        <SubCategoryHeader title={category} />
                        {groupedData[category].map((item: any) => (
                            <ReportItem key={item.name} name={item.name} total={item.total} isSubTotal={false} />
                        ))}
                    </div>
                ))}

                {showSubTotal && (
                     <div className="flex justify-between font-bold text-lg pt-1 mt-4 border-t-4 border-gray-300">
                        <span>TOTAL {title}</span>
                        <span className="font-extrabold font-mono">{formatCurrency(total)}</span>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <h1 className="text-3xl font-bold text-gray-900">Laporan Neraca (Balance Sheet)</h1>

            {/* --- PERUBAHAN: Filter Section (Responsive) --- */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
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
                        <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Calendar size={14} /> Per Tanggal</label>
                        <input 
                            id="dateFilter"
                            type="date" 
                            value={asOfDate} 
                            onChange={(e) => setAsOfDate(e.target.value)} 
                            className="form-input w-full p-2 border border-gray-300 rounded-lg h-10" 
                        />
                    </div>
                </div>
            </div>

            {/* Report Section */}
            {isLoading ? (
                <div className="flex justify-center items-center p-10 min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-3 text-gray-500">Memuat Laporan Neraca...</p>
                </div>
            ) : (
                <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Header Report */}
                    <div className="text-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedBranchName}</h2>
                        <p className="font-semibold text-lg">Laporan Neraca</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Per Tanggal {new Date(asOfDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Laporan 2 Kolom (Responsive) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        
                        {/* Kolom Kiri: Aset */}
                        <div className="space-y-6 md:pr-4 pt-4 md:pt-0">
                            {renderAccountGroup('ASET', reportData.assets, reportData.totalAssets, true)}
                        </div>

                        {/* Kolom Kanan: Liabilitas & Ekuitas */}
                        <div className="space-y-6 md:pl-4 pt-4 md:pt-0">
                            
                            <h3 className="text-xl font-bold border-b-2 border-gray-800 pb-1 uppercase">LIABILITAS & EKUITAS</h3>

                            {/* Grup Liabilitas */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-gray-800 uppercase">Liabilitas</h4>
                                {reportData.liabilities.map((item: any) => (
                                    <ReportItem key={item.name} name={item.name} total={item.total} isSubTotal={true} />
                                ))}
                                <div className="flex justify-between font-bold text-base pt-1 mt-4 border-t-2 border-gray-300">
                                    <span>Total Liabilitas</span>
                                    <span className="font-mono">{formatCurrency(reportData.totalLiabilities)}</span>
                                </div>
                            </div>
                            
                            {/* Grup Ekuitas */}
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-gray-800 uppercase pt-2">Ekuitas</h4>
                                {reportData.equity.map((item: any) => (
                                    <ReportItem key={item.name} name={item.name} total={item.total} isSubTotal={true} />
                                ))}
                                <div className="flex justify-between font-bold text-base pt-1 mt-4 border-t-2 border-gray-300">
                                    <span>Total Ekuitas</span>
                                    <span className="font-mono">{formatCurrency(reportData.totalEquity)}</span>
                                </div>
                            </div>

                            {/* Total Liabilitas + Ekuitas */}
                            <div className={`flex justify-between font-extrabold text-xl pt-1 mt-4 border-t-4 ${
                                isBalanced ? 'border-gray-800 text-gray-900' : 'border-red-500 text-red-500'
                            }`}>
                                <span>TOTAL LIABILITAS & EKUITAS</span>
                                <span className="font-mono">{formatCurrency(reportData.totalLiabilitiesAndEquity)}</span>
                            </div>
                            {!isBalanced && (
                                <p className="text-sm text-red-500 text-right font-medium">
                                    TIDAK BALANCE! Selisih: **{formatCurrency(reportData.totalAssets - reportData.totalLiabilitiesAndEquity)}**
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}