import { prisma } from "@hoobiq/db";

const FROM = process.argv[2];
const TO   = process.argv[3];

async function main() {
  if (!FROM || !TO) {
    console.error("Usage: tsx scripts/rename-user.ts <fromUsername> <toUsername>");
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { username: TO } });
  if (existing) {
    console.error(`Username "${TO}" sudah dipakai oleh user ${existing.id}.`);
    process.exit(2);
  }
  const target = await prisma.user.findUnique({ where: { username: FROM } });
  if (!target) {
    console.error(`User "${FROM}" tidak ditemukan.`);
    process.exit(3);
  }
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { username: TO },
    select: { id: true, username: true, name: true },
  });
  console.log(`OK: ${target.username} -> ${updated.username} (id=${updated.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
