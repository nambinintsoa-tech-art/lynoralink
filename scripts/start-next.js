const { spawn } = require("node:child_process");
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.PORT || "3000";

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
