// File: app/(dashboard)/(modulepages)/dashboardSimKlinik/[branchId]/dashboard/page.tsx
// Versi perbaikan dengan UI modern, responsif, akses cepat, dan tanpa dependensi Next.js/lucide-react

'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { 
    ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar 
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// --- Tipe Data ---
interface RecentActivity {
    id: number;
    patientName: string;
    invoiceNumber: string;
    amount: string;
    time: Date;
}
interface WeeklyRevenue {
    date: string;
    total: number;
}
interface DashboardStats {
  totalPatients: number;
  todaysAppointments: number;
  todaysRevenue: string;
  pendingLabOrders: number;
  recentActivities: RecentActivity[];
  weeklyRevenue: WeeklyRevenue[];
}

// --- Icons (Inline SVG) ---
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const LabIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M18.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M6.38 2.5A2.5 2.5 0 0 1 8.5 2h7a2.5 2.5 0 0 1 2.12 3.88L13 15v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-5L4.38 5.88A2.5 2.5 0 0 1 6.38 2.5Z"/><path d="M10 8h4"/></svg>;
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
const BarChart3Icon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const PillIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>;
const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 18H3c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2h-2"/><path d="M7 18V8.12a2 2 0 0 1 .62-1.42l1.62-1.62A2 2 0 0 1 10.66 4h2.68a2 2 0 0 1 1.42.62l1.62 1.62a2 2 0 0 1 .62 1.42V18"/><path d="M8 18h8"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="2"/></svg>;
const ClipboardCheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>;
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;


// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(Number(value));
};

// --- Komponen UI ---

const StatCard = ({ icon, title, value, color, isLoading }: { icon: React.ReactNode; title: string; value: string | number; color: string; isLoading: boolean; }) => (
    <div className={`p-5 rounded-xl shadow-sm flex items-center gap-4 bg-white border ${color}`}>
        <div className="flex-shrink-0">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
                <div className="w-24 h-7 mt-1 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            )}
        </div>
    </div>
);

const QuickLink = ({ title, href, icon }: { title: string, href: string, icon: React.ReactNode }) => (
    <a href={href} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-lg hover:scale-105 hover:border-blue-500 cursor-pointer text-center no-underline flex flex-col items-center justify-center gap-2">
        <div className="text-blue-500">{icon}</div>
        <span className="font-semibold text-xs text-gray-700">{title}</span>
    </a>
);

const WeeklyRevenueChart = ({ data, isLoading }: { data: WeeklyRevenue[], isLoading: boolean }) => {
    const yAxisFormatter = (value: number) => {
        if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)} Jt`;
        if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)} Rb`;
        return `Rp ${value}`;
    };

    if (isLoading) {
        return <div className="bg-white p-6 rounded-xl shadow-sm border h-96 flex items-center justify-center animate-pulse"><div className="w-full h-80 bg-gray-200 rounded-md"></div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border h-96">
            <h3 className="font-semibold text-gray-700 mb-4">Pendapatan 7 Hari Terakhir</h3>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={yAxisFormatter} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Pendapatan']} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{top: -4, right: 0}} />
                    <Bar dataKey="total" name="Pendapatan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const RecentActivityTable = ({ data, isLoading }: { data: RecentActivity[], isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border h-96 animate-pulse">
                <div className="h-6 w-1/2 bg-gray-200 rounded-md mb-4"></div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <div className="h-5 w-1/3 bg-gray-200 rounded-md"></div>
                            <div className="h-5 w-1/4 bg-gray-200 rounded-md"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border h-96 flex flex-col">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><HistoryIcon className="w-5 h-5"/>Aktivitas Pembayaran Terkini</h3>
            <div className="flex-grow overflow-y-auto pr-2">
                {data.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">Belum ada aktivitas pembayaran.</p>
                ) : (
                    data.map(activity => (
                        <div key={activity.id} className="flex justify-between items-center text-sm border-b py-2 last:border-b-0">
                            <div>
                                <p className="font-semibold text-gray-800">{activity.patientName}</p>
                                <p className="text-xs text-gray-500">{activity.invoiceNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(activity.amount)}</p>
                                <p className="text-xs text-gray-500" title={format(new Date(activity.time), 'Pp', { locale: idLocale })}>
                                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: idLocale })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- Halaman Utama Dashboard ---
export default function BranchPerformanceDashboardPage() {
    const [branchId, setBranchId] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        // URL: /.../[branchId]/dashboard -> dashboard is last, branchId is second to last
        const id = pathParts[pathParts.length - 2];
        if (id) setBranchId(id);
    }, []);

    const fetchStats = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const res = await fetch(`/api/v1/clinic/dashboard-stats?branchId=${branchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memuat data dashboard'); }
            const data: DashboardStats = await res.json();
            setStats(data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (branchId) { fetchStats(); }
    }, [branchId, fetchStats]);

    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <BarChart3Icon className="w-8 h-8 text-blue-500" /> Kinerja Cabang
                        </h1>
                        <div className="flex items-center gap-4">
                            <button onClick={fetchStats} disabled={isLoading} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-medium transition-colors">
                                <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Memuat...' : 'Refresh'}
                            </button>
                            <a href={`/dashboardSimKlinik/${branchId}`} className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors no-underline text-gray-700">
                                <ArrowLeftIcon className="w-4 h-4" />
                                Kembali
                            </a>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center gap-3">
                            <AlertTriangleIcon className="w-6 h-6"/>
                            <div><p className="font-bold">Terjadi Kesalahan</p><p>{error}</p></div>
                        </div>
                    )}
                    
                    {/* Akses Cepat */}
                    <div>
                         <h2 className="text-lg font-semibold text-gray-700 mb-3">Akses Cepat</h2>
                         <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            <QuickLink title="Antrean & Jadwal" href={`/dashboardSimKlinik/${branchId}/appointments`} icon={<CalendarIcon className="w-7 h-7" />} />
                            <QuickLink title="Kasir & Pembayaran" href={`/dashboardSimKlinik/${branchId}/cashier`} icon={<DollarSignIcon className="w-7 h-7" />} />
                            <QuickLink title="Stock Obat" href={`/dashboardSimKlinik/master-data/drug-stock`} icon={<PillIcon className="w-7 h-7" />} />
                            <QuickLink title="Pembelian Stok" href={`/dashboardSimKlinik/${branchId}/purchases`} icon={<TruckIcon className="w-7 h-7" />} />
                            <QuickLink title="Meja Kerja Lab" href={`/dashboardSimKlinik/${branchId}/lab`} icon={<LabIcon className="w-7 h-7" />} />
                            <QuickLink title="Validasi Hasil Lab" href={`/dashboardSimKlinik/${branchId}/lab/validation`} icon={<ClipboardCheckIcon className="w-7 h-7" />} />
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<UsersIcon className="w-8 h-8 text-blue-500" />} title="Total Pasien" value={stats?.totalPatients ?? 0} color="border-l-4 border-blue-500" isLoading={isLoading} />
                        <StatCard icon={<CalendarIcon className="w-8 h-8 text-indigo-500" />} title="Kunjungan Hari Ini" value={stats?.todaysAppointments ?? 0} color="border-l-4 border-indigo-500" isLoading={isLoading} />
                        <StatCard icon={<DollarSignIcon className="w-8 h-8 text-green-500" />} title="Pendapatan Hari Ini" value={formatCurrency(stats?.todaysRevenue ?? '0')} color="border-l-4 border-green-500" isLoading={isLoading} />
                        <StatCard icon={<LabIcon className="w-8 h-8 text-orange-500" />} title="Order Lab Pending" value={stats?.pendingLabOrders ?? 0} color="border-l-4 border-orange-500" isLoading={isLoading} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3">
                            <WeeklyRevenueChart data={stats?.weeklyRevenue || []} isLoading={isLoading} />
                        </div>
                        <div className="lg:col-span-2">
                            <RecentActivityTable data={stats?.recentActivities || []} isLoading={isLoading} />
                        </div>
                    </div>
                </main>
            </div>
        </Fragment>
    );
}
