#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from "child_process";
import { handleErrors } from "./src/error-analyzer.js";
import chalk from "chalk";

function getPackageManager() {
  try {
    fs.readFileSync(path.join(process.cwd(), 'yarn.lock'), 'utf8');
    return 'yarn';
  } catch (error) {
    try {
      fs.readFileSync(path.join(process.cwd(), 'pnpm-lock.yaml'), 'utf8');
      return 'pnpm';
    } catch (error) {
      return 'npm';
    }
  }
}

const command = process.argv.slice(2);
const packageManager = getPackageManager();
const childProcess = spawn(packageManager, ["run", "dev"], {
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

childProcess.stdout.on("data", (data) => {
  const logMsg = data.toString();
  const logType = logMsg.match(/^\w+/);
  console.log(colors[logType] + logMsg + "\x1b[0m");
});

childProcess.on("exit", () => {
  console.log("Next.js process exited.");
});
