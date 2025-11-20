// File: app/(dashboard)/dashboardAsset/components/AuthGuard.tsx

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return;
        }
        if (!isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-gray-600">Memverifikasi sesi...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return null;
}