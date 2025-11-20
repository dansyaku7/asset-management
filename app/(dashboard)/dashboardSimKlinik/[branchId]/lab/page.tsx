// File: app/(dashboard)/(modulepages)/dashboardSimKlinik/[branchId]/lab/page.tsx
// Versi perbaikan dengan UI modern, responsif, skeleton loading, dan tanpa dependensi Next.js

"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// --- Tipe Data ---
type LabOrderStatus = 'ORDERED' | 'IN_PROGRESS' | 'PENDING_VALIDATION' | 'COMPLETED' | 'CANCELLED';

type LabOrderWithDetails = {
    id: number;
    orderDate: string;
    status: LabOrderStatus;
    labService: { name: string };
    medicalRecord: {
        id: number;
        patient: {
            fullName: string;
            medicalRecordNo: string;
        };
    };
};

// --- Icons (Inline SVG) ---
const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M18.5 22a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1Z"/><path d="M6.38 2.5A2.5 2.5 0 0 1 8.5 2h7a2.5 2.5 0 0 1 2.12 3.88L13 15v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-5L4.38 5.88A2.5 2.5 0 0 1 6.38 2.5Z"/><path d="M10 8h4"/></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const FilePenLineIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2Z"/><path d="M8 18h1"/><path d="M18.4 9.6a2 2 0 1 1 3 3L17 17l-4 1 1-4Z"/></svg>;
const Loader2Icon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- Komponen ---
const StatusBadge = ({ status }: { status: LabOrderStatus }) => {
    const statusMap: { [key in LabOrderStatus]: { text: string, icon: React.ReactNode, color: string } } = {
        ORDERED: { text: 'Menunggu Input', icon: <ClockIcon className="w-3 h-3"/>, color: 'bg-yellow-100 text-yellow-800' },
        IN_PROGRESS: { text: 'In Progress', icon: <BeakerIcon className="w-3 h-3"/>, color: 'bg-blue-100 text-blue-800' },
        PENDING_VALIDATION: { text: 'Validasi', icon: <FilePenLineIcon className="w-3 h-3"/>, color: 'bg-orange-100 text-orange-800' },
        COMPLETED: { text: 'Selesai', icon: <CheckCircleIcon className="w-3 h-3"/>, color: 'bg-green-100 text-green-800' },
        CANCELLED: { text: 'Dibatalkan', icon: <ClockIcon className="w-3 h-3"/>, color: 'bg-red-100 text-red-800' },
    };
    const currentStatus = statusMap[status] || { text: status, icon: <ClockIcon className="w-3 h-3"/>, color: 'bg-gray-100 text-gray-800' };

    return <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${currentStatus.color}`}>{currentStatus.icon} {currentStatus.text}</span>;
};

export default function LabWorkdeskPage() {
    const [branchId, setBranchId] = useState<string | null>(null);
    const [orders, setOrders] = useState<LabOrderWithDetails[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<LabOrderStatus | 'all'>('ORDERED');

    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 2];
        if (id) setBranchId(id);
    }, []);
    
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!branchId) { toast.error("ID Cabang tidak ditemukan."); setIsLoading(false); return; }

        try {
            const res = await fetch(`/api/v1/clinic/lab-orders?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal mengambil data order lab');
            setOrders(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if(branchId) fetchOrders();
    }, [fetchOrders, branchId]);

    const filteredOrders = orders
        .filter(order => {
            const patient = order.medicalRecord.patient;
            const matchesSearch = patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || patient.medicalRecordNo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    const handleNavigate = (orderId: number) => {
        window.location.href = `/dashboardSimKlinik/${branchId}/lab/${orderId}`;
    };

    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <BeakerIcon className="w-8 h-8 text-blue-500" /> Meja Kerja Lab
                        </h1>
                        <a href={`/dashboardSimKlinik/${branchId}/dashboard`} className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors no-underline text-gray-700 self-start sm:self-center">
                            <ArrowLeftIcon className="w-4 h-4" />
                            Kembali
                        </a>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border space-y-4">
                        <h2 className="text-xl font-semibold text-gray-700">Daftar Order Lab</h2>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                            <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari Pasien / No. MR"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                />
                            </div>
                            
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => setStatusFilter('ORDERED')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${statusFilter === 'ORDERED' ? 'bg-yellow-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    Menunggu Input ({orders.filter(o => o.status === 'ORDERED').length})
                                </button>
                                <button onClick={() => setStatusFilter('PENDING_VALIDATION')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${statusFilter === 'PENDING_VALIDATION' ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    Validasi ({orders.filter(o => o.status === 'PENDING_VALIDATION').length})
                                </button>
                                <button onClick={() => setStatusFilter('COMPLETED')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${statusFilter === 'COMPLETED' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    Selesai ({orders.filter(o => o.status === 'COMPLETED').length})
                                </button>
                                <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${statusFilter === 'all' ? 'bg-gray-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    Semua
                                </button>
                            </div>
                        </div>

                        {/* Tampilan Mobile & Tablet (Card) */}
                        <div className="md:hidden space-y-3">
                             {isLoading ? (
                                <p className="text-center py-10"><Loader2Icon className="w-8 h-8 animate-spin inline-block text-blue-500"/></p>
                             ) : filteredOrders.length === 0 ? (
                                <p className="text-center py-10 text-sm text-gray-500">Tidak ada order Lab yang sesuai kriteria.</p>
                             ) : (
                                filteredOrders.map(order => (
                                    <div key={order.id} className="p-4 rounded-lg border bg-slate-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-blue-700">{order.medicalRecord.patient.fullName}</p>
                                                <p className="text-xs text-gray-500">RM: {order.medicalRecord.patient.medicalRecordNo} / Order #{order.id}</p>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <div className="mt-2 pt-2 border-t">
                                            <p className="font-semibold text-gray-800">{order.labService.name}</p>
                                            <p className="text-xs text-gray-500">{format(new Date(order.orderDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                                        </div>
                                        <div className="mt-3">
                                            <button onClick={() => handleNavigate(order.id)} className={`w-full flex items-center justify-center text-white py-2 px-4 rounded-lg text-sm font-bold ${order.status === 'ORDERED' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
                                                {order.status === 'ORDERED' ? <><BeakerIcon className="w-4 h-4 mr-2"/> Input Hasil</> : 'Lihat Detail'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                        
                        {/* Tampilan Desktop (Tabel) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pasien (No. MR)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Layanan Lab</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Order</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2Icon className="w-8 h-8 animate-spin inline-block text-blue-500"/></td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Tidak ada order Lab yang sesuai kriteria.</td></tr>
                                    ) : (
                                        filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {order.medicalRecord.patient.fullName} <br/> <span className="text-xs text-gray-500">({order.medicalRecord.patient.medicalRecordNo})</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">{order.labService.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(order.orderDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center"><StatusBadge status={order.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                     <button onClick={() => handleNavigate(order.id)} className={`flex items-center justify-center py-2 px-4 rounded-lg text-sm font-bold w-32 mx-auto ${order.status === 'ORDERED' ? 'text-white bg-orange-500 hover:bg-orange-600' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>
                                                        {order.status === 'ORDERED' ? <><BeakerIcon className="w-4 h-4 mr-2"/> Input Hasil</> : 'Lihat Detail'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </Fragment>
    );
}
