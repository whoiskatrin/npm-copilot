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

errorLogger.on("data", async (data) => {
  try {
    const suggestion = await handleErrors(data);
    if (suggestion) {
      console.log(suggestion);
    }
  } catch (error) {
    errorLogger.error(error.message);
  }
});

childProcess.on("exit", () => {
  errorLogger.end();
});

childProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

childProcess.stdout.on("data", (data) => {
  console.log(data.toString());
});
