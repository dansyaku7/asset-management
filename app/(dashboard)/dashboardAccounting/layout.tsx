"use client";

import AuthGuard from '../dashboardAsset/components/AuthGuard'; // <-- Path mungkin perlu disesuaikan jika beda level
import RoleGuard from '../dashboardAsset/components/RoleGuard';   // <-- Path mungkin perlu disesuaikan jika beda level
import { useAuth } from "@/components/AuthContext";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';

// --- Icon SVG Baru (Meniru Lucide tapi pakai SVG) ---
const LayoutDashboardIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> );
const BookIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> );
const DatabaseIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> );
const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> );
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> );
const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> );
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg> );
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg> );
const BackIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
// Tambahan icon untuk sub-menu
const LedgerIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>);
const ProfitLossIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="20" x2="12" y2="4"/><path d="M4 20h16"/><line x1="20" y1="12" x2="4" y2="12"/><path d="M16 8l-4 4-4-4"/></svg>);
const BalanceSheetIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v18"/><path d="M4 12h16"/><path d="M18 17l-6 4-6-4"/><path d="M18 7l-6-4-6 4"/></svg>);
const CashFlowIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12h20"/><path d="M7 7l5 5 5-5"/><path d="M7 17l5-5 5 5"/></svg>);
const PayableIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="12" y1="18" y2="2"/><path d="M20 18H4v-8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8Z"/><path d="M17 14H7"/></svg>);
const CoaIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 3v4"/><path d="M16 3v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>);
const PayrollIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 18a1 1 0 0 1-1.45.9L12 16.5l-3.55 2.4A1 1 0 0 1 7 18V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12z"/><path d="M9 7h6"/><path d="M9 11h6"/></svg>);

const SidebarContext = createContext({ isSidebarOpen: false, toggleSidebar: () => {}, closeSidebar: () => {} });
export const useSidebar = () => useContext(SidebarContext);

export default function DashboardAccountingLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            {/* Ganti role di sini */}
            <RoleGuard allowedRoles={['ACCOUNTING']}> 
                <LayoutContent>{children}</LayoutContent>
            </RoleGuard>
        </AuthGuard>
    );
}

// Komponen Internal
function LayoutContent({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    // State untuk dropdowns
    const [isMasterDataOpen, setMasterDataOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false); // Default false
    const [isHrOpen, setIsHrOpen] = useState(false);         // Default false

    const pathname = usePathname();
    // Path untuk auto-open dropdowns
    const isReportsActive = pathname.startsWith('/dashboardAccounting/reports');
    const isHrActive = pathname.startsWith('/dashboardAccounting/hr') || pathname.startsWith('/dashboardAccounting/master-data/payroll-components');
    const isMasterAccountingActive = pathname.startsWith('/dashboardAccounting/master-data/coa');

    useEffect(() => {
        setIsReportsOpen(isReportsActive);
        setIsHrOpen(isHrActive);
        setMasterDataOpen(isMasterAccountingActive);
    }, [pathname, isReportsActive, isHrActive, isMasterAccountingActive]); // Update state saat path berubah
    
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    // Helper untuk toggle dropdown
    const toggleDropdown = (setter: React.Dispatch<React.SetStateAction<boolean>>) => setter(prev => !prev);

    return (
        <>
            {user && (
                <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
                    <div className="flex h-screen bg-gray-100 font-sans">
                        
                        {/* ===== Sidebar (Putih) ===== */}
                        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:relative lg:translate-x-0 flex flex-col`}>
                            {/* Logo */}
                            <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4 flex-shrink-0">
                                <Image src="/images/logo-klinik.png" alt="Logo Klinik" width={120} height={40} priority />
                            </div>

                            {/* Navigasi Utama */}
                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                <NavItem icon={<LayoutDashboardIcon className="w-5 h-5"/>} href="/dashboardAccounting">Dashboard</NavItem>
                                <NavItem icon={<BookIcon className="w-5 h-5"/>} href="/dashboardAccounting/journal">Jurnal Umum</NavItem>
                                
                                {/* Dropdown Laporan */}
                                <div>
                                    <button 
                                        onClick={() => toggleDropdown(setIsReportsOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-2 font-medium hover:bg-gray-100 rounded-lg transition-colors ${isReportsActive ? 'text-[#01449D]' : 'text-gray-700'}`}
                                    >
                                        <div className="flex items-center">
                                            <FileTextIcon className={`w-5 h-5 mr-3 ${isReportsActive ? 'text-[#01449D]' : 'text-gray-500'}`} />
                                            <span>Laporan</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isReportsOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                                            <SubNavItem icon={<LedgerIcon className="w-4 h-4" />} href="/dashboardAccounting/reports/general-ledger">Buku Besar</SubNavItem>
                                            <SubNavItem icon={<ProfitLossIcon className="w-4 h-4" />} href="/dashboardAccounting/reports/profit-loss">Laba Rugi</SubNavItem>
                                            <SubNavItem icon={<BalanceSheetIcon className="w-4 h-4" />} href="/dashboardAccounting/reports/balance-sheet">Neraca</SubNavItem>
                                            <SubNavItem icon={<CashFlowIcon className="w-4 h-4" />} href="/dashboardAccounting/reports/cash-flow">Arus Kas</SubNavItem>
                                            <SubNavItem icon={<PayableIcon className="w-4 h-4" />} href="/dashboardAccounting/reports/accounts-payable">Hutang Usaha</SubNavItem>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Dropdown SDM & Penggajian */}
                                <div>
                                    <button 
                                        onClick={() => toggleDropdown(setIsHrOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-2 font-medium hover:bg-gray-100 rounded-lg transition-colors ${isHrActive ? 'text-[#01449D]' : 'text-gray-700'}`}
                                    >
                                        <div className="flex items-center">
                                            <UsersIcon className={`w-5 h-5 mr-3 ${isHrActive ? 'text-[#01449D]' : 'text-gray-500'}`} />
                                            <span>SDM & Penggajian</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isHrOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isHrOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                                            <SubNavItem icon={<DatabaseIcon className="w-4 h-4" />} href="/dashboardAccounting/master-data/payroll-components">Master Komponen Gaji</SubNavItem>
                                            <SubNavItem icon={<PayrollIcon className="w-4 h-4" />} href="/dashboardAccounting/hr/salary-settings">Setting Gaji Karyawan</SubNavItem>
                                            <SubNavItem icon={<PayrollIcon className="w-4 h-4" />} href="/dashboardAccounting/hr/process-payroll">Proses Payroll ( Gaji )</SubNavItem>
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown Master Akuntansi */}
                                <div>
                                    <button 
                                        onClick={() => toggleDropdown(setMasterDataOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-2 font-medium hover:bg-gray-100 rounded-lg transition-colors ${isMasterAccountingActive ? 'text-[#01449D]' : 'text-gray-700'}`}
                                    >
                                        <div className="flex items-center">
                                            <DatabaseIcon className={`w-5 h-5 mr-3 ${isMasterAccountingActive ? 'text-[#01449D]' : 'text-gray-500'}`} />
                                            <span>Master Akuntansi</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isMasterDataOpen && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                                            <SubNavItem icon={<CoaIcon className="w-4 h-4" />} href="/dashboardAccounting/master-data/coa">Chart of Accounts</SubNavItem>
                                        </div>
                                    )}
                                </div>
                            </nav>
                            
                            {/* Footer Sidebar */}
                            <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0">
                                <NavItem icon={<BackIcon className="w-5 h-5"/>} href="/dashboardMain">Kembali ke Main</NavItem>
                                <button onClick={logout} className="w-full flex items-center px-4 py-2 mt-2 text-gray-700 font-medium hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                    <LogoutIcon className="w-5 h-5 mr-3 text-gray-500"/>
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </aside>

                        {/* Konten Utama */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header (Biru) */}
                            <header className="flex items-center justify-between h-20 px-6 bg-[#01449D] text-white flex-shrink-0">
                                <div className="flex items-center">
                                    <button onClick={toggleSidebar} className="lg:hidden mr-4 text-white">
                                        <MenuIcon className="w-6 h-6"/>
                                    </button>
                                    <h2 className="text-xl font-semibold">Akuntansi</h2>
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
    // Cek isActive jika href adalah root path dari section
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/')); 

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

// Komponen SubNavItem (Sudah benar)
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
                {icon && <span className={`mr-2 w-4 ${isActive ? 'text-[#01449D]' : 'text-gray-500'}`}>{icon}</span>}
                <span>{children}</span>
            </a>
        </Link>
    );
}