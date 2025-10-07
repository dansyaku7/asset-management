import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();

  console.log("Start seeding...");

  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN" },
  });

  const adminAccountingRole = await prisma.role.upsert({
    where: { name: "ACCOUNTING" },
    update: {},
    create: { name: "ACCOUNTING" },
  });

  const adminAdministrasiRole = await prisma.role.upsert({
    where: { name: "ADMINISTRASI" },
    update: {},
    create: { name: "ADMINISTRASI" },
  });

  const assetManajemenRole = await prisma.role.upsert({
    where: { name: "ASET_MANAJEMEN" },
    update: {},
    create: { name: "ASET_MANAJEMEN" },
  });

  console.log("Roles created/verified.");

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

  const hashedPasswordAccounting = await bcrypt.hash("accountingsimklinik", 10);
  await prisma.user.upsert({
    where: { email: "adminaccounting@simklinik.com" },
    update: {},
    create: {
      email: "adminaccounting@simklinik.com",
      fullName: "Admin Accounting",
      password: hashedPasswordAccounting,
      roleId: adminAccountingRole.id,
    },
  });
  console.log("Accounting Asset created.");

  const hashedPasswordAdministrasi = await bcrypt.hash(
    "administrasisimklinik",
    10
  );
  await prisma.user.upsert({
    where: { email: "adminadministrasi@simklinik.com" },
    update: {},
    create: {
      email: "adminadministrasi@simklinik.com",
      fullName: "Admin Administrasi",
      password: hashedPasswordAdministrasi,
      roleId: adminAdministrasiRole.id,
    },
  });
  console.log("Admin Administrasi created.");

  console.log("Seeding finished.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
