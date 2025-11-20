// File: app/(dashboard)/dashboardAccounting/reports/cash-flow/page.tsx
// VERSI REFACTOR: Responsive Filters + Hierarchical Report Styling

'use client';

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
    operating: { activities: [], total: 0 },
    investing: { activities: [], total: 0 },
    financing: { activities: [], total: 0 },
    netCashChange: 0,
    beginningBalance: 0,
    endingBalance: 0,
};

// --- PERUBAHAN: Komponen Report Row (Styling Detail) ---
const ReportRow = ({ label, value, isBold = false, isTotal = false, indent = false }: {
    label: string;
    value: number | undefined | null;
    isBold?: boolean;
    isTotal?: boolean;
    indent?: boolean;
}) => {
    // Style untuk total akhir (double underline)
    const totalStyle = isTotal ? 'border-t-4 border-double border-gray-800' : isBold ? 'border-t border-gray-300' : '';
    const textWeight = isTotal ? 'font-extrabold text-lg text-gray-900' : isBold ? 'font-bold text-gray-800' : 'text-gray-700';

    return (
        <div className={`flex justify-between py-1 ${totalStyle} ${textWeight}`}>
            <span className={`w-3/4 ${indent ? 'pl-6' : 'pl-0'}`}>{label}</span>
            <span className="w-1/4 text-right font-mono">{formatCurrency(value)}</span>
        </div>
    );
};

// Komponen Header Sub-Aktivitas
const ActivityHeader = ({ title }: { title: string }) => (
    <h3 className="font-semibold text-gray-700 border-b border-gray-400 pb-1 mt-4 text-lg">{title}</h3>
);

export default function CashFlowPage() {
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
            startDate,
            endDate,
        });

        try {
            const res = await fetch(`/api/v1/accounting/reports/cash-flow?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal memuat laporan');
            setReportData(result);
            
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
        if (branches.length > 0 || selectedBranch === 'all') {
             // Debounce fetchReport agar tidak terlalu sering terpanggil saat user ganti tanggal
             const handler = setTimeout(() => {
                fetchReport();
             }, 300);
             return () => clearTimeout(handler);
        }
    }, [fetchReport, branches, selectedBranch, startDate, endDate]);


    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            <h1 className="text-3xl font-bold text-gray-900">Laporan Arus Kas</h1>

            {/* --- PERUBAHAN: Filter Section (Responsive) --- */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Dibuat flex-col di HP, md:flex-row di desktop */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-[200px] sm:min-w-[200px]">
                        <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Filter size={14} /> Cabang</label>
                        <select 
                            id="branchFilter"
                            value={selectedBranch} 
                            onChange={(e) => setSelectedBranch(e.target.value)} 
                            className="form-select w-full p-2 border border-gray-300 rounded-lg h-10"
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
                    <p className="ml-3 text-gray-500">Memuat Laporan Arus Kas...</p>
                </div>
            ) : (
                <div className="p-4 md:p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
                    {/* Header Report */}
                    <div className="text-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedBranchName}</h2>
                        <p className="font-semibold text-lg">Laporan Arus Kas</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Untuk Periode {new Date(startDate).toLocaleDateString('id-ID')} s/d {new Date(endDate).toLocaleDateString('id-ID')}
                        </p>
                    </div>

                    {/* Konten Laporan */}
                    <div className="space-y-6 text-sm max-w-lg mx-auto">
                        
                        {/* 1. Operating Activities */}
                        <div>
                            <ActivityHeader title="ARUS KAS DARI AKTIVITAS OPERASI" />
                            {/* Baris Laba Bersih/Penyesuaian */}
                            {reportData.operating.activities.map((item: any, index: number) => (
                                <ReportRow key={index} label={item.description || 'Laba Bersih'} value={item.amount} indent />
                            ))}
                            {/* Total Operasi */}
                            <ReportRow label="Arus Kas Bersih dari Aktivitas Operasi" value={reportData.operating.total} isTotal isBold />
                        </div>

                        {/* 2. Investing Activities */}
                        <div>
                            <ActivityHeader title="ARUS KAS DARI AKTIVITAS INVESTASI" />
                            {reportData.investing.activities.length === 0 ? (
                                <p className="text-gray-500 py-2 italic text-xs pl-6">Tidak ada aktivitas investasi</p>
                            ) : (
                                reportData.investing.activities.map((item: any, index: number) => (
                                    <ReportRow key={index} label={item.description} value={item.amount} indent />
                                ))
                            )}
                            <ReportRow label="Arus Kas Bersih dari Aktivitas Investasi" value={reportData.investing.total} isTotal isBold />
                        </div>
                        
                        {/* 3. Financing Activities */}
                        <div>
                            <ActivityHeader title="ARUS KAS DARI AKTIVITAS PENDANAAN" />
                            {reportData.financing.activities.length === 0 ? (
                                <p className="text-gray-500 py-2 italic text-xs pl-6">Tidak ada aktivitas pendanaan</p>
                            ) : (
                                reportData.financing.activities.map((item: any, index: number) => (
                                    <ReportRow key={index} label={item.description} value={item.amount} indent />
                                ))
                            )}
                            <ReportRow label="Arus Kas Bersih dari Aktivitas Pendanaan" value={reportData.financing.total} isTotal isBold />
                        </div>
                        
                        {/* 4. Summary and Ending Balance */}
                        <div className="pt-4 space-y-2">
                            <ReportRow label="Kenaikan/(Penurunan) Bersih Kas" value={reportData.netCashChange} isBold />
                            <ReportRow label="Ditambah: Saldo Kas Awal Periode" value={reportData.beginningBalance} />
                            
                            <div className="pt-2">
                                <ReportRow label="Saldo Kas Akhir Periode" value={reportData.endingBalance} isTotal isBold />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}