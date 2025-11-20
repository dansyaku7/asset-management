"use client";

import AuthGuard from './components/AuthGuard';
import RoleGuard from './components/RoleGuard';
import { useAuth } from "@/components/AuthContext";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';

// --- Kumpulan Ikon SVG ---
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> );
const AssetIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m12 14-4-2 4-2 4 2-4 2z"/><path d="M12 5v9"/></svg> );
const MaintenanceIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> );
const MasterDataIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 7V4h16v3"/><path d="M5 20h14"/><path d="M6 20v-8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V20"/><path d="M15 20v-8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V20"/></svg> );
const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> );
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg> );
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg> );
const BackIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

// --- PERUBAHAN: Icon-icon baru untuk Sub-Menu ---
const LokasiIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> );
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> );


const SidebarContext = createContext({ 
    isSidebarOpen: false, 
    toggleSidebar: () => {},
    closeSidebar: () => {}
});
export const useSidebar = () => useContext(SidebarContext);

export default function DashboardAssetLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <RoleGuard allowedRoles={['ASET_MANAJEMEN']}>
                <LayoutContent>{children}</LayoutContent>
            </RoleGuard>
        </AuthGuard>
    );
}

// Komponen Internal
function LayoutContent({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMasterDataOpen, setMasterDataOpen] = useState(false);
    
    const pathname = usePathname();
    const isMasterActive = pathname.startsWith('/dashboardAsset/master-data');

    useEffect(() => {
        if (isMasterActive) {
            setMasterDataOpen(true);
        }
    }, [isMasterActive]);
    
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <>
            {user && (
                <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
                    <div className="flex h-screen bg-gray-100 font-sans">
                        
                        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:relative lg:translate-x-0 flex flex-col`}>
                            {/* Logo */}
                            <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4">
                                <Image src="/images/logo-klinik.png" alt="Logo Klinik" width={120} height={40} priority />
                            </div>

                            {/* Navigasi Utama */}
                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                <NavItem icon={<HomeIcon className="w-5 h-5"/>} href="/dashboardAsset">Dashboard</NavItem>
                                <NavItem icon={<AssetIcon className="w-5 h-5"/>} href="/dashboardAsset/list">Asset List</NavItem>
                                <NavItem icon={<MaintenanceIcon className="w-5 h-5"/>} href="/dashboardAsset/maintenance">Maintenance</NavItem>
                                
                                {/* Dropdown Master Data */}
                                <div>
                                    <button 
                                        onClick={() => setMasterDataOpen(!isMasterDataOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-2 font-medium hover:bg-gray-100 rounded-lg transition-colors ${isMasterActive ? 'text-[#01449D]' : 'text-gray-700'}`}
                                    >
                                        <div className="flex items-center">
                                            <MasterDataIcon className={`w-5 h-5 mr-3 ${isMasterActive ? 'text-[#01449D]' : 'text-gray-500'}`} />
                                            <span>Master Data</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {/* --- PERUBAHAN: Icon ditambah di SubNavItem --- */}
                                    {isMasterDataOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                                            <SubNavItem icon={<LokasiIcon className="w-4 h-4" />} href="/dashboardAsset/master-data">Lokasi Asset</SubNavItem>
                                            {user.role === 'SUPER_ADMIN' && (
                                                <SubNavItem icon={<UsersIcon className="w-4 h-4" />} href="/dashboardAsset/master-data/users">Manajemen Pengguna</SubNavItem>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </nav>

                            {/* Footer Sidebar */}
                            <div className="px-4 py-6 border-t border-gray-200">
                                <NavItem icon={<BackIcon className="w-5 h-5" />} href="/dashboardMain">Back to Main</NavItem>
                                <button onClick={logout} className="w-full flex items-center px-4 py-2 mt-2 text-gray-700 font-medium hover:bg-gray-100 hover:text-red-600 rounded-lg transition-colors">
                                    <LogoutIcon className="w-5 h-5 mr-3 text-gray-500"/>
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </aside>

                        {/* Konten Utama */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header (Biru) */}
                            <header className="flex items-center justify-between h-20 px-6 bg-[#01449D] text-white">
                                <div className="flex items-center">
                                    <button onClick={toggleSidebar} className="lg:hidden mr-4 text-white">
                                        <MenuIcon className="w-6 h-6"/>
                                    </button>
                                    <h2 className="text-xl font-semibold">Asset Management</h2>
                                </div>
                                {/* User Profile */}
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 cursor-pointer">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#01449D] font-bold">
                                            {user.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{user.fullName}</span> 
                                    </div>
                                </div>
                            </header>
                            
                            {/* Main Content */}
                            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">{children}</main>
                        </div>

                        {/* Backdrop overlay di HP */}
                        {isSidebarOpen && (
                            <div 
                                onClick={closeSidebar} 
                                className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                                aria-hidden="true"
                            ></div>
                        )}
                    </div>
                </SidebarContext.Provider>
            )}
        </>
    );
}

// Komponen NavItem (Sudah benar)
const NavItem = ({ icon, href, children }: { icon: React.ReactNode, href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link 
            href={href} 
            passHref
            legacyBehavior
        >
            <a
                onClick={closeSidebar}
                className={`flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${
                    isActive 
                        ? 'bg-blue-100 text-[#01449D]' // Style active
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#01449D]' // Style normal
                }`}
            >
                {icon && <span className={`mr-3 ${isActive ? 'text-[#01449D]' : 'text-gray-500'}`}>{icon}</span>}
                <span>{children}</span>
            </a>
        </Link>
    );
}

// --- PERUBAHAN: SubNavItem di-update biar bisa nampilin icon ---
const SubNavItem = ({ icon, href, children }: { icon?: React.ReactNode, href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            passHref
            legacyBehavior
        >
            <a
                onClick={closeSidebar}
                className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${ // <- Tambah 'flex items-center'
                    isActive 
                        ? 'bg-blue-100 text-[#01449D] font-medium' // Style active
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#01449D]' // Style normal
                }`}
            >
                {/* --- TAMBAHAN: Logika nampilin icon --- */}
                {icon && <span className={`mr-2 w-4 ${isActive ? 'text-[#01449D]' : 'text-gray-500'}`}>{icon}</span>}
                <span>{children}</span>
            </a>
        </Link>
    );
}