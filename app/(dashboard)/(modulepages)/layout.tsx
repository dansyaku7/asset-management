// File: app/(dashboard)/(modulepages)/layout.tsx
// Layout ini KHUSUS untuk halaman-halaman modul yang butuh sidebar.

"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
    const pathname = usePathname();
    
    // Definisikan menu untuk setiap modul
    const assetMenuItems = [
        { name: 'Dashboard Aset', path: '/dashboardAsset', icon: 'fa-chart-pie' },
        { name: 'Daftar Aset', path: '/dashboardAsset/list', icon: 'fa-boxes-stacked' },
        // ... bisa tambah menu lain khusus aset di sini
    ];
    
    // Nanti bisa ditambah menu untuk modul lain
    // const accountingMenuItems = [...]

    return (
        <aside className="w-64 bg-white shadow-lg flex-shrink-0 flex flex-col">
            <div className="p-5 bg-blue-700 text-white flex items-center justify-center">
                <i className="fas fa-clinic-medical fa-2x mr-3"></i>
                <div>
                    <h1 className="text-xl font-bold">MitraClinic</h1>
                    <p className="text-xs">Asset Management</p> {/* Judul bisa dinamis nanti */}
                </div>
            </div>
            <nav className="mt-4 flex-1 overflow-y-auto">
                <p className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase">Menu Aset</p>
                {assetMenuItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                         <Link href={item.path} key={item.name} legacyBehavior>
                            <a className={`flex items-center px-6 py-3 text-gray-600 transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-100'}`}>
                                <i className={`fas ${item.icon} w-6 text-center mr-3 ${isActive ? 'text-blue-600' : ''}`}></i> {item.name}
                            </a>
                        </Link>
                    )
                })}
                 <hr className="my-4" />
                 <Link href="/dashboardMain" legacyBehavior>
                    <a className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100">
                        <i className="fas fa-arrow-left w-6 text-center mr-3"></i> Kembali ke Modul
                    </a>
                </Link>
            </nav>
             <div className="p-4 border-t">
                <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold">
                    <i className="fas fa-sign-out-alt mr-2"></i>Logout
                </button>
            </div>
        </aside>
    );
};

export default function ModulePagesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {/* Kita kasih padding di sini biar kontennya nggak nempel */}
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
