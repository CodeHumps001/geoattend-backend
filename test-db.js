process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.DATABASE_URL =
  "postgresql://postgres.ygddolpondgwvmihfrrr:geoattend12a@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["error", "warn", "info", "query"],
});

prisma
  .$connect()
  .then(() => {
    console.log("✅ Connected!");
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.log("❌ Failed:", e.message);
    process.exit(1);
  });
