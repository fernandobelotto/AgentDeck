import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.agentdeck.plugin.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        module: "ESNext",
        moduleResolution: "bundler"
      }
    }),
    nodeResolve({
      preferBuiltins: true
    }),
    commonjs()
  ],
  external: ["http", "https", "net", "tls", "url", "stream", "crypto", "buffer", "events", "util", "child_process", "os", "path", "fs"]
};
