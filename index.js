#!/usr/bin/env node

import { spawn } from "child_process";
import logger from "./src/logger.js";
import { handleErrors } from "./src/error-analyzer.js";

const command = process.argv[2] || "dev";
const nextProcess = spawn("npm", ["run", command]);

nextProcess.stdout.pipe(logger);

logger.on("data", (data) => {
  handleErrors(data);
});

nextProcess.on("exit", () => {
  logger.end();
});

process.on("SIGINT", () => {
  nextProcess.kill("SIGINT");
  logger.end();
  process.exit();
});
