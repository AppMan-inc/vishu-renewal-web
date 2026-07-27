import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const functionsRoot = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(functionsRoot, "src/index.ts")],
  outfile: resolve(functionsRoot, "lib/index.js"),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  sourcemap: true,
  packages: "external",
  plugins: [
    {
      name: "vishu-server-aliases",
      setup(context) {
        context.onResolve(
          { filter: /^@\/lib\/firebase\/admin$/ },
          () => ({ path: resolve(functionsRoot, "src/firebase-admin-adapter.ts") }),
        );
        context.onResolve(
          { filter: /^server-only$/ },
          () => ({ path: resolve(functionsRoot, "src/server-only.ts") }),
        );
      },
    },
  ],
});
