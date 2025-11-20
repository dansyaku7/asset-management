// File: app/(dashboard)/(modulepages)/dashboardSimKlinik/[branchId]/lab/validation/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LabOrder, LabService, MedicalRecord, Patient, LabOrderStatus } from '@prisma/client';
import { ArrowLeftIcon, SearchIcon, Beaker, CheckCircle, Clock, FilePenLine, Loader2, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// --- Tipe Data dari API ---
type LabOrderWithDetails = LabOrder & {
  labService: LabService;
  medicalRecord: {
    id: number;
    patient: Patient;
  };
};

// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// --- Komponen Badge Status ---
const StatusBadge = ({ status }: { status: LabOrderStatus }) => {
  const statusMap = {
    ORDERED: { text: 'Menunggu Input', icon: <Clock size={12} />, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    IN_PROGRESS: { text: 'In Progress', icon: <Beaker size={12} />, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    PENDING_VALIDATION: { text: 'Menunggu Validasi', icon: <FilePenLine size={12} />, color: 'bg-orange-100 text-orange-800 border-orange-300' },
    COMPLETED: { text: 'Selesai', icon: <CheckCircle size={12} />, color: 'bg-green-100 text-green-800 border-green-300' },
    CANCELLED: { text: 'Dibatalkan', icon: <Clock size={12} />, color: 'bg-red-100 text-red-800 border-red-300' },
  };
  const currentStatus = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800 border-gray-300' };

  return (
    <span className={`px-2 py-0.5 inline-flex items-center gap-1.5 text-xs leading-5 font-medium rounded-full border ${currentStatus.color}`}>
      {currentStatus.icon} {currentStatus.text}
    </span>
  );
};

// --- Komponen Item Order untuk Mobile (Responsif) ---
const OrderCard = ({ order, handleNavigate }: { order: LabOrderWithDetails, handleNavigate: (id: number) => void }) => {
  const patient = order.medicalRecord.patient;
  const isPending = order.status === 'PENDING_VALIDATION';
  const actionText = isPending ? 'Validasi Hasil' : 'Lihat Hasil';
  const actionClass = isPending 
    ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
    : "bg-gray-200 hover:bg-gray-300 text-gray-700";

  return (
    <div 
      className="p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow bg-white cursor-pointer"
      onClick={() => handleNavigate(order.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <p className="text-xs font-medium text-gray-500">No. Order | Kunjungan</p>
          <p className="text-base font-bold text-blue-600">{order.id} | #{order.medicalRecord.id}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="border-t border-gray-100 pt-2 space-y-1">
        <p className="text-sm font-semibold text-gray-800">{patient.fullName}</p>
        <p className="text-xs text-gray-500">No. MR: {patient.medicalRecordNo}</p>
        <p className="text-sm text-gray-700 mt-2">
            Layanan: <span className="font-medium">{order.labService.name}</span>
        </p>
      </div>
      
      <div className="flex justify-between items-end mt-4">
        <p className="text-xs text-gray-500">
          {format(new Date(order.orderDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
        </p>
        <button
          className={`px-3 py-1.5 flex items-center gap-1 text-xs rounded-lg font-bold transition-all ${actionClass}`}
          onClick={(e) => { e.stopPropagation(); handleNavigate(order.id); }}
        >
          {isPending ? <FilePenLine className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
          {actionText}
        </button>
      </div>
    </div>
  );
};

// --- Komponen Skeleton Loader ---
const TableSkeleton = () => (
  <tr className="animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

export default function LabValidationPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.branchId as string;

  const [orders, setOrders] = useState<LabOrderWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Default filter langsung ke PENDING_VALIDATION
  const [statusFilter, setStatusFilter] = useState<LabOrderStatus | 'all'>('PENDING_VALIDATION');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const token = getToken();
    if (!branchId || !token) {
      if (!branchId) toast.error("ID Cabang tidak ditemukan.");
      if (!token) toast.error("Token otorisasi tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/clinic/lab-orders/validation?branchId=${branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Gagal mengambil data validasi lab');
      }
      const data = await res.json();
      setOrders(data);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      console.error("Gagal mengambil data lab orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Menggunakan useMemo untuk filtering dan sorting agar lebih efisien
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const patient = order.medicalRecord.patient;
        const matchesSearch = patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              patient.medicalRecordNo.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()); // Tampilkan yang paling lama dulu
  }, [orders, searchTerm, statusFilter]);
  
  // Hitung jumlah untuk tombol filter
  const countPending = orders.filter(o => o.status === 'PENDING_VALIDATION').length;
  const countCompleted = orders.filter(o => o.status === 'COMPLETED').length;
  const countAll = orders.length;

  const handleNavigate = (orderId: number) => {
    // Arahkan ke halaman detail yang SAMA (lab/id)
    router.push(`/dashboardSimKlinik/${branchId}/lab/${orderId}`);
  };

  const statusOptions: { label: string, value: LabOrderStatus | 'all', count: number, color: string }[] = [
    { label: 'Menunggu Validasi', value: 'PENDING_VALIDATION', count: countPending, color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'Selesai', value: 'COMPLETED', count: countCompleted, color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Semua', value: 'all', count: countAll, color: 'bg-gray-500 hover:bg-gray-600' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center mb-2 sm:mb-0">
          <ClipboardCheck className="w-8 h-8 mr-3 text-green-600" />
          Validasi Hasil Laboratorium
        </h1>
        <button
          onClick={() => router.push(`/dashboardSimKlinik/${branchId}/appointments`)}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali ke Antrean
        </button>
      </div>
      {/* --- */}

      {/* Konten Utama */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl space-y-6">
        <h2 className="text-xl font-semibold text-gray-700 border-b pb-3">Daftar Order Lab</h2>

        {/* Filter & Search */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:w-80">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Pasien / No. MR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors shadow-md ${
                  statusFilter === option.value 
                    ? `${option.color} text-white` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>
        {/* --- */}

        {/* Daftar Order (Mobile Card View) */}
        <div className="grid grid-cols-1 gap-4 sm:hidden">
            {isLoading ? (
                // Sederhana Mobile Skeleton
                [...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border border-gray-200 rounded-xl shadow-sm animate-pulse h-32 bg-gray-50"></div>
                ))
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                    Tidak ada order Lab **{statusFilter === 'all' ? 'sama sekali' : statusFilter === 'PENDING_VALIDATION' ? 'yang menunggu validasi' : 'yang sudah selesai'}** dengan filter yang dipilih.
                </div>
            ) : (
                filteredOrders.map(order => (
                    <OrderCard key={order.id} order={order} handleNavigate={handleNavigate} />
                ))
            )}
        </div>
        {/* --- */}

        {/* Daftar Order (Desktop Table View) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Order / Kunjungan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pasien (No. MR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Layanan Lab</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Order</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <>
                  <TableSkeleton /><TableSkeleton /><TableSkeleton />
                </>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    Tidak ada order Lab **{statusFilter === 'all' ? 'sama sekali' : statusFilter === 'PENDING_VALIDATION' ? 'yang menunggu validasi' : 'yang sudah selesai'}** dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const patient = order.medicalRecord.patient;
                  const isPending = order.status === 'PENDING_VALIDATION';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {order.id} <br/> <span className="text-xs text-gray-500 font-normal">Kunjungan #{order.medicalRecord.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.fullName} <br/> <span className="text-xs text-gray-500 font-normal">({patient.medicalRecordNo})</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                        {order.labService.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.orderDate), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleNavigate(order.id)}
                          className={`flex items-center justify-center mx-auto font-bold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-sm
                            ${isPending 
                              ? "text-white bg-green-600 hover:bg-green-700" 
                              : "text-gray-700 bg-gray-200 hover:bg-gray-300"
                            }`
                          }
                        >
                          {isPending ? <FilePenLine className="w-4 h-4 mr-2"/> : null}
                          {isPending ? 'Validasi Hasil' : 'Lihat Hasil'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {/* --- */}
      </div>
    </div>
  );
}