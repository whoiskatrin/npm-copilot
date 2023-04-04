#!/usr/bin/env node

import { spawn } from "child_process";
import logger from "./src/logger.js";
import { handleErrors } from "./src/error-analyzer.js";

const command = process.argv.slice(2);
const childProcess = spawn(command[0], command.slice(1), {
  stdio: ["pipe", "pipe", "pipe"],
});

childProcess.stdout.pipe(process.stdout);
childProcess.stderr.pipe(process.stderr);

const errorLogger = logger("error");

childProcess.stderr.on("data", async (data) => {
  const errorMessage = data.toString();
  errorLogger(errorMessage);
  const suggestion = await handleErrors(errorMessage);
  if (suggestion) {
    console.log(suggestion);
  }
});

childProcess.on("exit", () => {
  errorLogger.end();
});

process.on("SIGINT", () => {
  childProcess.kill("SIGINT");
  errorLogger.end();
  process.exit();
});
