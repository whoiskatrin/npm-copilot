#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { handleErrors } from "./src/error-analyzer.js";
import chalk from "chalk";
import dotenv from "universal-dotenv";

dotenv.init();

async function getProjectType() {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  try {
    const packageJsonData = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonData);

    const deps = packageJson.dependencies ?? {};
    const devDeps = packageJson.devDependencies ?? {};

    if (deps.next) {
      return "next";
    } else if (deps["react-scripts"] || devDeps["react-scripts"]) {
      return "react";
    } else if (deps["@angular/cli"] || devDeps["@angular/cli"]) {
      return "angular";
    } else if (deps["@vue/cli-service"] || devDeps["@vue/cli-service"]) {
      return "vue";
    } else {
      return null;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("Error: package.json not found in the current directory.");
    } else {
      console.error("Error reading package.json:", error);
    }
    return null;
  }
}

async function getPackageManager() {
  const yarnLockPath = path.join(process.cwd(), "yarn.lock");
  const pnpmLockPath = path.join(process.cwd(), "pnpm-lock.yaml");

  try {
    await fs.access(yarnLockPath, fs.constants.F_OK);
    return "yarn";
  } catch (error) {
    try {
      await fs.access(pnpmLockPath, fs.constants.F_OK);
      return "pnpm";
    } catch (error) {
      return "npm";
    }
  }
}

(async () => {
  // Validations
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.error(
      chalk.yellow(
        '\nError: "OPENAI_API_KEY" environment variable is not set! Please set it in your .env file.\n'
      )
    );
    process.exit(1);
  }

  const projectType = await getProjectType();
  const devCommandMap = {
    next: "dev",
    react: "start",
    angular: "serve",
    vue: "serve",
  };
  const devCommand = devCommandMap[projectType];

  if (!devCommand) {
    console.error("Error: Unsupported project type.");
    process.exit(1);
  }

  const packageManager = await getPackageManager();
  const childProcess = spawn(packageManager, ["run", devCommand], {
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
    try {
      const suggestion = await handleErrors(
        errorMsg,
        projectType,
        openaiApiKey
      ); // something isn't working well here
      if (suggestion) {
        console.log(chalk.yellowBright("Issue:"));
        console.log(suggestion.description);
        console.log(chalk.greenBright("Suggested fix:"));
        console.log(suggestion.fix);
      }
    } catch (error) {
      console.error("Error fetching suggestion:", error.message);
    }
  });

  childProcess.on("exit", () => {
    console.log("Development server process exited.");
  });
})();
