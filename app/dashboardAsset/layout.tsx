// File: app/dashboardAsset/layout.tsx

"use client";

// --- IMPORT BARU ---
import AuthGuard from './components/AuthGuard'; // <-- Pastikan path ini benar

// --- Import yang sudah ada ---
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useState, createContext, useContext } from "react";
import Link from "next/link";
import Image from "next/image";

// --- Kumpulan Ikon SVG (tidak berubah) ---
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> );
const AssetIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m12 14-4-2 4-2 4 2-4 2z"/><path d="M12 5v9"/></svg> );
const MaintenanceIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> );
const MasterDataIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 7V4h16v3"/><path d="M5 20h14"/><path d="M6 20v-8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V20"/><path d="M15 20v-8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V20"/></svg> );
const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> );
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg> );
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg> );


const SidebarContext = createContext({ 
    isSidebarOpen: false, 
    toggleSidebar: () => {},
    closeSidebar: () => {}
});
export const useSidebar = () => useContext(SidebarContext);

export default function DashboardAssetLayout({ children }: { children: React.ReactNode }) {
    // Kita masih butuh useAuth untuk data user di header dan fungsi logout
    const { user, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMasterDataOpen, setMasterDataOpen] = useState(false);
    
    // Pengecekan sesi & loading screen sekarang ditangani oleh AuthGuard
    // Jadi kita hapus useEffect dan `if (isLoading)` dari sini.

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        // Semua konten dibungkus oleh AuthGuard
        <AuthGuard>
            {/* Setelah AuthGuard selesai verifikasi, dia akan render children-nya.
              Kita tambahkan pengecekan `user` di sini untuk mencegah error render
              sebelum AuthContext siap menampilkan nama user di header.
            */}
            {user && (
                <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
                    <div className="flex h-screen bg-gray-100 font-sans">
                        
                        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:relative lg:translate-x-0`}>
                            <div className="flex items-center justify-center h-20 border-b px-4">
                                <Image src="/images/logo-klinik.png" alt="Logo Klinik" width={120} height={40} priority />
                            </div>
                            <nav className="flex-1 px-4 py-6 space-y-2">
                                <NavItem icon={<HomeIcon />} href="/dashboardAsset">Dashboard</NavItem>
                                <NavItem icon={<AssetIcon />} href="/dashboardAsset/list">Asset List</NavItem>
                                <NavItem icon={<MaintenanceIcon />} href="/dashboardAsset/maintenance">Maintenance</NavItem>
                                
                                <div>
                                    <button 
                                        onClick={() => setMasterDataOpen(!isMasterDataOpen)}
                                        className="w-full flex items-center justify-between px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <div className="flex items-center">
                                            <MasterDataIcon className="w-5 h-5 mr-3" />
                                            <span>Master Data</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isMasterDataOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                                            <SubNavItem href="/dashboardAsset/master-data">Lokasi Asset</SubNavItem>
                                            {user.role === 'SUPER_ADMIN' && (
                                                <SubNavItem href="/dashboardAsset/master-data/users">Manajemen Pengguna</SubNavItem>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </nav>
                            <div className="px-4 py-6 border-t">
                                <NavItem icon={<HomeIcon />} href="/dashboardMain">Back to Main</NavItem>
                                <button onClick={logout} className="w-full flex items-center px-4 py-2 mt-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <LogoutIcon className="w-5 h-5 mr-3"/><span>Log Out</span>
                                </button>
                            </div>
                        </aside>

                        <div className="flex-1 flex flex-col overflow-hidden">
                            <header className="flex items-center justify-between h-20 px-6 bg-[#01449D] text-white">
                                <div className="flex items-center">
                                    <button onClick={toggleSidebar} className="lg:hidden mr-4 text-white"><MenuIcon className="w-6 h-6"/></button>
                                    <h2 className="text-xl font-semibold">Asset Management</h2>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 cursor-pointer">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#01449D] font-bold">{user.fullName.charAt(0)}</div>
                                        <span>{user.fullName}</span> 
                                    </div>
                                </div>
                            </header>
                            <main className="flex-1 overflow-y-auto bg-gray-100 p-6">{children}</main>
                        </div>
                    </div>
                </SidebarContext.Provider>
            )}
        </AuthGuard>
    );
}

const NavItem = ({ icon, href, children }: { icon: React.ReactNode, href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    return (
        <Link 
            href={href} 
            onClick={closeSidebar}
            className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
            {icon && <span className="mr-3">{icon}</span>}
            {children}
        </Link>
    );
}

const SubNavItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const { closeSidebar } = useSidebar();
    return (
        <Link
            href={href}
            onClick={closeSidebar}
            className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
            {children}
        </Link>
    );
}

