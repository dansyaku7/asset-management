import { PrismaClient } from "@prisma/client";
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
    
    // Akuntansi (Opsional, untuk masa depan)
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
  // 2. BUAT ROLES
  // ==========================================
  console.log("Creating roles...");
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN" },
  });

  // Tambahkan role-role lain sesuai kebutuhan
  const doctorRole = await prisma.role.upsert({ where: { name: "DOKTER" }, update: {}, create: { name: "DOKTER" } });
  const kasirRole = await prisma.role.upsert({ where: { name: "KASIR" }, update: {}, create: { name: "KASIR" } });
  const analisLabRole = await prisma.role.upsert({ where: { name: "ANALIS_LAB" }, update: {}, create: { name: "ANALIS_LAB" } });
  const adminRole = await prisma.role.upsert({ where: { name: "ADMIN" }, update: {}, create: { name: "ADMIN" } });
  const asetRole = await prisma.role.upsert({ where: { name: "ASET_MANAJEMEN" }, update: {}, create: { name: "ASET_MANAJEMEN" } });
  const accountingRole = await prisma.role.upsert({ where: { name: "ACCOUNTING" }, update: {}, create: { name: "ACCOUNTING" } });
  
  
  console.log("Roles created/verified.");


  // ==========================================
  // 3. HUBUNGKAN ROLE & PERMISSIONS
  // ==========================================
  console.log("Connecting SUPER_ADMIN to all permissions...");
  const allPermissions = await prisma.permission.findMany({
    select: { id: true }
  });

  // Hapus koneksi lama dulu untuk memastikan kebersihan data
  await prisma.rolePermission.deleteMany({
    where: { roleId: superAdminRole.id }
  });

  // Buat koneksi baru
  await prisma.rolePermission.createMany({
    data: allPermissions.map(p => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    }))
  });
  console.log("SUPER_ADMIN has been granted all permissions.");
  
  // (Opsional) Contoh: Beri hak akses spesifik untuk Dokter
  // const doctorPermissions = await prisma.permission.findMany({
  //   where: { action: { in: ['create_rme', 'view_rme_history', 'validate_lab_results'] } }
  // });
  // await prisma.rolePermission.deleteMany({ where: { roleId: doctorRole.id } });
  // await prisma.rolePermission.createMany({
  //   data: doctorPermissions.map(p => ({ roleId: doctorRole.id, permissionId: p.id }))
  // });
  // console.log("DOKTER role permissions set.");


  // ==========================================
  // 4. BUAT USERS
  // ==========================================
  console.log("Creating users...");
  const hashedPasswordSuperAdmin = await bcrypt.hash("superadminsimklinik", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@simklinik.com" },
    update: {
      roleId: superAdminRole.id,
    },
    create: {
      email: "superadmin@simklinik.com",
      fullName: "Super Admin",
      password: hashedPasswordSuperAdmin,
      roleId: superAdminRole.id,
    },
  });
  console.log("Super Admin user created/updated.");

  // Hapus user lama yang tidak kita pakai lagi untuk sementara
  // const usersToDelete = ["adminaccounting@simklinik.com", "adminadministrasi@simklinik.com"];
  // await prisma.user.deleteMany({
  //   where: { email: { in: usersToDelete } }
  // });

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