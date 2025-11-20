// File: app/(dashboard)/dashboardSimKlinik/[branchId]/purchases/page.tsx
// Versi perbaikan dengan UI modern, responsif, skeleton loading, dan tanpa dependensi Next.js

"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';

// --- Tipe Data ---
type Decimal = number | string;
type Supplier = { id: number; name: string; };
type Drug = { id: number; name: string; };
type PurchaseItemForm = { drugId: string; quantity: string; purchasePrice: string; expiryDate: string; };
type PurchaseHistory = {
    id: number;
    transactionDate: string;
    internalRefNumber: string;
    supplier: { name: string };
    status: 'PAID' | 'UNPAID';
    paymentMethod: 'CASH' | 'CREDIT';
    totalAmount: Decimal;
};

// --- Icons (Inline SVG) ---
const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 18H3c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2h-2"/><path d="M7 18V8.12a2 2 0 0 1 .62-1.42l1.62-1.62A2 2 0 0 1 10.66 4h2.68a2 2 0 0 1 1.42.62l1.62 1.62a2 2 0 0 1 .62 1.42V18"/><path d="M8 18h8"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="2"/></svg>;
const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>;
const Trash2Icon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const Loader2Icon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>;
const BanknoteIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;

// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];
const formatCurrency = (value: number | Decimal) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// --- Komponen ---

export default function PurchasesPage() {
    const [branchId, setBranchId] = useState<string | null>(null);
    
    // Data Master & Riwayat
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
    
    // State Form
    const [supplierId, setSupplierId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [transactionDate, setTransactionDate] = useState(formatDateForInput(new Date()));
    const [paymentMethod, setPaymentMethod] = useState('CREDIT');
    const [items, setItems] = useState<PurchaseItemForm[]>([{ drugId: '', quantity: '', purchasePrice: '', expiryDate: '' }]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token || !branchId) { setIsLoading(false); return; }
        try {
            const [suppliersRes, drugsRes, purchasesRes] = await Promise.all([
                fetch('/api/v1/purchasing/suppliers', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/clinic/drugs', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/v1/clinic/purchases?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!suppliersRes.ok) throw new Error('Gagal memuat supplier');
            if (!drugsRes.ok) throw new Error('Gagal memuat obat');
            if (!purchasesRes.ok) throw new Error('Gagal memuat riwayat pembelian');
            
            setSuppliers(await suppliersRes.json());
            setDrugs(await drugsRes.json());
            setPurchaseHistory(await purchasesRes.json());

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (branchId) fetchData();
    }, [fetchData, branchId]);

    const handleItemChange = (index: number, field: keyof PurchaseItemForm, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };
    const addItem = () => {
        setItems([...items, { drugId: '', quantity: '', purchasePrice: '', expiryDate: '' }]);
    };
    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = getToken();
        const validItems = items.filter(item => item.drugId && item.quantity && parseFloat(item.quantity) > 0 && item.purchasePrice && parseFloat(item.purchasePrice) >= 0 && item.expiryDate);
        if (validItems.length === 0) {
            toast.error("Harap isi minimal satu item obat dengan lengkap.");
            setIsSubmitting(false);
            return;
        }
        const payload = { branchId, supplierId, invoiceNumber, transactionDate, paymentMethod, items: validItems };

        try {
            const res = await fetch('/api/v1/clinic/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan pembelian');
            
            toast.success(<div><p className="font-bold">Pembelian Berhasil!</p><p className="text-sm">Ref: {result.internalRefNumber}</p></div>);
            
            setSupplierId('');
            setInvoiceNumber('');
            setItems([{ drugId: '', quantity: '', purchasePrice: '', expiryDate: '' }]);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePayDebt = async (purchaseInvoiceId: number) => {
        if (!window.confirm("Yakin ingin melunasi hutang untuk faktur ini?")) return;

        setIsSubmitting(true);
        const token = getToken();
        try {
            const res = await fetch('/api/v1/clinic/purchases/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ purchaseInvoiceId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal memproses pelunasan');

            toast.success(`Pelunasan untuk faktur ${result.internalRefNumber} berhasil!`);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={5000} />
            <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                           <TruckIcon className="w-8 h-8 text-blue-500" /> Pembelian & Stok Masuk
                        </h1>
                        <a href={`/dashboardSimKlinik/${branchId}/dashboard`} className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors no-underline text-gray-700 self-start sm:self-center">
                            <ArrowLeftIcon className="w-4 h-4" />
                            Kembali
                        </a>
                    </div>

                    {/* Form Input Faktur */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Input Faktur Pembelian</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required className="mt-1 w-full p-2 border rounded-md bg-white">
                                        <option value="" disabled>Pilih Supplier...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id.toString()}>{s.name}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Faktur</label>
                                    <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tgl. Transaksi</label>
                                    <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Metode Bayar</label>
                                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required className="mt-1 w-full p-2 border rounded-md bg-white">
                                        <option value="CREDIT">Kredit / Hutang</option>
                                        <option value="CASH">Tunai / Cash</option>
                                    </select>
                                </div>
                            </div>
    
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Detail Obat</h3>
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-2 p-3 border rounded-md items-end bg-gray-50">
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="text-xs font-medium text-gray-600">Obat</label>
                                            <select value={item.drugId} onChange={e => handleItemChange(index, 'drugId', e.target.value)} required className="w-full p-2 border rounded-md bg-white text-sm">
                                                <option value="" disabled>Pilih Obat...</option>
                                                {drugs.map(d => <option key={d.id} value={d.id.toString()}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-6 md:col-span-2">
                                            <label className="text-xs font-medium text-gray-600">Jumlah</label>
                                            <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required placeholder="Qty" className="w-full p-2 border rounded-md text-sm" />
                                        </div>
                                        <div className="col-span-6 md:col-span-2">
                                            <label className="text-xs font-medium text-gray-600">Harga Beli /unit</label>
                                            <input type="number" min="0" value={item.purchasePrice} onChange={e => handleItemChange(index, 'purchasePrice', e.target.value)} required placeholder="Harga" className="w-full p-2 border rounded-md text-sm" />
                                        </div>
                                        <div className="col-span-10 md:col-span-3">
                                            <label className="text-xs font-medium text-gray-600">Tgl. Kadaluarsa</label>
                                            <input type="date" value={item.expiryDate} onChange={e => handleItemChange(index, 'expiryDate', e.target.value)} required className="w-full p-2 border rounded-md text-sm" />
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex justify-end">
                                            <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300" disabled={items.length <= 1}>
                                                <Trash2Icon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addItem} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-2">
                                    <PlusCircleIcon className="w-4 h-4" /> Tambah Item
                                </button>
                            </div>
    
                            <div className="flex justify-end pt-4 border-t">
                                <button type="submit" disabled={isSubmitting} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center min-w-[180px]">
                                    {isSubmitting ? <><Loader2Icon className="inline mr-2 h-5 w-5 animate-spin" /> Memproses...</> : 'Simpan Pembelian'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Riwayat Pembelian */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Riwayat Pembelian</h2>
                            <button onClick={fetchData} disabled={isLoading} className="text-sm text-blue-600 flex items-center gap-2 disabled:text-gray-400">
                                <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tgl</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No. Ref</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="p-4 text-center"><Loader2Icon className="animate-spin inline h-6 w-6 text-blue-500" /></td></tr>
                                    ) : purchaseHistory.length === 0 ? (
                                        <tr><td colSpan={6} className="p-4 text-center text-gray-500">Belum ada riwayat pembelian.</td></tr>
                                    ) : (
                                        purchaseHistory.map(p => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(p.transactionDate)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.internalRefNumber}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{p.supplier.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ p.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    {p.status === 'UNPAID' && p.paymentMethod === 'CREDIT' && (
                                                        <button 
                                                            onClick={() => handlePayDebt(p.id)}
                                                            disabled={isSubmitting}
                                                            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1 mx-auto"
                                                        >
                                                            <BanknoteIcon className="h-4 w-4" /> Bayar
                                                        </button>
                                                    )}
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
