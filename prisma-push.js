process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();

const { execSync } = require("child_process");

try {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
  });
} catch (e) {
  process.exit(1);
}
