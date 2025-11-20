"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

// Komponen ini akan membungkus SELURUH layout dashboard
export default function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return;
        }
        
        // Jika sudah selesai loading, cek role
        // SUPER_ADMIN selalu boleh masuk
        if (!user || (!allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN')) {
            router.push('/dashboardSimKlinik/unauthorized'); // Tendang ke halaman 'Akses Ditolak'
        }
    }, [isLoading, user, allowedRoles, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-gray-600">Memverifikasi role...</p>
                </div>
            </div>
        );
    }

    // Jika user punya role yang diizinkan (atau SUPER_ADMIN), tampilkan konten
    if (user && (allowedRoles.includes(user.role) || user.role === 'SUPER_ADMIN')) {
        return <>{children}</>;
    }

    return null; // Tampilkan null selama redirect
}
