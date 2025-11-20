// File: app/(dashboard)/dashboardAsset/components/PermissionGuard.tsx

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

// Komponen ini akan membungkus halaman yang memerlukan permission khusus
export default function PermissionGuard({ children, permission }: { children: React.ReactNode; permission: string }) {
    const { hasPermission, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Jangan lakukan apa-apa jika AuthContext masih loading
        if (isLoading) {
            return;
        }

        // Jika sudah selesai loading dan ternyata TIDAK punya permission, tendang!
        if (!hasPermission(permission)) {
            router.push('/dashboardSimKlinik/unauthorized'); // Arahkan ke halaman 'Akses Ditolak'
        }
    }, [isLoading, hasPermission, permission, router]);

    // Tampilkan loading spinner selama AuthContext memverifikasi token
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-gray-600">Memverifikasi hak akses...</p>
                </div>
            </div>
        );
    }

    // Jika user punya permission, tampilkan halaman yang dibungkusnya
    if (hasPermission(permission)) {
        return <>{children}</>;
    }

    // Tampilkan null selama proses redirect untuk menghindari kedipan konten
    return null;
}