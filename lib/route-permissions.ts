// File: lib/route-permissions.ts
// Ini adalah "buku catatan" pusat untuk satpam aplikasi kita.
// Daftarkan semua halaman yang perlu dilindungi di sini.

export const routePermissions: { [key: string]: string } = {
    // --- Operasional ---
    '/dashboardSimKlinik/[branchId]/dashboard': 'view_dashboard',
    '/dashboardSimKlinik/[branchId]/appointments': 'manage_appointments',
    '/dashboardSimKlinik/[branchId]/cashier': 'access_cashier',
    '/dashboardSimKlinik/[branchId]/lab': 'access_lab_workbench',
    '/dashboardSimKlinik/[branchId]/lab/validation': 'validate_lab_results',
    
    // --- Master Data ---
    '/dashboardSimKlinik/master-data/roles': 'manage_roles',
    '/dashboardSimKlinik/master-data/patients': 'manage_patients',
    '/dashboardSimKlinik/master-data/staff': 'manage_staff',
    '/dashboardSimKlinik/master-data/doctors': 'manage_staff', // Gabung dengan staff
    '/dashboardSimKlinik/master-data/drugs': 'manage_drugs',
    '/dashboardSimKlinik/master-data/suppliers': 'manage_drugs',
    '/dashboardSimKlinik/master-data/drug-stock': 'manage_drugs',
    '/dashboardSimKlinik/master-data/services': 'manage_services',
    '/dashboardSimKlinik/master-data/lab-services': 'manage_services',
    '/dashboardSimKlinik/master-data/lab-parameters': 'manage_services',

    // Tambahkan halaman lain di sini jika perlu
};
