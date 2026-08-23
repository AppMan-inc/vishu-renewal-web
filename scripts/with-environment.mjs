#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import nextEnvironment from "@next/env";

const { processEnv } = nextEnvironment;

const environments = {
  dev: {
    siteUrl: "https://vishu-renewal-web.salon-vishu.workers.dev/",
    projectId: "salon-vishu2-dev-30830",
    authDomain: "salon-vishu2-dev-30830.firebaseapp.com",
    storageBucket: "salon-vishu2-dev-30830.firebasestorage.app",
    messagingSenderId: "229439602432",
  },
  prod: {
    siteUrl: "https://vishu-renewal-web.salon-vishu.workers.dev/",
    projectId: "salon-vishu",
    authDomain: "salon-vishu.firebaseapp.com",
    storageBucket: "salon-vishu.appspot.com",
    messagingSenderId: "689319200957",
  },
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const [environmentName, commandName, ...commandArguments] = process.argv.slice(2);

if (
  !Object.hasOwn(environments, environmentName) ||
  !["dev", "build", "start", "cloudflare-build"].includes(commandName)
) {
  printUsage();
  process.exit(64);
}

const environment = environments[environmentName];
const envFiles = [
  `.env.${environmentName}.local`,
  `.env.${environmentName}`,
]
  .map((path) => ({ path, absolutePath: join(projectRoot, path) }))
  .filter(({ absolutePath }) => existsSync(absolutePath))
  .map(({ path, absolutePath }) => ({
    path,
    contents: readFileSync(absolutePath, "utf8"),
    env: {},
  }));

if (envFiles.length > 0) {
  processEnv(envFiles, projectRoot, console, true);
  console.log(
    `Loaded ${envFiles.map(({ path }) => path).join(", ")} for ${environmentName}.`,
  );
}

setAndValidate("VISHU_ENV", environmentName);
setAndValidate("SITE_URL", environment.siteUrl);
setAndValidate(
  "VISHU_NEXT_MODE",
  commandName === "dev" ? "development" : "production",
);
setAndValidate("NEXT_PUBLIC_VISHU_ENV", environmentName);
setAndValidate("NEXT_PUBLIC_FIREBASE_PROJECT_ID", environment.projectId);
setAndValidate("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", environment.authDomain);
setAndValidate(
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  environment.storageBucket,
);
setAndValidate(
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  environment.messagingSenderId,
);
setAndValidate("FIREBASE_ADMIN_PROJECT_ID", environment.projectId);

const missingVariables = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
].filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
  console.error(
    `Missing required ${environmentName} environment variables: ${missingVariables.join(", ")}`,
  );
  console.error(
    `Copy .env.${environmentName}.example to .env.${environmentName}.local and fill in the Firebase Web app values.`,
  );
  process.exit(66);
}

const adminCredentialVariables = [
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];
const configuredAdminCredentials = adminCredentialVariables.filter(
  (name) => process.env[name]?.trim(),
);

if (
  configuredAdminCredentials.length > 0 &&
  configuredAdminCredentials.length !== adminCredentialVariables.length
) {
  console.error(
    "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY must be configured together.",
  );
  process.exit(66);
}

const isCloudflareBuild = commandName === "cloudflare-build";
const commandBinary = isCloudflareBuild
  ? join(
      projectRoot,
      "node_modules",
      "@opennextjs",
      "cloudflare",
      "dist",
      "cli",
      "index.js",
    )
  : join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const executableArguments = isCloudflareBuild
  ? ["build", ...commandArguments]
  : [commandName, ...commandArguments];
const result = spawnSync(
  process.execPath,
  [commandBinary, ...executableArguments],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function setAndValidate(name, expectedValue) {
  const configuredValue = process.env[name]?.trim();

  if (configuredValue && configuredValue !== expectedValue) {
    console.error(
      `${name} must be '${expectedValue}' for ${environmentName}, but '${configuredValue}' was provided.`,
    );
    process.exit(65);
  }

  process.env[name] = expectedValue;
}

function printUsage() {
  const scriptPath = relative(projectRoot, fileURLToPath(import.meta.url));
  console.error(
    `Usage: node ${scriptPath} <dev|prod> <dev|build|start|cloudflare-build> [arguments]`,
  );
}
