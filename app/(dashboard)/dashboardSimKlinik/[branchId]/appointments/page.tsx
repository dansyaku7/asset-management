// File: app/(dashboard)/dashboardSimKlinik/[branchId]/appointments/page.tsx
// Versi perbaikan dengan UI modern, responsif, skeleton loading, dan tanpa dependensi Next.js

'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast, ToastContainer } from 'react-toastify';

// --- Tipe Data (Disederhanakan) ---
type Doctor = { id: number; fullName: string; };
type Patient = { id: number; fullName:string; medicalRecordNo: string; };
type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "CHECK_IN";

type AppointmentWithDetails = { 
    id: number;
    patientId: number;
    doctorId: number;
    appointmentDate: string;
    status: AppointmentStatus;
    notes: string | null;
    patient: { fullName: string, medicalRecordNo: string };
    doctor: { user: { fullName: string } };
};

// --- Icons (Inline SVG) ---
const CalendarDaysIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const StethoscopeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4.5 4.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/><path d="M5.5 16.5v6a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-6"/><path d="M18 10a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v10h12Z"/></svg>;
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>;


// --- Helper ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};

const statusMap: { [key in AppointmentStatus]: { text: string, className: string } } = {
    SCHEDULED: { text: 'Terjadwal', className: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { text: 'Selesai', className: 'bg-green-100 text-green-800' },
    CANCELLED: { text: 'Batal', className: 'bg-red-100 text-red-800' },
    CHECK_IN: { text: 'Check In', className: 'bg-blue-100 text-blue-800' },
};

// --- Komponen UI ---

const AppointmentDialog = ({ isOpen, onClose, onSave, patients, doctors, appointmentToEdit }: {
    isOpen: boolean; onClose: () => void; onSave: (data: any) => void; patients: Patient[]; doctors: Doctor[]; appointmentToEdit: AppointmentWithDetails | null;
}) => {
    if (!isOpen) return null;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try {
            await onSave(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditing = !!appointmentToEdit;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Janji Temu' : 'Buat Janji Temu Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pasien</label>
                        <select name="patientId" required disabled={isEditing} defaultValue={appointmentToEdit?.patientId} className="mt-1 w-full p-2 border rounded-md bg-gray-50 disabled:opacity-75">
                            <option value="">Pilih Pasien...</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} (RM: {p.medicalRecordNo})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Dokter</label>
                        <select name="doctorId" required defaultValue={appointmentToEdit?.doctorId} className="mt-1 w-full p-2 border rounded-md">
                             <option value="">Pilih Dokter...</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal & Waktu Janji Temu</label>
                        <input type="datetime-local" name="appointmentDate" required defaultValue={formatDateForInput(appointmentToEdit?.appointmentDate)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    {isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select name="status" defaultValue={appointmentToEdit?.status} className="mt-1 w-full p-2 border rounded-md">
                                {Object.keys(statusMap).map(status => (
                                    <option key={status} value={status}>{statusMap[status as AppointmentStatus].text}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Catatan (Opsional)</label>
                        <textarea name="notes" rows={3} defaultValue={appointmentToEdit?.notes || ''} className="mt-1 w-full p-2 border rounded-md"></textarea>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">
                           {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Halaman Utama ---
export default function AppointmentsPage() {
    const [branchId, setBranchId] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<AppointmentWithDetails | null>(null);

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

        // Style untuk dot pada kalender
        const customCalendarStyleId = 'rdp-custom-style';
        if (!document.getElementById(customCalendarStyleId)) {
            const style = document.createElement('style');
            style.id = customCalendarStyleId;
            style.innerHTML = `
                .day-scheduled:not(.day-selected) { 
                    position: relative;
                }
                .day-scheduled:not(.day-selected)::after {
                    content: '';
                    position: absolute;
                    bottom: 6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #2563eb;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);
    
    const handleCloseDialog = () => { setIsDialogOpen(false); setAppointmentToEdit(null); };

    const fetchAppointments = useCallback(async (month: Date) => {
        const token = getToken();
        if (!token || !branchId) return;
        
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const params = new URLSearchParams({ 
            startDate: start.toISOString(), 
            endDate: new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString() 
        });

        try {
            const res = await fetch(`/api/v1/clinic/appointments/${branchId}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Gagal memuat janji temu');
            setAppointments(await res.json());
        } catch (error: any) {
            toast.error(error.message);
        }
    }, [branchId]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            const token = getToken();
            if (!token) { toast.error("Sesi tidak valid."); setIsLoading(false); return; }
            try {
                await fetchAppointments(currentMonth);

                const [patientsRes, doctorsRes] = await Promise.all([
                    fetch('/api/v1/clinic/patients', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`/api/v1/clinic/doctors?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!patientsRes.ok) throw new Error('Gagal memuat data pasien');
                if (!doctorsRes.ok) throw new Error('Gagal memuat data dokter');
                
                setPatients(await patientsRes.json());
                setDoctors(await doctorsRes.json());
            } catch (error: any) {
                toast.error(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        if (branchId) fetchInitialData();
    }, [fetchAppointments, currentMonth, branchId]);

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return appointments
            .filter(app => isSameDay(new Date(app.appointmentDate), selectedDate))
            .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    }, [appointments, selectedDate]);

    const handleSaveAppointment = async (data: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        
        const url = appointmentToEdit 
            ? `/api/v1/clinic/appointments/${branchId}/${appointmentToEdit.id}`
            : `/api/v1/clinic/appointments/${branchId}`;
        const method = appointmentToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal menyimpan janji temu');
            }
            toast.success(`Janji temu berhasil ${appointmentToEdit ? 'diperbarui' : 'dibuat'}!`);
            handleCloseDialog();
            fetchAppointments(currentMonth);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteAppointment = async (appointmentId: number) => {
        if (!window.confirm("Yakin ingin menghapus janji temu ini?")) return;
        
        const token = getToken();
        if (!token) { toast.error("Sesi tidak valid."); return; }
        
        try {
            const res = await fetch(`/api/v1/clinic/appointments/${branchId}/${appointmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
             if (!res.ok) throw new Error('Gagal menghapus janji temu');
            
            toast.success("Janji temu berhasil dihapus!");
            fetchAppointments(currentMonth);
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    return (
        <Fragment>
            <ToastContainer position="top-right" autoClose={3000} />
            <AppointmentDialog 
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSaveAppointment}
                patients={patients}
                doctors={doctors}
                appointmentToEdit={appointmentToEdit}
            />

            <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
                <main className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                           <CalendarDaysIcon className="w-8 h-8 text-blue-500" /> Jadwal & Antrean
                        </h1>
                        <div className="flex items-center gap-4">
                             <a href={`/dashboardSimKlinik/${branchId}/dashboard`} className="flex items-center gap-2 text-sm bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors no-underline text-gray-700">
                                <ArrowLeftIcon className="w-4 h-4" />
                                Kembali ke Dashboard
                            </a>
                            <button onClick={() => { setAppointmentToEdit(null); setIsDialogOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <PlusIcon className="w-5 h-5" /> Buat Janji Temu
                            </button>
                        </div>
                    </div>

                     <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
                        {isLoading ? <p className="text-center py-10">Memuat jadwal...</p> : (
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3 flex justify-center">
                                    <DayPicker
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        month={currentMonth}
                                        onMonthChange={setCurrentMonth}
                                        locale={id}
                                        modifiers={{ scheduled: appointments.map(app => new Date(app.appointmentDate)) }}
                                        modifiersClassNames={{ scheduled: 'day-scheduled' }}
                                        showOutsideDays
                                        fixedWeeks
                                        classNames={{
                                            root: 'p-3 bg-slate-50 rounded-lg border',
                                            months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                                            month: 'space-y-4 w-full',
                                            caption: 'flex justify-center pt-1 relative items-center',
                                            caption_label: 'text-sm font-semibold',
                                            nav: 'space-x-1 flex items-center',
                                            nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                                            nav_button_previous: 'absolute left-1',
                                            nav_button_next: 'absolute right-1',
                                            table: 'w-full border-collapse space-y-1',
                                            head_row: 'flex justify-between',
                                            head_cell: 'text-gray-500 rounded-md w-10 font-normal text-sm',
                                            row: 'flex w-full mt-2 justify-between',
                                            cell: 'h-10 w-10 text-center text-sm p-0 relative',
                                            day: 'h-10 w-10 p-0 font-normal rounded-full transition-colors hover:bg-slate-200',
                                            day_selected: 'bg-blue-600 text-white hover:bg-blue-600 focus:bg-blue-600',
                                            day_today: 'bg-blue-100 text-blue-800 font-bold',
                                            day_outside: 'text-gray-400 opacity-50',
                                            day_disabled: 'text-gray-400 opacity-50',
                                        }}
                                        components={{
                                            IconLeft: () => <ChevronLeftIcon className="h-4 w-4" />,
                                            IconRight: () => <ChevronRightIcon className="h-4 w-4" />,
                                        }}
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">
                                        Antrean {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: id }) : ''}
                                    </h3>
                                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                        {appointmentsOnSelectedDay.length > 0 ? (
                                            appointmentsOnSelectedDay.map((app, index) => (
                                                <div key={app.id} className="p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-500 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-blue-700">
                                                            <span className="text-gray-400 mr-2 text-base">{index + 1}.</span> 
                                                            {app.patient.fullName}
                                                        </p>
                                                        <div className={`text-xs px-2 py-1 rounded-full font-semibold ${statusMap[app.status]?.className}`}>
                                                            {statusMap[app.status]?.text}
                                                        </div>
                                                    </div>
                                                    <div className="pl-6 text-sm text-gray-600 space-y-1 mt-1">
                                                        <p>No. RM: {app.patient.medicalRecordNo}</p>
                                                        <p>Dokter: {app.doctor.user.fullName}</p>
                                                        <p className="font-semibold text-gray-800">
                                                            Pukul: {format(new Date(app.appointmentDate), 'HH:mm')}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 flex gap-2 pl-6">
                                                        <a href={`/dashboardSimKlinik/${branchId}/rme/${app.patientId}?appointmentId=${app.id}`} className="flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-green-700 no-underline">
                                                           <StethoscopeIcon className="w-4 h-4" /> Pemeriksaan
                                                        </a>
                                                        <button onClick={() => { setAppointmentToEdit(app); setIsDialogOpen(true); }} className="flex items-center gap-1.5 bg-yellow-500 text-white text-xs px-3 py-1.5 rounded-md hover:bg-yellow-600">
                                                            <PencilIcon /> Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteAppointment(app.id)} className="flex items-center gap-1.5 bg-red-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-red-700">
                                                            <TrashIcon /> Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-500 pt-16">Tidak ada pasien terjadwal.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>
                </main>
            </div>
        </Fragment>
    );
}

