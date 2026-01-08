import { 
  PrismaClient, 
  AccountCategory, 
  PaymentAccountMapping 
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // ==========================================
  // 1. BUAT MASTER PERMISSIONS
  // ==========================================
  console.log("Creating permissions...");
  const permissionsData = [
    // General
    { action: 'view_dashboard', description: 'Dapat melihat dashboard kinerja utama' },
    
    // RME & Appointments
    { action: 'manage_appointments', description: 'Dapat mengelola antrean & janji temu' },
    { action: 'create_rme', description: 'Dapat membuat dan mengedit Rekam Medis Elektronik' },
    { action: 'view_rme_history', description: 'Dapat melihat riwayat rekam medis pasien' },

    // Laboratorium & Radiologi
    { action: 'access_lab_workbench', description: 'Dapat mengakses meja kerja lab untuk input hasil' },
    { action: 'validate_lab_results', description: 'Dapat memvalidasi hasil lab yang sudah diinput' },

    // Kasir
    { action: 'access_cashier', description: 'Dapat mengakses halaman kasir dan memproses pembayaran' },

    // Master Data
    { action: 'manage_patients', description: 'Dapat mengelola data master pasien' },
    { action: 'manage_staff', description: 'Dapat mengelola data master staff & dokter' },
    { action: 'manage_drugs', description: 'Dapat mengelola data master obat dan stok' },
    { action: 'manage_services', description: 'Dapat mengelola data master jasa & layanan (termasuk lab)' },
    
    // Manajemen & RBAC
    { action: 'manage_users', description: 'Dapat mengelola user (tambah, edit, hapus)' },
    { action: 'manage_roles', description: 'Dapat mengelola role dan hak aksesnya' },
    
    // Akuntansi
    { action: 'view_financial_reports', description: 'Dapat melihat laporan keuangan (Laba Rugi, Neraca)' },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }
  console.log("Permissions created/verified.");


  // ==========================================
  // 2. BUAT ROLES (Balik ke gaya lama lu)
  // ==========================================
  console.log("Creating roles...");
  
  const superAdminRole = await prisma.role.upsert({ where: { name: "SUPER_ADMIN" }, update: {}, create: { name: "SUPER_ADMIN" } });
  
  // Role Target (Yang mau diisi permissionnya)
  const doctorRole = await prisma.role.upsert({ where: { name: "DOKTER" }, update: {}, create: { name: "DOKTER" } });
  const kasirRole = await prisma.role.upsert({ where: { name: "KASIR" }, update: {}, create: { name: "KASIR" } });
  const analisLabRole = await prisma.role.upsert({ where: { name: "ANALIS_LAB" }, update: {}, create: { name: "ANALIS_LAB" } });

  // Role Sisa (Cuma create doang, permission kosong/nanti)
  await prisma.role.upsert({ where: { name: "ADMIN" }, update: {}, create: { name: "ADMIN" } });
  await prisma.role.upsert({ where: { name: "ASET_MANAJEMEN" }, update: {}, create: { name: "ASET_MANAJEMEN" } });
  await prisma.role.upsert({ where: { name: "ACCOUNTING" }, update: {}, create: { name: "ACCOUNTING" } });
  
  console.log("Roles created/verified.");


  // ==========================================
  // 3. HUBUNGKAN ROLE & PERMISSIONS
  // ==========================================
  
  // --- A. SUPER ADMIN (Logika Lama: Dapet SEMUA) ---
  console.log("Connecting SUPER_ADMIN to all permissions...");
  const allPermissions = await prisma.permission.findMany({ select: { id: true } });

  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map(p => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    }))
  });
  console.log("SUPER_ADMIN has been granted all permissions.");


  // --- B. ROLE SPESIFIK (Logika Baru: Dapet SESUAI JOBDESC) ---
  console.log("Assigning specific permissions to DOKTER, KASIR, ANALIS_LAB...");

  const specificRoles = [
    {
      roleId: doctorRole.id,
      roleName: "DOKTER",
      actions: ['view_dashboard', 'manage_appointments', 'create_rme', 'view_rme_history', 'manage_patients']
    },
    {
      roleId: kasirRole.id,
      roleName: "KASIR",
      actions: ['view_dashboard', 'access_cashier', 'manage_patients', 'manage_appointments']
    },
    {
      roleId: analisLabRole.id,
      roleName: "ANALIS_LAB",
      actions: ['view_dashboard', 'access_lab_workbench', 'validate_lab_results']
    }
  ];

  for (const item of specificRoles) {
    // 1. Cari ID permission yang sesuai
    const perms = await prisma.permission.findMany({
      where: { action: { in: item.actions } },
      select: { id: true }
    });

    // 2. Hapus permission lama (biar bersih)
    await prisma.rolePermission.deleteMany({ where: { roleId: item.roleId } });

    // 3. Insert permission baru
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map(p => ({
          roleId: item.roleId,
          permissionId: p.id
        }))
      });
      console.log(`Role ${item.roleName} granted ${perms.length} permissions.`);
    }
  }


  // ==========================================
  // 4. BUAT USERS (Logika Lama)
  // ==========================================
  console.log("Creating users...");
  const hashedPasswordSuperAdmin = await bcrypt.hash("superadminsimklinik", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@simklinik.com" },
    update: { roleId: superAdminRole.id },
    create: {
      email: "superadmin@simklinik.com",
      fullName: "Super Admin",
      password: hashedPasswordSuperAdmin,
      roleId: superAdminRole.id,
    },
  });
  console.log("Super Admin user created/updated.");


  // ==========================================
  // 5. BUAT CHART OF ACCOUNTS (COA) - OPSI B (Lengkap)
  // ==========================================
  console.log("Creating Chart of Accounts...");

  const coaData = [
    // --- ASSET (1xxx) ---
    {
      accountCode: '1001',
      accountName: 'Kas/Bank Penerimaan',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.CASH_RECEIPT
    },
    {
      accountCode: '1002',
      accountName: 'Bank Operasional',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.NONE
    },
    {
      accountCode: '1101',
      accountName: 'Piutang Usaha (Asuransi/BPJS)',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.ACCOUNTS_RECEIVABLE
    },
    {
      accountCode: '1201',
      accountName: 'Persediaan Obat',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.INVENTORY_ASSET
    },
    {
      accountCode: '1301',
      accountName: 'Aset Tetap (Peralatan)',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.FIXED_ASSET
    },
    {
      accountCode: '1302',
      accountName: 'Akumulasi Penyusutan',
      category: AccountCategory.ASSET,
      paymentMapping: PaymentAccountMapping.ACCUMULATED_DEPRECIATION
    },

    // --- LIABILITY (2xxx) ---
    {
      accountCode: '2101',
      accountName: 'Hutang Usaha',
      category: AccountCategory.LIABILITY,
      paymentMapping: PaymentAccountMapping.ACCOUNTS_PAYABLE
    },
    {
      accountCode: '2102',
      accountName: 'Hutang Gaji',
      category: AccountCategory.LIABILITY,
      paymentMapping: PaymentAccountMapping.SALARY_PAYABLE
    },

    // --- EQUITY (3xxx) ---
    {
      accountCode: '3101',
      accountName: 'Modal Pemilik',
      category: AccountCategory.EQUITY,
      paymentMapping: PaymentAccountMapping.NONE
    },
    {
      accountCode: '3201',
      accountName: 'Laba Ditahan',
      category: AccountCategory.EQUITY,
      paymentMapping: PaymentAccountMapping.NONE
    },

    // --- REVENUE (4xxx) ---
    {
      accountCode: '4101',
      accountName: 'Pendapatan Jasa Medis',
      category: AccountCategory.REVENUE,
      paymentMapping: PaymentAccountMapping.SERVICE_REVENUE
    },
    {
      accountCode: '4102',
      accountName: 'Pendapatan Obat',
      category: AccountCategory.REVENUE,
      paymentMapping: PaymentAccountMapping.DRUG_REVENUE
    },

    // --- EXPENSE (5xxx) ---
    {
      accountCode: '5101',
      accountName: 'Beban Pokok Pendapatan (HPP)',
      category: AccountCategory.EXPENSE,
      paymentMapping: PaymentAccountMapping.COGS_EXPENSE
    },
    {
      accountCode: '5201',
      accountName: 'Beban Gaji',
      category: AccountCategory.EXPENSE,
      paymentMapping: PaymentAccountMapping.SALARY_EXPENSE
    },
    {
      accountCode: '5202',
      accountName: 'Beban Penyusutan',
      category: AccountCategory.EXPENSE,
      paymentMapping: PaymentAccountMapping.DEPRECIATION_EXPENSE
    },
    {
      accountCode: '5901',
      accountName: 'Kerugian Pelepasan Aset',
      category: AccountCategory.EXPENSE,
      paymentMapping: PaymentAccountMapping.ASSET_DISPOSAL_LOSS
    }
  ];

  for (const acc of coaData) {
    await prisma.chartOfAccount.upsert({
      where: { accountCode: acc.accountCode },
      update: {
        accountName: acc.accountName,
        category: acc.category,
        paymentMapping: acc.paymentMapping,
      },
      create: acc,
    });
  }
  console.log(`Chart of Accounts created/verified (${coaData.length} accounts).`);

  console.log("Seeding finished.");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });