'use client';

import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Tipe data yang dibutuhkan
type Role = {
  id: number;
  name: string;
};

type User = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
};

// Komponen Modal Form
const UserFormModal = ({ isOpen, onClose, onSave, userToEdit, roles }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  userToEdit: User | null;
  roles: Role[];
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{userToEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-gray-700">Nama Lengkap</label>
            <input type="text" name="fullName" id="fullName" defaultValue={userToEdit?.fullName} required className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700">Email</label>
            <input type="email" name="email" id="email" defaultValue={userToEdit?.email} required className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700">Password</label>
            <input type="password" name="password" id="password" placeholder={userToEdit ? 'Kosongkan jika tidak ganti' : ''} required={!userToEdit} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="mb-4">
            <label htmlFor="roleId" className="block text-gray-700">Role</label>
            <select name="roleId" id="roleId" defaultValue={userToEdit?.role.id} required className="w-full px-3 py-2 border rounded">
              <option value="">Pilih Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Komponen Halaman Utama
export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = getToken();
    // FIX: Cek token sebelum fetch
    if (!token) {
        toast.error("Sesi tidak valid. Silakan login kembali.");
        setIsLoading(false);
        return;
    }
    try {
      const res = await fetch('/api/assets/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        throw new Error(errorBody.error || 'Gagal mengambil data pengguna');
      }
      const data = await res.json();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    const token = getToken();
    // FIX: Cek token sebelum fetch
    if (!token) {
        // Tidak perlu toast lagi karena sudah ada di fetchUsers
        return;
    }
    try {
      const res = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        throw new Error(errorBody.error || 'Gagal mengambil data roles');
      }
      const data = await res.json();
      setRoles(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenModal = (user: User | null = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleSaveUser = async (formData: any) => {
    const token = getToken();
    if (!token) {
      toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      return;
    }

    const url = editingUser ? `/api/assets/users/${editingUser.id}` : '/api/assets/users';
    const method = editingUser ? 'PUT' : 'POST';

    let payload = { ...formData };
    
    if (editingUser && (!payload.password || payload.password === '')) {
      delete payload.password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data');
      
      toast.success(`Pengguna berhasil ${editingUser ? 'diperbarui' : 'ditambahkan'}!`);
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (userId: number) => {
    const token = getToken();
    if (!token) {
      toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      return;
    }

    if (confirm('Anda yakin ingin menghapus pengguna ini?')) {
      try {
        const res = await fetch(`/api/assets/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const result = await res.json();
            throw new Error(result.error || 'Gagal menghapus pengguna');
        }
        toast.success('Pengguna berhasil dihapus!');
        fetchUsers();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
        <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          + Tambah Pengguna
        </button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 px-4 whitespace-nowrap">{user.fullName}</td>
                  <td className="py-4 px-4 whitespace-nowrap">{user.email}</td>
                  <td className="py-4 px-4 whitespace-nowrap">{user.role.name}</td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <button onClick={() => handleOpenModal(user)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded mr-2 transition duration-300">Edit</button>
                    <button onClick={() => handleDelete(user.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded transition duration-300">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        userToEdit={editingUser}
        roles={roles}
      />
    </div>
  );
}