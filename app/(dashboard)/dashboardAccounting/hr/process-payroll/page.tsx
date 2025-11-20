// File: app/(dashboard)/dashboardAccounting/hr/process-payroll/page.tsx
// VERSI REFACTOR: Responsive Table + Style Polish

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Payroll, PayrollStatus } from '@prisma/client';
import { Loader2, RefreshCw, Rocket, Banknote, CalendarDays, CalendarCheck } from 'lucide-react'; // Tambah icon
import { Decimal } from '@prisma/client/runtime/library';

// Helper (Tidak ada perubahan)
const formatCurrency = (value: number | string | Decimal | null | undefined) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value || 0));
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// Tipe data (Tidak ada perubahan)
type PayrollHistoryItem = Payroll & {
    employeeCount: number;
    totalNetPay: Decimal;
    branchName: string;
}

// --- PERUBAHAN: Komponen Status Badge ---
const StatusBadge = ({ status }: { status: PayrollStatus }) => {
    const statusText = status === 'PAID' ? 'Lunas' : 'Belum Lunas';
    const colorClass = status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const icon = status === 'PAID' ? <CalendarCheck size={12} className="mr-1" /> : <CalendarDays size={12} className="mr-1" />;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {icon}
            {statusText}
        </span>
    );
};


export default function ProcessPayrollPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [history, setHistory] = useState<PayrollHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [payingId, setPayingId] = useState<number | null>(null);
    
    const defaultPeriod = useMemo(() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return {
            month: lastMonth.getMonth().toString(), // 0-11
            year: lastMonth.getFullYear().toString()
        };
    }, []);

    const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);
    const [selectedYear, setSelectedYear] = useState(defaultPeriod.year);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { setIsLoading(false); return; }
        
        try {
            const res = await fetch('/api/v1/accounting/hr/payroll-history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat riwayat penggajian');
            setHistory(await res.json());
        } catch (error: any) {
            toast.error(error.message);
            setHistory([]); 
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleProcessPayroll = async () => {
        if (!confirm(`Anda akan menjalankan proses penggajian untuk periode ${new Date(parseInt(selectedYear), parseInt(selectedMonth)).toLocaleString('id-ID', {month: 'long', year: 'numeric'})}. Proses ini tidak dapat diulang. Lanjutkan?`)) {
            return;
        }

        setIsProcessing(true);
        const token = getToken();
        try {
            const res = await fetch('/api/v1/accounting/hr/run-payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    month: parseInt(selectedMonth),
                    year: parseInt(selectedYear),
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal memproses penggajian');

            toast.success(
                <div>
                    <p className="font-bold">Penggajian Selesai!</p>
                    <p className="text-sm">{result.message}</p>
                    <p className="text-sm">Total Beban Gaji: {formatCurrency(result.totalExpense)}</p>
                </div>, { autoClose: 10000 }
            );
            fetchHistory();
        } catch (error: any) {
            toast.error(error.message, { autoClose: 10000 });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handlePaySalary = async (payrollId: number) => {
        if (!confirm("Yakin ingin menandai gaji periode ini sebagai lunas? Jurnal pembayaran akan dibuat.")) return;
        
        setPayingId(payrollId);
        const token = getToken();
        try {
            const res = await fetch('/api/v1/accounting/hr/payroll-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ payrollId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal memproses pembayaran gaji');
            
            toast.success('Pembayaran gaji berhasil dicatat!');
            fetchHistory();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setPayingId(null);
        }
    };

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    // --- End of Logic ---

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" />
            <h1 className="text-3xl font-bold text-gray-900">Proses Penggajian Bulanan</h1>

            {/* --- PERUBAHAN: Blok Pilih Periode (Responsive + Style) --- */}
            <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Pilih Periode Penggajian</h2>
                {/* Dibuat flex-col di HP, md:flex-row di desktop */}
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1 min-w-0">
                        <label htmlFor="monthSelect" className="block text-sm font-medium text-gray-700">Bulan</label>
                        <select 
                            id="monthSelect"
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(e.target.value)} 
                            // Pakai form-select
                            className="form-select mt-1 w-full p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10"
                        >
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div className="flex-shrink-0">
                        <label htmlFor="yearSelect" className="block text-sm font-medium text-gray-700">Tahun</label>
                        <select 
                            id="yearSelect"
                            value={selectedYear} 
                            onChange={e => setSelectedYear(e.target.value)} 
                            // Pakai form-select
                            className="form-select mt-1 w-full md:w-32 p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={handleProcessPayroll}
                        disabled={isProcessing}
                        // Style disamakan
                        className="bg-[#01449D] text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-800 disabled:bg-gray-400 flex items-center justify-center gap-2 h-10 w-full md:w-auto flex-shrink-0"
                    >
                        {isProcessing ? <><Loader2 size={18} className="animate-spin"/> Memproses...</> : <><Rocket size={18} /> Jalankan Proses Gaji</>}
                    </button>
                </div>
            </div>

            {/* --- PERUBAHAN: Blok Riwayat Penggajian (Responsive Table + Style) --- */}
             <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Riwayat Penggajian</h2>
                    <button onClick={fetchHistory} disabled={isLoading} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/> Refresh
                    </button>
                </div>
                
                {isLoading ? (
                     <div className="flex justify-center items-center p-10 min-h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat riwayat...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Tabel Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Periode</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tgl. Eksekusi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cabang Jurnal</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Jumlah Karyawan</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Gaji Bersih</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                 <tbody className="bg-white divide-y divide-gray-200">
                                    {history.length === 0 ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-gray-500">Belum ada riwayat penggajian.</td></tr>
                                    ) : (
                                        history.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                    {new Date(p.periodYear, p.periodMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(p.executionDate)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.branchName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">{p.employeeCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">{formatCurrency(p.totalNetPay)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <StatusBadge status={p.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {p.status === 'UNPAID' && (
                                                        <button
                                                            onClick={() => handlePaySalary(p.id)}
                                                            disabled={payingId === p.id}
                                                            // Style tombol disamakan
                                                            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1 mx-auto"
                                                        >
                                                            {payingId === p.id ? <Loader2 size={14} className="animate-spin"/> : <Banknote size={14} />}
                                                            Bayar Gaji
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. List Card Mobile */}
                        <div className="block md:hidden space-y-4">
                            {history.length === 0 ? (
                                <div className="py-10 text-center text-gray-500">Belum ada riwayat penggajian.</div>
                            ) : (
                                history.map(p => (
                                    <div key={p.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">
                                                    {new Date(p.periodYear, p.periodMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                                                </h4>
                                                <p className="text-sm text-gray-500">Eksekusi: {formatDate(p.executionDate)}</p>
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        {/* Card Body */}
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Cabang Jurnal</span> 
                                                <span className="text-gray-700">{p.branchName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Jml Karyawan</span> 
                                                <span className="text-gray-700">{p.employeeCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-600">Total Gaji Bersih</span> 
                                                <span className="text-gray-900 font-bold">{formatCurrency(p.totalNetPay)}</span>
                                            </div>
                                        </div>
                                        {/* Card Footer */}
                                        {p.status === 'UNPAID' && (
                                            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handlePaySalary(p.id)}
                                                    disabled={payingId === p.id}
                                                    // Tombol di mobile dibuat lebih besar
                                                    className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1.5"
                                                >
                                                    {payingId === p.id ? <Loader2 size={16} className="animate-spin"/> : <Banknote size={16} />}
                                                    Bayar Gaji
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
             </div>
        </div>
    );
}