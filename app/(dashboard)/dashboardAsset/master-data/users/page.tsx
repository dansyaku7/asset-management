'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationDialog from '../../components/ConfirmationDialog';

type Role = { id: number; name: string; };
type User = { id: number; fullName: string; email: string; role: Role; };

// --- PERUBAHAN: Modal di-refactor total ---
const UserFormModal = ({ isOpen, onClose, onSave, userToEdit, roles }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (formData: any) => void; 
  userToEdit: User | null; 
  roles: Role[]; 
}) => {
  if (!isOpen) return null;

  // Style konsisten dari form sebelumnya
  const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5";
  const baseStyle = "w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition duration-150 ease-in-out";
  const inputStyle = `${baseStyle} form-input`;
  const selectStyle = `${baseStyle} form-select`;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      onSave(data);
  };

  return (
      <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
              {/* Header Modal */}
              <div className="flex justify-between items-center p-5 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">{userToEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl font-light">&times;</button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} id="user-form" className="p-5 space-y-4 overflow-y-auto">
                  <div>
                      <label htmlFor="fullName" className={labelStyle}>Nama Lengkap</label>
                      <input type="text" name="fullName" id="fullName" defaultValue={userToEdit?.fullName} required className={inputStyle} />
                  </div>
                  <div>
                      <label htmlFor="email" className={labelStyle}>Email</label>
                      <input type="email" name="email" id="email" defaultValue={userToEdit?.email} required className={inputStyle} />
                  </div>
                  <div>
                      <label htmlFor="password" className={labelStyle}>Password</label>
                      <input type="password" name="password" id="password" placeholder={userToEdit ? 'Kosongkan jika tidak ganti' : ''} required={!userToEdit} className={inputStyle} />
                  </div>
                  <div>
                      <label htmlFor="roleId" className={labelStyle}>Role</label>
                      <select name="roleId" id="roleId" defaultValue={userToEdit?.role.id} required className={selectStyle}>
                          <option value="">Pilih Role</option>
                          {roles.map(role => ( <option key={role.id} value={role.id}>{role.name}</option> ))}
                      </select>
                  </div>
              </form>
              
              {/* Footer Tombol */}
              <div className="flex justify-end gap-4 p-5 border-t bg-gray-50/80 backdrop-blur-sm sticky bottom-0">
                  <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold transition-all">
                      Batal
                  </button>
                  <button type="submit" form="user-form" className="px-6 py-2.5 bg-[#01449D] text-white rounded-lg hover:bg-[#013b8a] disabled:bg-gray-400 font-semibold transition-all">
                      Simpan
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
  icon: string;
  tooltip: string;
  colorClass: string;
}) => (
  <button onClick={onClick} className={`group relative ${colorClass} p-2 rounded-md hover:bg-gray-100 transition-colors`}>
    <i className={`fa-fw ${icon}`}></i>
    <span className="absolute bottom-full right-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
      {tooltip}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
    </span>
  </button>
);

export default function UserManagementPage() {
    // --- State & Logic (Tidak ada perubahan) ---
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) {
            toast.error("Sesi tidak valid. Silakan login kembali.");
            setIsLoading(false);
            return;
        }
        try {
            const [usersRes, rolesRes] = await Promise.all([
                fetch('/api/v1/management/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/management/roles', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!usersRes.ok) throw new Error('Gagal mengambil data pengguna');
            if (!rolesRes.ok) throw new Error('Gagal mengambil data roles');

            setUsers(await usersRes.json());
            setRoles(await rolesRes.json());
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (user: User | null = null) => { setEditingUser(user); setIsModalOpen(true); };
    const handleCloseModal = () => { setEditingUser(null); setIsModalOpen(false); };

    const handleSaveUser = async (formData: any) => {
        const token = getToken();
        if (!token) { toast.error("Sesi Anda telah berakhir."); return; }

        const url = editingUser ? `/api/v1/management/users/${editingUser.id}` : '/api/v1/management/users';
        const method = editingUser ? 'PUT' : 'POST';
        let payload = { ...formData };
        if (editingUser && (!payload.password || payload.password === '')) delete payload.password;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
            
            toast.success(`Pengguna berhasil ${editingUser ? 'diperbarui' : 'ditambahkan'}!`);
            handleCloseModal();
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = (user: User) => {
        setConfirmation({
            title: "Konfirmasi Hapus Pengguna",
            message: `Yakin ingin menghapus pengguna "${user.fullName}"? Aksi ini tidak dapat dibatalkan.`,
            onConfirm: async () => {
                const token = getToken();
                if (!token) { toast.error("Sesi Anda telah berakhir."); return; }
                try {
                    const res = await fetch(`/api/v1/management/users/${user.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const result = await res.json();
                        throw new Error(result.error || 'Gagal menghapus pengguna');
                    }
                    toast.success('Pengguna berhasil dihapus!');
                    fetchData();
                } catch (error: any) {
                    toast.error(error.message);
                }
            }
        });
    };
    // --- End of Logic ---

    return (
        // --- PERUBAHAN: Container Utama ---
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            
            {/* --- PERUBAHAN: Header & Tombol (Responsive) --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-[#01449D] hover:bg-[#013b8a] text-white font-semibold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto">
                    <i className="fas fa-plus fa-fw"></i>
                    <span>Tambah Pengguna</span>
                </button>
            </div>

            {isLoading ? <p className="text-center text-gray-500 py-10">Memuat data...</p> : (
                <>
                    {/* --- 1. Tampilan Tabel Desktop --- */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase">Nama Lengkap</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-700 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-900 font-medium">{user.fullName}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">{user.email}</td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                                            {user.role.name}
                                          </span>
                                        </td>
                                        {/* --- PERUBAHAN: Tombol Aksi diganti Icon --- */}
                                        <td className="py-4 px-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-x-1">
                                                <TooltipIconButton
                                                    onClick={() => handleOpenModal(user)}
                                                    icon="fas fa-pencil-alt"
                                                    tooltip="Edit"
                                                    colorClass="text-blue-600 hover:text-blue-900"
                                                />
                                                <TooltipIconButton
                                                    onClick={() => handleDelete(user)}
                                                    icon="fas fa-trash-alt"
                                                    tooltip="Hapus"
                                                    colorClass="text-red-600 hover:text-red-900"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- 2. Tampilan Card Mobile --- */}
                    <div className="block md:hidden space-y-4">
                        {users.length > 0 ? users.map((user) => (
                            <div key={user.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                {/* Card Header */}
                                <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{user.fullName}</h4>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold whitespace-nowrap">
                                        {user.role.name}
                                    </span>
                                </div>
                                
                                {/* Card Footer (Actions) */}
                                <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                    <button onClick={() => handleOpenModal(user)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Edit</button>
                                    <button onClick={() => handleDelete(user)} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Hapus</button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-gray-500">Belum ada data pengguna.</div>
                        )}
                    </div>
                </>
            )}

            <UserFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveUser} userToEdit={editingUser} roles={roles} />
            {confirmation && <ConfirmationDialog isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} confirmText="Ya, Hapus" />}
        </div>
    );
}