// File: app/(dashboard)/dashboardAccounting/hr/salary-settings/page.tsx
// VERSI REFACTOR: Responsive Table + Refactored Modal

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Employee, User, Branch, PayrollComponent, EmployeeSalary, PayrollComponentType } from '@prisma/client';
import { Settings, Loader2, PlusCircle, Trash2, X } from 'lucide-react'; // Tambah X
import { Decimal } from '@prisma/client/runtime/library';

// Helper (Tidak ada perubahan)
const formatCurrency = (value: number | Decimal | string | null | undefined) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value || 0));

// Tipe Data Gabungan (Tidak ada perubahan)
type EmployeeWithDetails = Employee & { user: { fullName: string }, branch: { name: string } };
type SalaryComponent = EmployeeSalary & { payrollComponent: PayrollComponent };

// --- PERUBAHAN: Komponen Modal Setting Gaji (Refactor Total) ---
const SalaryDialog = ({ isOpen, onClose, onSave, employee, allComponents }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: any[]) => Promise<void>;
    employee: EmployeeWithDetails | null;
    allComponents: PayrollComponent[];
}) => {
    if (!isOpen || !employee) return null;

    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Style konsisten dari form sebelumnya
    const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
    const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out h-10"; // Tambah h-10
    const selectStyle = `${baseStyle} form-select`;
    const inputStyle = `${baseStyle} form-input`;

    useEffect(() => {
        const fetchSalary = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/accounting/employees/${employee.id}/salary`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                if (!res.ok) throw new Error('Gagal memuat struktur gaji');
                const data: SalaryComponent[] = await res.json();
                setItems(data.map(s => ({
                    id: s.id, // Pertahankan ID jika ada (untuk update/delete di backend)
                    payrollComponentId: s.payrollComponentId.toString(), // Pastikan string untuk select
                    amount: s.amount.toString(),
                    type: s.payrollComponent.type,
                })));
            } catch (error: any) {
                toast.error(error.message);
                setItems([]); // Reset jika gagal
            } finally {
                setIsLoading(false);
            }
        };
        fetchSalary();
    }, [employee]); // Re-fetch saat employee berubah

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        if (field === 'payrollComponentId') {
            const selectedComp = allComponents.find(c => c.id === parseInt(value));
            if (selectedComp) newItems[index]['type'] = selectedComp.type;
            else newItems[index]['type'] = undefined; // Atau handle error
        }
        setItems(newItems);
    };
    
    const addItem = (type: PayrollComponentType) => {
        setItems([...items, { id: undefined, payrollComponentId: '', amount: '', type }]); // ID undefined untuk item baru
    };
    
    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Validasi: Pastikan semua field terisi & unik per tipe
        const validItems = items.filter(item => item.payrollComponentId && item.amount && item.type);
        const componentIds = validItems.map(item => item.payrollComponentId);
        if (new Set(componentIds).size !== componentIds.length) {
             toast.error("Komponen gaji tidak boleh duplikat.");
             setIsSubmitting(false);
             return;
        }
        if (validItems.length !== items.length) {
            toast.error("Harap isi semua baris komponen gaji dengan lengkap.");
            setIsSubmitting(false);
            return;
        }

        // Siapkan payload (hanya kirim id, compId, amount)
        const payload = validItems.map(item => ({
            id: item.id, // Kirim ID jika ada (untuk update/delete di backend)
            payrollComponentId: parseInt(item.payrollComponentId),
            amount: parseFloat(item.amount)
        }));

        await onSave(payload);
        setIsSubmitting(false);
    };

    const earnings = items.filter(item => item.type === 'EARNING');
    const deductions = items.filter(item => item.type === 'DEDUCTION');

    const renderItems = (itemList: any[], type: PayrollComponentType) => (
        <div className="space-y-2 mt-2">
            {itemList.map((item) => {
                // Cari index asli di state `items` untuk update/delete
                const originalIndex = items.findIndex(i => i === item); 
                return (
                    <div key={originalIndex} className="flex gap-2 items-center">
                        <select 
                            value={item.payrollComponentId} 
                            onChange={e => handleItemChange(originalIndex, 'payrollComponentId', e.target.value)} 
                            className={`${selectStyle} flex-grow`} // Ganti w-1/2 jadi flex-grow
                        >
                            <option value="" disabled>Pilih Komponen...</option>
                            {allComponents
                                .filter(c => c.type === type)
                                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input 
                            type="number" 
                            placeholder="Nominal (Rp)" 
                            value={item.amount} 
                            onChange={e => handleItemChange(originalIndex, 'amount', e.target.value)} 
                            className={`${inputStyle} w-40 flex-shrink-0`} // Set lebar fix
                        />
                        <button 
                            type="button" // Important for forms
                            onClick={() => removeItem(originalIndex)} 
                            className="text-red-500 hover:text-red-700 p-2 flex-shrink-0"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                );
            })}
             <button 
                type="button" // Important for forms
                onClick={() => addItem(type)} 
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
            >
                <PlusCircle size={14} /> Tambah {type === 'EARNING' ? 'Pendapatan' : 'Potongan'}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header Modal */}
                 <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Pengaturan Gaji</h2>
                        <p className="text-sm text-gray-600">Karyawan: <span className="font-semibold">{employee.user.fullName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>

                {/* Body Modal (Scrollable) */}
                <div className="p-5 overflow-y-auto flex-grow">
                    {isLoading ? (
                        <div className="flex justify-center items-center min-h-[200px]">
                            <Loader2 className="animate-spin text-gray-500" size={32}/>
                        </div> 
                    ) : (
                        <div className="space-y-6">
                            {/* Pendapatan */}
                            <div>
                                <h3 className="font-semibold text-green-700 border-b pb-1 mb-2">Pendapatan (Earnings)</h3>
                                {renderItems(earnings, 'EARNING')}
                            </div>
                            {/* Potongan */}
                            <div>
                                <h3 className="font-semibold text-red-700 border-b pb-1 mb-2">Potongan (Deductions)</h3>
                                {renderItems(deductions, 'DEDUCTION')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Tombol */}
                <div className="flex justify-end gap-4 p-5 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all"
                    >
                        Tutup
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || isLoading} 
                        className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Gaji'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- HELPER BARU: Tombol Aksi Desktop ---
const TooltipIconButton = ({ 
  onClick, 
  icon, 
  tooltip, 
  colorClass
}: { 
  onClick: () => void; 
  icon: React.ReactNode; // Ganti jadi ReactNode
  tooltip: string;
  colorClass: string;
}) => (
  <button onClick={onClick} className={`group relative ${colorClass} p-2 rounded-md hover:bg-gray-100 transition-colors`}>
    {icon}
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
      {tooltip}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
    </span>
  </button>
);


export default function SalarySettingsPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
    const [allComponents, setAllComponents] = useState<PayrollComponent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }

        try {
            const [employeesRes, componentsRes] = await Promise.all([
                fetch('/api/v1/accounting/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/accounting/payroll-components', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!employeesRes.ok) throw new Error('Gagal memuat karyawan');
            if (!componentsRes.ok) throw new Error('Gagal memuat komponen gaji');
            
            setEmployees(await employeesRes.json());
            setAllComponents(await componentsRes.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (employee: EmployeeWithDetails) => {
        setSelectedEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedEmployee(null);
        setIsModalOpen(false);
    };

    const handleSaveSalary = async (items: any[]) => {
        if (!selectedEmployee) return;
        const token = getToken();
        try {
            const res = await fetch(`/api/v1/accounting/employees/${selectedEmployee.id}/salary`, {
                method: 'POST', // Bisa jadi PUT jika backend support update/delete by ID
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ items }) // Sesuaikan payload jika backend mengharapkan object { items: [...] }
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal menyimpan gaji');
            }
            toast.success(`Struktur gaji untuk ${selectedEmployee.user.fullName} berhasil disimpan!`);
            handleCloseModal();
            // Mungkin perlu fetch ulang data employee jika ada info gaji di tabel utama
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    // --- End of Logic ---

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} />
            {isModalOpen && (
                <SalaryDialog 
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveSalary}
                    employee={selectedEmployee}
                    allComponents={allComponents}
                />
            )}
            {/* --- PERUBAHAN: Header Halaman --- */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Setting Gaji Karyawan</h1>
            </div>

            {/* --- PERUBAHAN: Container Tabel (Responsive) --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                {isLoading ? (
                    <div className="flex justify-center items-center p-10 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        <p className="ml-3 text-gray-500">Memuat data karyawan...</p>
                    </div> 
                ) : (
                    <>
                        {/* 1. Tabel Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nama Karyawan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Jabatan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cabang</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Belum ada data karyawan.</td></tr> 
                                    ) : (
                                        employees.map(emp => (
                                            <tr key={emp.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{emp.user.fullName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.position}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{emp.branch.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <TooltipIconButton
                                                        onClick={() => handleOpenModal(emp)}
                                                        icon={<Settings size={18} />}
                                                        tooltip="Atur Gaji"
                                                        colorClass="text-blue-600 hover:text-blue-900"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 2. List Card Mobile */}
                        <div className="block md:hidden space-y-4">
                            {employees.length === 0 ? (
                                <div className="px-6 py-10 text-center text-gray-500">Belum ada data karyawan.</div> 
                            ) : (
                                employees.map(emp => (
                                    <div key={emp.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{emp.user.fullName}</h4>
                                                <p className="text-sm text-gray-500">{emp.position}</p>
                                            </div>
                                             <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full whitespace-nowrap">
                                                {emp.branch.name}
                                            </span>
                                        </div>
                                        
                                        {/* Card Footer (Actions) */}
                                        <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                                            <button 
                                                onClick={() => handleOpenModal(emp)} 
                                                className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 flex items-center gap-1"
                                            >
                                                <Settings size={14} /> Atur Gaji
                                            </button>
                                        </div>
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