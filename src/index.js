#!/usr/bin/env node

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import yargs from "yargs-parser";
import { handleErrors } from "./src/cli.js";

const argv = yargs(process.argv.slice(2));

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;

async function main() {
  const filePath = String(argv._[0]); // make sure to cast to string, you idiot
  console.log(`Reading code from file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileExtension = path.extname(filePath);

  if (fileExtension !== ".js" && fileExtension !== ".ts") {
    console.error(`Invalid file type: ${fileExtension}`);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, "utf-8");

  try {
    eval(`(function() { ${code} })()`);
  } catch (error) {
    await handleErrors(error, code, filePath);
  }
}

main();
