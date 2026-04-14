const databaseUrl = process.env.DATABASE_URL?.trim();
const postgresUrl = process.env.POSTGRES_URL?.trim();
const appName = process.env.APP_NAME?.trim();
const dbVersion = process.env.DB_VERSION?.trim();

const checks = [
  {
    label: "Database URL",
    ok: Boolean(databaseUrl || postgresUrl),
    success: `Configured via ${databaseUrl ? "DATABASE_URL" : "POSTGRES_URL"}.`,
    failure: "Missing DATABASE_URL and POSTGRES_URL.",
  },
  {
    label: "APP_NAME",
    ok: Boolean(appName),
    success: `Configured as \"${appName}\".`,
    failure: "Missing APP_NAME.",
  },
  {
    label: "DB_VERSION",
    ok: Boolean(dbVersion),
    success: `Configured as \"${dbVersion}\".`,
    failure: "Missing DB_VERSION.",
  },
];

console.log("Deployment environment check");
console.log("");

for (const check of checks) {
  const status = check.ok ? "PASS" : "FAIL";
  const message = check.ok ? check.success : check.failure;
  console.log(`[${status}] ${check.label}: ${message}`);
}

const hasFailures = checks.some((check) => !check.ok);

if (hasFailures) {
  console.log("");
  console.log("One or more required deployment variables are missing.");
  process.exit(1);
}

console.log("");
console.log("Environment looks ready for Vercel configuration.");
