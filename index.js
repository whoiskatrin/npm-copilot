#!/usr/bin/env node

import { spawn } from "child_process";
import logger from "./src/logger.js";
import { handleErrors } from "./src/error-analyzer.js";

const command = process.argv.slice(2);
const childProcess = spawn("npm", ["run", "dev"], {
  stdio: ["pipe", "pipe", "pipe"],
});

childProcess.stdout.pipe(process.stdout);
childProcess.stderr.pipe(process.stderr);

logger.on("data", async (data) => {
  try {
    const suggestion = await handleErrors(data.toString());
    if (suggestion) {
      console.log(suggestion);
    }
  } catch (error) {
    logger.error(error.message);
  }
});

childProcess.on("exit", () => {
  logger.end();
});

childProcess.stderr.on("data", (data) => {
  logger.error(data.toString());
});

childProcess.stdout.on("data", (data) => {
  logger.error(data.toString());
});
