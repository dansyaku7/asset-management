'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useParams } from 'next/navigation'; // Wajib untuk App Router

// --- Types ---
interface Branch {
    id: string | number;
    name: string;
    // tambahkan properti lain jika perlu
}

// --- Icons Components ---
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const PillIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>;
const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const LabIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M18.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M6.38 2.5A2.5 2.5 0 0 1 8.5 2h7a2.5 2.5 0 0 1 2.12 3.88L13 15v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-5L4.38 5.88A2.5 2.5 0 0 1 6.38 2.5Z"/><path d="M10 8h4"/></svg>;
const ClipboardCheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>;
const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 18H3c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2h-2"/><path d="M7 18V8.12a2 2 0 0 1 .62-1.42l1.62-1.62A2 2 0 0 1 10.66 4h2.68a2 2 0 0 1 1.42.62l1.62 1.62a2 2 0 0 1 .62 1.42V18"/><path d="M8 18h8"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="2"/></svg>;
const LayoutGridIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>;
const HandIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 18h-2.29a2 2 0 0 0-1.95 1.52L12.5 22V9.5a2.5 2.5 0 0 0-5 0V18"/><path d="M5 18h2.29a2 2 0 0 1 1.95 1.52L10.5 22V9.5a2.5 2.5 0 0 1 5 0V18"/><path d="M2 14h20"/><path d="M2 18h2.29a2 2 0 0 0 1.95-1.52L7.5 14"/></svg>;

// --- UI Components ---
const StatCard = ({ title, value, icon, color, isLoading }: { title: string, value: string, icon: React.ReactNode, color: string, isLoading?: boolean }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${colorClasses[color] || colorClasses.blue}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    {isLoading ? (
                        <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-2xl font-bold text-gray-800">{value}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuickLink = ({ title, href, icon }: { title: string, href: string, icon: React.ReactNode }) => (
    <a href={href} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-lg hover:scale-105 hover:border-blue-500 cursor-pointer text-center no-underline flex flex-col items-center justify-center">
        <div className="mx-auto w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full mb-2">
            {icon}
        </div>
        <span className="font-semibold text-sm text-gray-700">{title}</span>
    </a>
);

const WelcomeBanner = ({ branchName }: { branchName: string }) => (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
        <h2 className="text-2xl font-bold">Selamat Datang di Cabang {branchName}</h2>
        <HandIcon className="w-12 h-12 text-yellow-300 opacity-80 hidden md:block" />
    </div>
);

const DashboardSkeleton = () => (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 animate-pulse">
        <main className="max-w-7xl mx-auto space-y-8">
             <div className="h-24 bg-gray-200 rounded-xl"></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="h-24 bg-gray-200 rounded-xl"></div>
                <div className="h-24 bg-gray-200 rounded-xl"></div>
            </div>
            <div>
                <div className="h-8 w-1/4 bg-gray-200 rounded-lg mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {Array.from({length:7}).map((_,i) => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
                </div>
            </div>
        </main>
    </div>
);


export default function BranchDashboardPage() {
    // 1. GUNAKAN USEPARAMS (Fix Utama)
    const params = useParams();
    // Pastikan ID diambil dengan aman (handle jika array)
    const branchId = Array.isArray(params.branchId) ? params.branchId[0] : params.branchId;

    const [branch, setBranch] = useState<Branch | null>(null);
    const [stats, setStats] = useState({ patientCount: 0, visitsToday: 0 });
    const [isLoading, setIsLoading] = useState(true);
    
    // Inject Toastify CSS jika belum ada
    useEffect(() => {
        const styleId = 'react-toastify-css';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/react-toastify@9.1.3/dist/ReactToastify.min.css';
            document.head.appendChild(link);
        }
    }, []);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        if (!branchId) return; // Tunggu sampai branchId tersedia dari params

        setIsLoading(true);
        const token = getToken();
        if (!token) {
            toast.error("Sesi tidak valid atau Anda belum login.");
            setIsLoading(false);
            return;
        }
        
        try {
            // Load data cabang dan statistik secara paralel
            const [branchRes, statsRes] = await Promise.all([
                fetch('/api/v1/management/branches', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/v1/clinic/dashboard-stats/${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!branchRes.ok) throw new Error(`Gagal memuat cabang (Status: ${branchRes.status})`);
            
            // Handle stats error terpisah agar tidak memblokir UI utama
            if (!statsRes.ok) console.warn("Gagal memuat statistik dashboard.");

            const branches: Branch[] = await branchRes.json();
            
            // 2. LOGIC PENCARIAN YANG KUAT (Fix Kedua)
            // Konversi ke String agar aman (misal DB number vs URL string)
            const currentBranch = branches.find(b => String(b.id) === String(branchId));
            
            if (!currentBranch) throw new Error(`Cabang dengan ID ${branchId} tidak ditemukan.`);
            
            setBranch(currentBranch);
            
            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
            
        } catch (error: any) {
            console.error("Dashboard Error:", error);
            toast.error(error.message || "Gagal memuat data.");
        } finally {
            setIsLoading(false);
        }
    }, [branchId]); 

    useEffect(() => {
        if (branchId) {
            fetchData();
        } else {
            setIsLoading(false);
        }
    }, [branchId, fetchData]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (!branch) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 flex-col gap-4">
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="text-red-500 mb-2">
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Cabang Tidak Ditemukan</h2>
                    <p className="text-gray-500 mt-2">ID Cabang: <span className="font-mono bg-gray-100 px-1 rounded">{branchId || 'Tidak diketahui'}</span></p>
                    <a href="/dashboardSimKlinik" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors no-underline">
                        Kembali ke Dashboard Utama
                    </a>
                </div>
            </div>
        );
    }

    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-8">
                    {/* Welcome Banner */}
                    <WelcomeBanner branchName={branch.name} />

                    {/* Statistik Utama */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StatCard 
                            title="Total Pasien Terdaftar" 
                            value={stats.patientCount.toString()} 
                            icon={<UsersIcon />}
                            color="blue"
                            isLoading={isLoading}
                        />
                        <StatCard 
                            title="Kunjungan Hari Ini" 
                            value={stats.visitsToday.toString()} 
                            icon={<ClipboardListIcon />} 
                            color="green"
                            isLoading={isLoading}
                        />
                    </div>
                    
                    {/* Aksi Cepat / Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                             <LayoutGridIcon className="w-5 h-5"/> Menu Cabang
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                             <QuickLink title="Dashboard" href={`/dashboardSimKlinik/${branchId}/dashboard`} icon={<LayoutGridIcon />} />
                             <QuickLink title="Antrean" href={`/dashboardSimKlinik/${branchId}/appointments`} icon={<CalendarIcon />} />
                             <QuickLink title="Kasir" href={`/dashboardSimKlinik/${branchId}/cashier`} icon={<DollarSignIcon />} />
                             <QuickLink title="Stok Obat" href={`/dashboardSimKlinik/master-data/drug-stock`} icon={<PillIcon />} />
                             <QuickLink title="Beli Obat" href={`/dashboardSimKlinik/${branchId}/purchases`} icon={<TruckIcon />} />
                             <QuickLink title="Lab" href={`/dashboardSimKlinik/${branchId}/lab`} icon={<LabIcon />} />
                             <QuickLink title="Validasi Lab" href={`/dashboardSimKlinik/${branchId}/lab/validation`} icon={<ClipboardCheckIcon />} />
                        </div>
                    </div>

                </main>
            </div>
        </Fragment>
    );
}