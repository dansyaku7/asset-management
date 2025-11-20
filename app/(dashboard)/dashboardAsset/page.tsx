// File: app/(dashboard)/dashboardAsset/page.tsx
// VERSI LENGKAP: Menambahkan tombol dan modal untuk menjalankan penyusutan otomatis

"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Asset, User, Branch } from "@prisma/client";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import JurnalTerakhir from "./components/JurnalTerakhir";
import NotificationWidget from "./components/NotificationWidget";
import { Loader2 } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Tipe data
type AssetWithDetails = Asset & { 
    pic: User | null; 
    branch: Branch; 
    currentValue: number; 
    accumulatedDepreciation: number; 
    price: number; 
    notification: { type: 'warning' | 'error', message: string } | null; 
};
type ApiResponse = { 
    summary: { 
        totalInitialValue: number; 
        totalCurrentValue: number; 
        totalDepreciation: number; 
    }; 
    assets: AssetWithDetails[]; 
};

// Helper
const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

// Komponen Modal Konfirmasi Penyusutan
const DepreciationModal = ({ isOpen, onClose, onConfirm, targetPeriod }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    targetPeriod: { month: number, year: number }
}) => {
    if (!isOpen) return null;

    const periodText = new Date(targetPeriod.year, targetPeriod.month).toLocaleString('id-ID', {
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Konfirmasi Proses Penyusutan</h2>
                <p className="mb-4 text-gray-700">
                    Anda akan menjalankan proses penyusutan aset untuk periode <span className="font-bold">{periodText}</span>.
                    Sistem akan menghitung dan membuat jurnal penyusutan untuk semua aset yang memenuhi syarat.
                </p>
                <p className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md mb-6">
                    <strong>Penting:</strong> Pastikan semua transaksi perolehan aset untuk periode ini sudah dicatat. Proses ini tidak dapat diulang untuk periode yang sama.
                </p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold">Batal</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
                        Ya, Jalankan Penyusutan
                    </button>
                </div>
            </div>
        </div>
    );
};

// Komponen Card
const DonutChartCard = ({ title, data, summaryText }: { title: string; data: any; summaryText: React.ReactNode; }) => ( <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3><div className="flex flex-col md:flex-row items-center gap-6"><div className="w-32 h-32 relative flex items-center justify-center"><Doughnut data={data.chartData} options={{ responsive: true, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: true } } }} /><div className="absolute text-center"><span className="text-2xl font-bold">{data.centerText}</span><br/><span className="text-xs text-gray-500">{data.centerSubtext}</span></div></div><div className="text-sm text-gray-600 space-y-2">{summaryText}</div></div></div> );
const CalendarCard = ({ assets, selectedDate, onSelectDate }: { assets: AssetWithDetails[], selectedDate?: Date, onSelectDate: (date?: Date) => void }) => ( <div className="bg-white p-6 rounded-lg shadow-md h-full"><h3 className="text-lg font-bold text-gray-800 mb-4">Kalender Pembelian Aset</h3><div className="flex justify-center"><DayPicker mode="single" selected={selectedDate} onSelect={onSelectDate} locale={id} modifiers={{ purchased: assets.map(a => a.purchaseDate ? new Date(a.purchaseDate) : null).filter((d): d is Date => d !== null) }} modifiersStyles={{ purchased: { fontWeight: 'bold', color: '#01449D' } }} /></div></div> );
const JournalCard = ({ assets, selectedDate }: { assets: AssetWithDetails[], selectedDate?: Date }) => ( <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold text-gray-800 mb-4">Aset Dibeli pada {selectedDate ? format(selectedDate, 'd MMM yyyy', { locale: id }) : 'Tanggal Dipilih'}</h3><div className="space-y-4 max-h-60 overflow-y-auto pr-2">{assets.length > 0 ? ( assets.map(asset => ( <div key={asset.id} className="border-b pb-2"><p className="font-bold text-[#01449D]">{asset.productName.toUpperCase()}</p><p className="text-sm text-gray-500">Tgl Beli: {new Date(asset.purchaseDate).toLocaleDateString("id-ID")}</p><p className="text-sm text-gray-500">Harga: {formatRupiah(asset.price)}</p><p className="text-sm text-gray-500">Cabang: {asset.branch.name}</p></div> )) ) : (<p className="text-sm text-gray-500 text-center pt-8">Tidak ada pembelian pada tanggal ini.</p>)}</div></div> );


export default function AssetDashboardPage() {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    // State untuk penyusutan
    const [isDepreciationModalOpen, setIsDepreciationModalOpen] = useState(false);
    const [isDepreciating, setIsDepreciating] = useState(false);
    const targetPeriod = useMemo(() => {
        const lastMonth = subMonths(new Date(), 1);
        return { month: lastMonth.getMonth(), year: lastMonth.getFullYear() };
    }, []);
    
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/assets");
        if (!response.ok) throw new Error("Gagal memuat data aset");
        const apiData: ApiResponse = await response.json();
        setData(apiData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRunDepreciation = async () => {
        setIsDepreciationModalOpen(false);
        setIsDepreciating(true);
        const token = localStorage.getItem('authToken');
        
        try {
            const res = await fetch('/api/v1/accounting/depreciation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(targetPeriod),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menjalankan penyusutan');

            toast.success(
                <div>
                    <p className="font-bold">{result.message}</p>
                    {result.details && result.details.length > 0 && (
                        <ul className="text-sm list-disc list-inside">
                            {result.details.map((d: string, i: number) => <li key={i}>{d}</li>)}
                        </ul>
                    )}
                </div>, { autoClose: 10000 }
            );
            fetchData(); // Refresh dashboard untuk update nilai buku
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsDepreciating(false);
        }
    };

    const assetsWithNotifications = useMemo(() => {
        if (!data) return [];
        return data.assets.filter(asset => asset.notification);
    }, [data]);

    const filteredAssets = useMemo(() => {
        if (!selectedDate || !data) return [];
        return data.assets.filter(asset =>
            asset.purchaseDate && isSameDay(new Date(asset.purchaseDate), selectedDate)
        );
    }, [data, selectedDate]);
  
    const barChartData = useMemo(() => {
        if (!data || data.assets.length === 0) return { labels: [], datasets: [] };
        const monthlyData: { [key: string]: { totalValue: number; bookValue: number; depreciation: number; } } = {};
        data.assets.forEach(asset => {
            const monthYear = format(new Date(asset.purchaseDate), 'MMM yyyy', { locale: id });
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { totalValue: 0, bookValue: 0, depreciation: 0 };
            }
            monthlyData[monthYear].totalValue += asset.price;
            monthlyData[monthYear].bookValue += asset.currentValue;
            monthlyData[monthYear].depreciation += asset.accumulatedDepreciation;
        });
        const labels = Object.keys(monthlyData);
        const totalValues = labels.map(label => monthlyData[label].totalValue);
        const bookValues = labels.map(label => monthlyData[label].bookValue);
        const depreciationValues = labels.map(label => monthlyData[label].depreciation);
        return { labels, totalValues, bookValues, depreciationValues };
    }, [data]);
  
    if (isLoading) return <div className="text-center p-8">Memuat data dashboard...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>;
    if (!data) return <div className="text-center p-8">Tidak ada data untuk ditampilkan.</div>;

    const { summary, assets } = data;
    const totalAssets = assets.length;
    const activeAssetsCount = assets.filter(asset => asset.status === 'BAIK').length;
    const inactiveAssetsCount = totalAssets - activeAssetsCount;
  
    const barChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' as const } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (value: any) => formatRupiah(value) } } } };
    const barChartOptionsSingle = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (value: any) => formatRupiah(value) } } } };
    const totalValueChartData = { labels: barChartData.labels, datasets: [ { label: 'Akumulasi Nilai Aset', data: barChartData.totalValues, backgroundColor: '#3b82f6' } ] };
    const stackedBarChartData = { labels: barChartData.labels, datasets: [ { label: 'Nilai Buku', data: barChartData.bookValues, backgroundColor: '#d31f43ff' }, { label: 'Akumulasi Penyusutan', data: barChartData.depreciationValues, backgroundColor: '#e98316ff' }, ] };
    const donutDataAktif = { chartData: { labels: ['Aktif', 'Tidak Aktif'], datasets: [{ data: [activeAssetsCount, inactiveAssetsCount], backgroundColor: ['#34d399', '#f87171'], borderColor: ['#ffffff'], borderWidth: 2, }] }, centerText: totalAssets.toString(), centerSubtext: 'Total Aset' };
    const donutDataNilai = { chartData: { labels: ['Penyusutan', 'Nilai Buku'], datasets: [{ data: [summary.totalDepreciation, summary.totalCurrentValue], backgroundColor: ['#fdba74', '#60a5fa'], borderColor: ['#ffffff'], borderWidth: 2, }] }, centerText: `${summary.totalInitialValue > 0 ? ((summary.totalCurrentValue / summary.totalInitialValue) * 100).toFixed(0) : '0'}%`, centerSubtext: 'dari Nilai Awal' };

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={false} />
            <DepreciationModal 
                isOpen={isDepreciationModalOpen}
                onClose={() => setIsDepreciationModalOpen(false)}
                onConfirm={handleRunDepreciation}
                targetPeriod={targetPeriod}
            />
            
            <div className="bg-white p-4 rounded-lg shadow-md flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Tindakan Akuntansi Aset</h2>
                <button 
                    onClick={() => setIsDepreciationModalOpen(true)} 
                    disabled={isDepreciating}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {isDepreciating ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Jalankan Penyusutan Akhir Bulan'}
                </button>
            </div>

            <NotificationWidget assets={assetsWithNotifications} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DonutChartCard title="Status Aset" data={donutDataAktif} summaryText={<><div className="flex items-center gap-2 font-medium"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Aset Aktif: {activeAssetsCount}</div><div className="flex items-center gap-2 font-medium"><div className="w-3 h-3 rounded-full bg-red-400"></div> Aset Tidak Aktif: {inactiveAssetsCount}</div><p className="pt-2 text-gray-500 text-xs">Tidak aktif mencakup status 'Rusak', 'Perbaikan', dll.</p></>} />
                <DonutChartCard title="Ringkasan Nilai Aset" data={donutDataNilai} summaryText={<><p>Nilai Awal: <span className="font-semibold">{formatRupiah(summary.totalInitialValue)}</span></p><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Nilai Buku: <span className="font-semibold">{formatRupiah(summary.totalCurrentValue)}</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-300"></div> Penyusutan: <span className="font-semibold">{formatRupiah(summary.totalDepreciation)}</span></div></>} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Akumulasi Nilai Aset per Bulan</h3>
                    <div className="h-80 relative">
                        <Bar data={totalValueChartData} options={barChartOptionsSingle} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Nilai Buku vs Penyusutan per Bulan</h3>
                    <div className="h-80 relative">
                        <Bar data={stackedBarChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
                <CalendarCard assets={assets} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                <div className="space-y-6">
                    <JournalCard assets={filteredAssets} selectedDate={selectedDate} />
                    <JurnalTerakhir />
                </div>
            </div>
        </div>
    );
}

