'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="text-center p-8 sm:p-12 bg-white rounded-2xl shadow-xl max-w-lg w-full transform transition-all animate-fade-in-up">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
                    <ShieldAlert className="h-12 w-12 text-red-500" strokeWidth={1.5} />
                </div>
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Akses Ditolak</h1>
                <p className="mt-4 text-base text-gray-600">
                    Anda tidak memiliki hak akses yang diperlukan untuk melihat halaman ini. Silakan hubungi administrator sistem Anda jika Anda merasa ini adalah sebuah kesalahan.
                </p>
                <button
                    onClick={() => router.back()}
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>
            </div>
             {/* Animasi sederhana */}
            <style jsx>{`
                @keyframes fade-in-up {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </main>
    );
}
