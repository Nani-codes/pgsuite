import prisma from './src/config/db.js';
async function main() {
  const o = await prisma.owner.findFirst();
  console.log("OWNER_PHONE=" + o?.phone);
}
main().finally(() => process.exit(0));
