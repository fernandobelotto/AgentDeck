import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  external: [
    "http",
    "https",
    "net",
    "tls",
    "url",
    "stream",
    "crypto",
    "buffer",
    "events",
    "util",
    "child_process",
    "os",
    "path",
    "fs",
  ],
  input: "src/plugin.ts",
  output: {
    file: "com.agentdeck.plugin.sdPlugin/bin/plugin.js",
    format: "cjs",
    inlineDynamicImports: true,
    sourcemap: true,
  },
  plugins: [
    typescript({
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        module: "ESNext",
        moduleResolution: "bundler",
      },
      tsconfig: "./tsconfig.json",
    }),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
  ],
};
