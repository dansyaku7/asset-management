// File: app/(dashboard)/dashboardAccounting/page.tsx
// VERSI REFACTOR: Responsive Table + Style Polish

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Branch, JournalEntry } from '@prisma/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from "lucide-react";

// --- Helper (Tidak ada perubahan) ---
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};
const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// --- State Awal (Tidak ada perubahan) ---
const initialData = {
    kpi: { totalRevenue: 0, totalExpense: 0, profitLoss: 0 },
    charts: { incomeVsExpense: [], expenseComposition: [] },
    recentJournals: [],
};

// --- PERUBAHAN: Komponen Card KPI (Tambah Icon) ---
const KpiCard = ({ title, value, icon, colorClass = 'text-gray-800' }: { 
    title: string; 
    value: string; 
    icon: React.ReactNode; // Tambah prop icon
    colorClass?: string; 
}) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
            {/* Tampilkan Icon */}
            <div className={`text-xl ${colorClass} opacity-70`}>{icon}</div> 
        </div>
        <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{value}</p>
    </div>
);

// --- Komponen Chart (Styling minor) ---
const IncomeExpenseChart = ({ data }: { data: any[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-80">
        <h3 className="font-semibold text-gray-800 mb-4">Pendapatan vs Beban</h3>
        <ResponsiveContainer width="100%" height="90%"> {/* Adjust height */}
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" tickFormatter={(tick) => `Rp${new Intl.NumberFormat('id-ID').format(tick/1000)}k`} axisLine={false} tickLine={false} fontSize={12}/>
                <YAxis type="category" dataKey="name" width={80} axisLine={false} tickLine={false} fontSize={12}/>
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
                <Bar dataKey="value" barSize={35} radius={[0, 5, 5, 0]}> {/* Add radius */}
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Pendapatan' ? '#10b981' : '#f43f5e'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

const ExpensePieChart = ({ data }: { data: any[] }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-80">
            <h3 className="font-semibold text-gray-800 mb-4">Komposisi Beban</h3>
             {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%"> {/* Adjust height */}
                    <PieChart>
                        <Pie 
                          data={data} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" // Center vertically
                          outerRadius={80} 
                          innerRadius={40} // Buat jadi donut chart
                          fill="#8884d8" 
                          labelLine={false} 
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          paddingAngle={2} // Kasih jarak antar slice
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/>)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/> {/* Smaller legend */}
                    </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Tidak ada data beban.</div>
             )}
        </div>
    );
};

export default function AccountingDashboardPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [startDate, setStartDate] = useState(formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [endDate, setEndDate] = useState(formatDateForInput(new Date()));
    const [data, setData] = useState<any>(initialData);
    const [isLoading, setIsLoading] = useState(true);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    useEffect(() => {
        const fetchBranches = async () => {
            const token = getToken();
            try {
                const res = await fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error('Gagal memuat cabang');
                setBranches(await res.json());
            } catch (error: any) {
                toast.error(error.message);
            }
        };
        fetchBranches();
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) {
            toast.error("Sesi tidak valid");
            setIsLoading(false);
            return;
        }

        const params = new URLSearchParams({
            branchId: selectedBranch,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
        });

        try {
            const res = await fetch(`/api/v1/accounting/dashboard-stats?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat data dashboard');
            setData(await res.json());
        } catch (error: any) {
            toast.error(error.message);
            setData(initialData);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBranch, startDate, endDate]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchDashboardData();
        }, 500); 
        return () => clearTimeout(handler);
    }, [fetchDashboardData]);

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* --- PERUBAHAN: Header & Filter (Responsive + Style) --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Akuntansi</h1>
                    <p className="text-gray-500 mt-1">Ringkasan finansial klinik Anda.</p>
                </div>
                
                {/* Filter dibuat flex-col di HP, sm:flex-row di tablet */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        // Pakai form-select biar konsisten
                        className="form-select p-2 border border-gray-300 rounded-lg bg-white shadow-sm h-10 w-full sm:w-auto" 
                    >
                        <option value="all">Semua Cabang</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id.toString()}>{branch.name}</option>
                        ))}
                    </select>
                    
                    {/* Date input diberi style */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-300 shadow-sm h-10 w-full sm:w-auto">
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            // Pakai form-input + style tambahan
                            className="form-input p-1 border-none text-sm w-full focus:ring-0" 
                         />
                        <span className="text-gray-400 mx-1">-</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            // Pakai form-input + style tambahan
                            className="form-input p-1 border-none text-sm w-full focus:ring-0" 
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10 min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-3 text-gray-500">Memuat data dashboard...</p>
                </div>
             ) : (
                <>
                    {/* --- PERUBAHAN: Grid KPI (Responsive + Icon) --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KpiCard title="Total Pendapatan" value={formatCurrency(data.kpi.totalRevenue)} icon={<i className="fas fa-arrow-up"></i>} colorClass="text-green-600" />
                        <KpiCard title="Total Beban" value={formatCurrency(data.kpi.totalExpense)} icon={<i className="fas fa-arrow-down"></i>} colorClass="text-red-600" />
                        <KpiCard title="Laba / Rugi" value={formatCurrency(data.kpi.profitLoss)} icon={<i className="fas fa-balance-scale"></i>} colorClass={data.kpi.profitLoss >= 0 ? 'text-blue-600' : 'text-red-600'} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <IncomeExpenseChart data={data.charts.incomeVsExpense} />
                        <ExpensePieChart data={data.charts.expenseComposition} />
                    </div>

                    {/* --- PERUBAHAN: Tabel Jurnal Terbaru (Responsive) --- */}
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                         <h3 className="font-semibold text-gray-800 mb-4">Aktivitas Jurnal Terbaru</h3>
                         
                         {/* 1. Tabel Desktop */}
                         <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase">Tanggal</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase">Deskripsi</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase">Cabang</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentJournals.length > 0 ? data.recentJournals.map((j: JournalEntry & {branch: {name: string}}) => (
                                        <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(j.transactionDate)}</td>
                                            <td className="px-4 py-3 text-gray-800">{j.description}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">{j.branch.name}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="text-center p-4 text-gray-500">Tidak ada aktivitas jurnal pada periode ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                         </div>

                         {/* 2. List Card Mobile */}
                         <div className="block md:hidden space-y-3">
                             {data.recentJournals.length > 0 ? data.recentJournals.map((j: JournalEntry & {branch: {name: string}}) => (
                                <div key={j.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-gray-500">{formatDate(j.transactionDate)}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{j.branch.name}</span>
                                    </div>
                                    <p className="text-sm text-gray-800">{j.description}</p>
                                </div>
                             )) : (
                                <div className="text-center p-4 text-gray-500">Tidak ada aktivitas jurnal pada periode ini.</div>
                             )}
                         </div>
                    </div>
                </>
             )}
        </div>
    );
}