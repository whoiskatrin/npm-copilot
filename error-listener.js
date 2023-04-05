#!/usr/bin/env node

import { spawn } from "child_process";
import { handleErrors } from "./src/error-analyzer.js";
import chalk from "chalk";

const command = process.argv.slice(2);
const childProcess = spawn("npm", ["run", "dev"], {
  stdio: ["pipe", "pipe", "pipe"],
});

childProcess.stdout.pipe(process.stdout);
childProcess.stderr.pipe(process.stderr);

const colors = {
  ready: "\u001b[32m",
  event: "\u001b[34m",
  warn: "\u001b[33m",
  wait: "\u001b[36m",
  error: "\u001b[31m",
};

childProcess.stderr.on("data", async (data) => {
  const errorMsg = data.toString();
  const suggestion = await handleErrors(errorMsg);
  if (suggestion) {
    console.log(chalk.greenBright("Suggested fix:"));
    console.log(suggestion);
  } else {
    const logType = errorMsg.match(/^\w+/);
    console.log(colors[logType] + errorMsg + "\x1b[0m");
  }
});

childProcess.stdout.on("data", async (data) => {
  const errorMsg = data.toString();
  const suggestion = await handleErrors(errorMsg);
  if (suggestion) {
    console.log(chalk.greenBright("Suggested fix:"));
    console.log(suggestion);
  } else {
    const logType = errorMsg.match(/^\w+/);
    console.log(colors[logType] + errorMsg + "\x1b[0m");
  }
});

childProcess.on("exit", () => {
  console.log("Next.js process exited.");
});
