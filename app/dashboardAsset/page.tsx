"use client";
import React, { useState, useEffect, useMemo } from "react";
import type { Asset, User, Location } from "@prisma/client";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

import JurnalTerakhir from "./components/JurnalTerakhir";
import NotificationWidget from "./components/NotificationWidget";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

type AssetWithDetails = Asset & {
  pic: User | null;
  location: Location;
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

const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
const DonutChartCard = ({ title, data, summaryText }: { title: string; data: any; summaryText: React.ReactNode; }) => ( <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3><div className="flex flex-col md:flex-row items-center gap-6"><div className="w-32 h-32"><svg className="w-full h-full" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}><circle cx="18" cy="18" r="15.915" fill="#fff" /><circle cx="18" cy="18" r="15.915" fill="none" stroke="#e6e6e6" strokeWidth="3" /><circle cx="18" cy="18" r="15.915" fill="none" stroke={data.color1 || "#fdba74"} strokeWidth="3" strokeDasharray={`${data.percent1}, 100`} /><circle cx="18" cy="18" r="15.915" fill="none" stroke={data.color2 || "#60a5fa"} strokeWidth="3" strokeDasharray={`${data.percent2}, 100`} strokeDashoffset={`-${data.percent1}`} /></svg></div><div className="text-sm text-gray-600 space-y-2">{summaryText}</div></div></div> );
const LineChartCard = ({ data, options }: { data: any, options: any }) => ( <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold text-gray-800 mb-4">Pertumbuhan Nilai Aset vs. Akumulasi Penyusutan</h3><div className="h-64 relative"><Line data={data} options={options} /></div></div> );
const CalendarCard = ({ assets, selectedDate, onSelectDate }: { assets: AssetWithDetails[], selectedDate?: Date, onSelectDate: (date?: Date) => void }) => ( <div className="bg-white p-6 rounded-lg shadow-md h-full"><h3 className="text-lg font-bold text-gray-800 mb-4">Kalender Aset</h3><div className="flex justify-center"><DayPicker mode="single" selected={selectedDate} onSelect={onSelectDate} locale={id} modifiers={{ purchased: assets.map(a => a.purchaseDate ? new Date(a.purchaseDate) : null).filter((d): d is Date => d !== null) }} modifiersStyles={{ purchased: { fontWeight: 'bold', color: '#01449D' } }} /></div></div> );
const JournalCard = ({ assets, selectedDate }: { assets: AssetWithDetails[], selectedDate?: Date }) => ( <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold text-gray-800 mb-4">Jurnal {selectedDate ? format(selectedDate, 'd MMM yyyy', { locale: id }) : 'Terakhir'}</h3><div className="space-y-4 max-h-60 overflow-y-auto pr-2">{assets.length > 0 ? ( assets.map(asset => ( <div key={asset.id} className="border-b pb-2"><p className="font-bold text-[#01449D]">{asset.productName.toUpperCase()}</p><p className="text-sm text-gray-500">Tgl Beli: {new Date(asset.purchaseDate).toLocaleDateString("id-ID")}</p><p className="text-sm text-gray-500">Harga: {formatRupiah(asset.price)}</p><p className="text-sm text-gray-500">Lokasi: {asset.location.name}</p></div> )) ) : (<p className="text-sm text-gray-500 text-center pt-8">Tidak ada pembelian pada tanggal ini.</p>)}</div></div> );


export default function AssetDashboardPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/assets");
        if (!response.ok) throw new Error("Gagal memuat data aset");
        const apiData: ApiResponse = await response.json();
        setData(apiData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
  
  const lineChartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const sortedAssets = [...data.assets].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
    const labels: string[] = []; const assetValues: number[] = []; const depreciationValues: number[] = [];
    let cumulativeAssetValue = 0; let cumulativeDepreciation = 0;
    sortedAssets.forEach(asset => {
        const monthYear = format(new Date(asset.purchaseDate), 'MMM yyyy', { locale: id });
        cumulativeAssetValue += asset.price;
        cumulativeDepreciation += asset.accumulatedDepreciation;
        const lastLabel = labels[labels.length - 1];
        if (lastLabel === monthYear) {
            assetValues[assetValues.length - 1] = cumulativeAssetValue;
            depreciationValues[depreciationValues.length - 1] = cumulativeDepreciation;
        } else {
            labels.push(monthYear);
            assetValues.push(cumulativeAssetValue);
            depreciationValues.push(cumulativeDepreciation);
        }
    });
    return {
        labels, datasets: [
            { label: 'Akumulasi Nilai Aset', data: assetValues, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3, },
            { label: 'Akumulasi Penyusutan', data: depreciationValues, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3, }
        ]
    }
  }, [data]);
  
  if (isLoading) return <div className="text-center p-8">Loading data...</div>;
  if (error) return <div className="text-center p-8 text-red-600">Error: {error}</div>;
  if (!data) return <div className="text-center p-8">Tidak ada data.</div>;

  const { summary, assets } = data;
  const totalAssets = assets.length;
  const activeAssetsCount = assets.filter(asset => asset.status === 'BAIK').length;
  const inactiveAssetsCount = totalAssets - activeAssetsCount;
  const percentActive = totalAssets > 0 ? (activeAssetsCount / totalAssets) * 100 : 0;
  const percentInactive = totalAssets > 0 ? (inactiveAssetsCount / totalAssets) * 100 : 0;
  const percentCurrent = summary.totalInitialValue > 0 ? (summary.totalCurrentValue / summary.totalInitialValue) * 100 : 0;
  const percentDepreciation = summary.totalInitialValue > 0 ? (summary.totalDepreciation / summary.totalInitialValue) * 100 : 0;
  
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
        legend: { 
            display: true, 
            position: 'top' as const,
        } 
    },
    scales: { y: { ticks: { callback: (value: any) => formatRupiah(value) } } }
  };

  return (
    <div className="space-y-6">
      <NotificationWidget assets={assetsWithNotifications} />
    
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChartCard
          title="Aset Aktif"
          data={{ percent1: percentActive, percent2: percentInactive, color1: '#34d399', color2: '#f87171' }}
          summaryText={
            <>
              <div className="flex items-center gap-2 font-medium"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Aset Aktif = {activeAssetsCount} ({percentActive.toFixed(1)}%)</div>
              <div className="flex items-center gap-2 font-medium"><div className="w-3 h-3 rounded-full bg-red-400"></div> Aset Tidak Aktif = {inactiveAssetsCount} ({percentInactive.toFixed(1)}%)</div>
              <p className="pt-2 text-gray-500">Aset tidak aktif mencakup status 'Rusak' dan 'Perbaikan'.</p>
            </>
          }
        />
        <DonutChartCard
          title="Nilai Aset"
          data={{ percent1: percentDepreciation, percent2: percentCurrent, color1: '#fdba74', color2: '#60a5fa' }}
          summaryText={
            <>
              <p>Nilai Awal: {formatRupiah(summary.totalInitialValue)}</p>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Nilai Buku: {formatRupiah(summary.totalCurrentValue)}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div> Penyusutan: {formatRupiah(summary.totalDepreciation)}</div>
            </>
          }
        />
      </div>
      
      <LineChartCard data={lineChartData} options={lineChartOptions} />

      {/* --- PERUBAHAN DI SINI --- */}
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

