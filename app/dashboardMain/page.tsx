// app/dashboardMain/page.tsx

"use client";

import { useAuth } from "@/components/AuthContext";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

// Komponen Card
const DashboardCard = ({ title, href, description, icon }: { title: string, href: string, description: string, icon: string }) => (
  <Link 
    href={href} 
    className="group block w-full p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1"
  >
    <div className="flex items-center">
      <span className="text-3xl mr-5 group-hover:scale-110 transition-transform duration-300">{icon}</span>
      <div>
        <h5 className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">{title}</h5>
        <p className="font-normal text-gray-600">{description}</p>
      </div>
    </div>
  </Link>
);

export default function DashboardMain() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  const userRole = user.role.toLowerCase();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen font-sans bg-gray-50">
      
      {/* Panel Kiri (Biru) */}
      <div className="w-full lg:w-1/2 bg-[#01449D] text-white flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12">
        <div className="max-w-md w-full text-center">
          
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            SIM Klinik
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-blue-200">
            (System Information Management) Klinik
          </p>
          <div className="mt-8 border-t border-blue-400 opacity-50 w-1/4 mx-auto"></div>
           <p className="mt-8 text-md text-blue-100">
            Welcome, <span className="font-bold text-white">{user.fullName}</span>!
          </p>
           <p className="text-sm text-blue-200">
            Your role: <span className="font-medium text-white">{user.role}</span>
          </p>
        </div>
      </div>

      {/* Panel Kanan (Konten Card) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative">
         <button
            onClick={logout}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Logout
        </button>

        <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center sm:text-left">
              Select a Module
            </h2>
            {/* --- BAGIAN YANG DIPERBAIKI --- */}
            <div className="space-y-5">
              {/* Modul Asset Management: Tampil untuk super_admin ATAU aset_manajemen */}
              {(userRole === 'super_admin' || userRole === 'aset_manajemen') && (
                <DashboardCard 
                  title="Asset Management" 
                  href="/dashboardAsset" 
                  description="Manage all company assets." 
                  icon="📦" 
                />
              )}

              {/* Modul Accounting: Tampil untuk super_admin ATAU accounting */}
              {(userRole === 'super_admin' || userRole === 'accounting') && (
                <DashboardCard 
                  title="Accounting" 
                  href="#" 
                  description="Access financial records and reports." 
                  icon="🧾" 
                />
              )}
              
              {/* Modul SIM Klinik: Tampil untuk super_admin ATAU administrasi */}
              {(userRole === 'super_admin' || userRole === 'administrasi') && (
                <DashboardCard 
                  title="SIM Klinik" 
                  href="#" 
                  description="Clinical information system." 
                  icon="🏥" 
                />
              )}

              {/* Pesan jika tidak ada modul yang bisa diakses */}
              {userRole !== 'super_admin' && userRole !== 'aset_manajemen' && userRole !== 'accounting' && userRole !== 'administrasi' && (
                  <p className="text-center text-gray-500">No modules available for your role.</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}