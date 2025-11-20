// File: app/(dashboard)/dashboardSimKlinik/layout.tsx
// VERSI FINAL FIX: Menambahkan Sub-Menu Data Dokter & Data Akun COA

"use client";

import AuthGuard from '../dashboardAsset/components/AuthGuard';
import PermissionGuard from '../dashboardAsset/components/PermissionGuard'; 
import { useAuth } from "@/components/AuthContext";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { routePermissions } from '@/lib/route-permissions';

// --- Icon Imports ---
import {
    DatabaseIcon, LogOutIcon, MenuIcon, HomeIcon, ChevronDownIcon,
    CalendarDaysIcon, CreditCardIcon, BookOpenIcon, BuildingIcon, UsersIcon,
    PillIcon, StethoscopeIcon, UserCogIcon, PackageIcon, WrenchIcon,
    TruckIcon, ShoppingCartIcon, Beaker, FlaskConical,
    ClipboardCheck, ListOrdered, BarChart3, User, BookMarked, Layers, HardHat,
    DollarSign // Ikon baru untuk Akun COA
} from 'lucide-react';

// --- Sidebar Context ---
const SidebarContext = createContext({ isSidebarOpen: false, toggleSidebar: () => {}, closeSidebar: () => {} });
export const useSidebar = () => useContext(SidebarContext);

// --- NavItem Component ---
const NavItem = ({ icon, href, children }: { icon: React.ReactNode, href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboardSimKlinik' && pathname.startsWith(href + '/')); 

    return (
        <Link href={href} passHref legacyBehavior>
            <a onClick={closeSidebar} className={`flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${
                isActive 
                    ? 'bg-blue-100 text-[#01449D] font-semibold' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#01449D]'
            }`}>
                {icon && <span className={`mr-3 w-5 h-5 ${isActive ? 'text-[#01449D]' : 'text-gray-500'}`}>{icon}</span>}
                {children}
            </a>
        </Link>
    );
};

// --- SubNavItem Component ---
const SubNavItem = ({ icon, href, children }: { icon: React.ReactNode, href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    const pathname = usePathname();
    // Cek apakah pathname saat ini sama persis dengan href atau merupakan sub-path dari href
    const isActive = pathname === href || pathname.startsWith(href + '/');

    return (
        <Link href={href} passHref legacyBehavior>
            <a onClick={closeSidebar} className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                isActive 
                    ? 'bg-blue-100 text-[#01449D] font-semibold' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#01449D]'
            }`}>
                {icon && <span className={`mr-2 w-4 h-4 ${isActive ? 'text-[#01449D]' : 'text-gray-500'}`}>{icon}</span>}
                {children}
            </a>
        </Link>
    );
};


// --- Komponen Pembungkus Cerdas (Untuk Permission) ---
const ProtectedContent = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();
    
    const getRequiredPermission = (): string | null => {
        if (routePermissions[pathname]) return routePermissions[pathname];
        
        const parts = pathname.split('/');
        if (parts.length >= 4 && parts[1] === 'dashboardSimKlinik') {
            const module = parts[3]; 
            const page = parts[4];   

            let templatePath = `/dashboardSimKlinik/[branchId]/${module}`;

            if (module === 'master-data') {
                templatePath = `/dashboardSimKlinik/master-data/${page}`;
            } else if (page) {
                if (!isNaN(parseInt(page))) {
                    templatePath += '/[id]';
                } else { 
                    templatePath += `/${page}`;
                }
            }
            // Check for dynamic master-data route like /master-data/accounts
            if (routePermissions[templatePath]) return routePermissions[templatePath];
        }
        return null;
    };

    const requiredPermission = getRequiredPermission();

    if (requiredPermission) {
        return <PermissionGuard permission={requiredPermission}>{children}</PermissionGuard>;
    }
    return <>{children}</>;
};


// --- Layout Component UTAMA ---
export default function DashboardSimKlinikLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, hasPermission } = useAuth();
    const params = useParams();
    const branchId = params.branchId as string;
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMasterDataOpen, setMasterDataOpen] = useState(false);
    
    const pathname = usePathname();
    const isMasterDataSectionActive = pathname.startsWith('/dashboardSimKlinik/master-data');
    
    useEffect(() => {
        if (isMasterDataSectionActive) {
            setMasterDataOpen(true);
        }
    }, [isMasterDataSectionActive]);

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <AuthGuard>
            {user && (
                <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
                    {isSidebarOpen && (
                        <div 
                            onClick={closeSidebar} 
                            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                            aria-hidden="true"
                        ></div>
                    )}
                    
                    <div className="flex h-screen bg-gray-100 font-sans">
                        {/* ===== Sidebar (Putih) ===== */}
                        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:relative lg:translate-x-0 flex flex-col`}>
                            {/* Logo */}
                            <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4 flex-shrink-0">
                                <Image src="/images/logo-klinik.png" alt="Logo Klinik" width={120} height={40} priority />
                            </div>

                            {/* Navigasi Utama (flex-1 agar footer nempel di bawah) */}
                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                <NavItem icon={<BuildingIcon />} href="/dashboardSimKlinik">Pilih Cabang</NavItem>

                                {/* Menu Operasional (Hanya Muncul Setelah Cabang Dipilih) */}
                                {branchId && (
                                    <>
                                        <hr className="my-4 border-gray-200" />
                                        <p className='text-xs font-semibold text-gray-500 mb-2 px-4 uppercase'>Operasional</p>
                                        
                                        {hasPermission('view_dashboard') && <NavItem icon={<BarChart3 />} href={`/dashboardSimKlinik/${branchId}/dashboard`}>Dashboard Klinik</NavItem>}
                                        {hasPermission('manage_appointments') && <NavItem icon={<CalendarDaysIcon />} href={`/dashboardSimKlinik/${branchId}/appointments`}>Antrean & Jadwal</NavItem>}
                                        {hasPermission('access_cashier') && <NavItem icon={<CreditCardIcon />} href={`/dashboardSimKlinik/${branchId}/cashier`}>Kasir</NavItem>}
                                        {hasPermission('manage_purchases') && <NavItem icon={<ShoppingCartIcon />} href={`/dashboardSimKlinik/${branchId}/purchases`}>Pembelian / Stok</NavItem>}
                                        {hasPermission('access_lab_workbench') && <NavItem icon={<FlaskConical />} href={`/dashboardSimKlinik/${branchId}/lab`}>Meja Kerja Lab</NavItem>}
                                        {hasPermission('validate_lab_results') && <NavItem icon={<ClipboardCheck />} href={`/dashboardSimKlinik/${branchId}/lab/validation`}>Validasi Hasil Lab</NavItem>}
                                    </>
                                )}

                                {/* Dropdown Master Data */}
                                <hr className="my-4 border-gray-200" />
                                <div>
                                    <button 
                                        onClick={() => setMasterDataOpen(!isMasterDataOpen)} 
                                        className={`w-full flex items-center justify-between px-4 py-2 font-medium hover:bg-gray-100 rounded-lg transition-colors ${isMasterDataSectionActive ? 'bg-blue-100 text-[#01449D]' : 'text-gray-700 hover:text-[#01449D]'}`}
                                    >
                                        <div className="flex items-center"> 
                                            <DatabaseIcon className={`w-5 h-5 mr-3 ${isMasterDataSectionActive ? 'text-[#01449D]' : 'text-gray-500'}`} /> 
                                            <span>Master Data</span> 
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isMasterDataOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                                            {/* BARU: Data Akun COA */}
                                            {hasPermission('manage_accounts') && <SubNavItem icon={<DollarSign className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/accounts`}>Data Akun COA</SubNavItem>}
                                            
                                            {hasPermission('manage_roles') && <SubNavItem icon={<User className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/roles`}>Role & Hak Akses</SubNavItem>}
                                            {hasPermission('manage_purchases') && <SubNavItem icon={<TruckIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/suppliers`}>Data Supplier</SubNavItem>}
                                            {hasPermission('manage_patients') && <SubNavItem icon={<UsersIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/patients`}>Data Pasien</SubNavItem>}
                                            
                                            {/* Data Dokter sudah ada */}
                                            {hasPermission('manage_staff') && <SubNavItem icon={<StethoscopeIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/doctors`}>Data Dokter</SubNavItem>}
                                            
                                            {hasPermission('manage_staff') && <SubNavItem icon={<UserCogIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/staff`}>Data Staff Lain</SubNavItem>}
                                            {hasPermission('manage_drugs') && <SubNavItem icon={<PillIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/drugs`}>Data Obat</SubNavItem>}
                                            {hasPermission('manage_drugs') && <SubNavItem icon={<PackageIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/drug-stock`}>Stok Obat</SubNavItem>}
                                            {hasPermission('manage_services') && <SubNavItem icon={<WrenchIcon className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/services`}>Jasa & Layanan</SubNavItem>}
                                            {hasPermission('manage_services') && <SubNavItem icon={<Beaker className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/lab-services`}>Layanan Lab/Rad</SubNavItem>}
                                            {hasPermission('manage_services') && <SubNavItem icon={<ListOrdered className="w-4 h-4"/>} href={`/dashboardSimKlinik/master-data/lab-parameters`}>Parameter Lab</SubNavItem>}
                                        </div>
                                    )}
                                </div>
                            </nav>

                            {/* Footer Sidebar */}
                            <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0">
                                <NavItem icon={<HomeIcon />} href="/dashboardMain">Kembali ke Main</NavItem>
                                <button onClick={logout} className="w-full flex items-center px-4 py-2 mt-2 text-gray-700 font-medium hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> 
                                    <LogOutIcon className="w-5 h-5 mr-3 text-gray-500"/>
                                    <span>Log Out</span> 
                                </button>
                            </div>
                        </aside>

                        {/* ===== Konten Utama ===== */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header (Biru) */}
                            <header className="flex items-center justify-between h-20 px-6 bg-[#01449D] text-white flex-shrink-0">
                                <div className="flex items-center">
                                    <button onClick={toggleSidebar} className="lg:hidden mr-4 text-white">
                                        <MenuIcon className="w-6 h-6"/>
                                    </button>
                                    <h2 className="text-xl font-semibold">Sistem Informasi Klinik</h2>
                                </div>
                                {/* User Profile */}
                                <div className="flex items-center space-x-2">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#01449D] font-bold">
                                        {user.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:inline">{user.fullName}</span>
                                </div>
                            </header>
                            
                            {/* Main Content */}
                            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                                <ProtectedContent>
                                    {children}
                                </ProtectedContent>
                            </main>
                        </div>
                    </div>
                </SidebarContext.Provider>
            )}
        </AuthGuard>
    );
}