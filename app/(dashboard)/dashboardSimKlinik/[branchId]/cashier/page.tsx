// File: app/(dashboard)/dashboardSimKlinik/[branchId]/cashier/page.tsx
// Versi perbaikan dengan UI modern, responsif, skeleton loading, dan tanpa dependensi Next.js

'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';

// --- Tipe Data ---
// Pastikan tipe Decimal di-handle sebagai string atau number saat digunakan
type Decimal = number | string;

type InvoiceItem = {
    id: number;
    description: string;
    quantity: number;
    price: Decimal;
    total: Decimal;
};

type UnpaidInvoiceDetails = {
    id: number;
    invoiceNumber: string;
    totalAmount: Decimal;
    patient: { fullName: string; medicalRecordNo: string; };
    appointment: { appointmentDate: Date; };
    items: InvoiceItem[];
};

// --- Icons (Inline SVG) ---
const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;

// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const formatCurrency = (value: number | Decimal | undefined) => {
    if (value === undefined || value === null) return 'Rp 0';
    const numberValue = Number(value);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(numberValue);
};
const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Komponen UI ---

const PaymentDialog = ({ isOpen, onClose, onConfirmPayment, invoice }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirmPayment: (invoiceId: number, paymentMethod: string, amount: Decimal) => Promise<void>;
    invoice: UnpaidInvoiceDetails | null;
}) => {
    if (!isOpen || !invoice) return null;

    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const paymentMethods = ['Cash', 'Debit Card', 'Credit Card', 'QRIS', 'Transfer Bank', 'Insurance'];

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirmPayment(invoice.id, paymentMethod, invoice.totalAmount);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Konfirmasi Pembayaran #{invoice.invoiceNumber}</h2>
                <div className="mb-4 p-4 border rounded bg-gray-50 text-sm space-y-1">
                    <p><strong>Pasien:</strong> {invoice.patient.fullName} (RM: {invoice.patient.medicalRecordNo})</p>
                    <p><strong>Tgl Kunjungan:</strong> {formatDate(invoice.appointment?.appointmentDate)}</p>
                    <p className="font-bold text-lg mt-2 text-red-600">Total Tagihan: {formatCurrency(invoice.totalAmount)}</p>
                </div>
                <details className="mb-4 text-sm">
                    <summary className="cursor-pointer font-medium text-blue-600 hover:underline">Lihat Rincian Tagihan ({invoice.items.length} item)</summary>
                    <div className="mt-2 bg-gray-50 p-3 rounded-md border max-h-40 overflow-y-auto">
                        <ul className="space-y-1">
                            {invoice.items.map(item => (
                                <li key={item.id} className="flex justify-between">
                                    <span>{item.description} ({item.quantity}x)</span>
                                    <span>{formatCurrency(item.total)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                        {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                    <button type="button" onClick={handleConfirm} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 font-semibold">
                        {isSubmitting ? 'Memproses...' : 'Konfirmasi Bayar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
                <div className="flex justify-between items-center mb-2">
                    <div className="h-5 w-1/3 bg-gray-200 rounded"></div>
                    <div className="h-5 w-1/4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 w-1/2 bg-gray-200 rounded mt-2"></div>
                <div className="h-8 w-1/3 bg-gray-200 rounded mt-4 ml-auto"></div>
            </div>
        ))}
    </div>
);


// Halaman Utama Kasir
export default function CashierPage() {
    const [branchId, setBranchId] = useState<string | null>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoiceDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<UnpaidInvoiceDetails | null>(null);

    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 2];
        if (id) setBranchId(id);

        const styleId = 'react-toastify-css';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link'); link.id = styleId; link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/react-toastify@9.1.3/dist/ReactToastify.min.css';
            document.head.appendChild(link);
        }
    }, []);

    const fetchUnpaidInvoices = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const res = await fetch(`/api/v1/clinic/cashier/invoices?branchId=${branchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat daftar tagihan');
            setUnpaidInvoices(await res.json());
        } catch (error: any) {
            toast.error(error.message);
            setUnpaidInvoices([]);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (branchId) fetchUnpaidInvoices();
    }, [fetchUnpaidInvoices, branchId]);

    const handleConfirmPayment = async (invoiceId: number, paymentMethod: string, amount: Decimal) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }

        try {
            const res = await fetch('/api/v1/clinic/cashier/payments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    invoiceId: invoiceId,
                    paymentMethod: paymentMethod,
                    amountPaid: Number(amount)
                }),
            });
            
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Gagal memproses pembayaran');
            }
            
            toast.success(`Pembayaran untuk Invoice #${selectedInvoice?.invoiceNumber} berhasil!`);
            setSelectedInvoice(null);
            fetchUnpaidInvoices();

        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={4000} />
            <PaymentDialog
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                onConfirmPayment={handleConfirmPayment}
                invoice={selectedInvoice}
            />
             <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                           <DollarSignIcon className="w-8 h-8 text-green-500" /> Kasir & Pembayaran
                        </h1>
                        <div className="flex items-center gap-4">
                             <a href={`/dashboardSimKlinik/${branchId}/dashboard`} className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors no-underline text-gray-700">
                                <ArrowLeftIcon className="w-4 h-4" />
                                Kembali
                            </a>
                             <button onClick={fetchUnpaidInvoices} disabled={isLoading} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-medium transition-colors">
                                <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Memuat...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {isLoading ? <SkeletonLoader /> : (
                        <div className="space-y-4">
                            {unpaidInvoices.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
                                    <h3 className="text-xl font-semibold text-gray-700">Tidak Ada Tagihan</h3>
                                    <p className="text-gray-500 mt-2">Semua tagihan sudah lunas. Kerja bagus!</p>
                                </div>
                            ) : (
                                unpaidInvoices.map(invoice => (
                                    <div key={invoice.id} className="bg-white p-4 rounded-lg shadow-sm border transition-shadow hover:shadow-md">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                                            {/* Info Pasien & Invoice (Mobile & Desktop) */}
                                            <div className="md:col-span-2">
                                                <p className="font-bold text-blue-700">{invoice.patient.fullName}</p>
                                                <p className="text-sm text-gray-500">RM: {invoice.patient.medicalRecordNo}</p>
                                                <p className="text-xs text-gray-400 mt-1">INV: {invoice.invoiceNumber}</p>
                                            </div>

                                            {/* Tanggal (Desktop) */}
                                            <div className="hidden md:block">
                                                <p className="text-sm text-gray-500">Tgl Kunjungan</p>
                                                <p className="font-medium text-gray-800">{formatDate(invoice.appointment?.appointmentDate)}</p>
                                            </div>

                                            {/* Total Tagihan (Mobile & Desktop) */}
                                            <div className="text-right md:text-left">
                                                <p className="text-sm text-gray-500">Total Tagihan</p>
                                                <p className="font-bold text-lg text-red-600">{formatCurrency(invoice.totalAmount)}</p>
                                            </div>

                                            {/* Tombol Aksi (Mobile & Desktop) */}
                                            <div className="col-span-2 md:col-span-1 flex justify-end items-center">
                                                <button
                                                    onClick={() => setSelectedInvoice(invoice)}
                                                    className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 font-semibold shadow-sm w-full md:w-auto"
                                                >
                                                    Proses Bayar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>
            </div>
        </Fragment>
    );
}
