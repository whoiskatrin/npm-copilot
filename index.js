import { spawn } from "child_process";
import logger from "./logger.js";
import { handleErrors } from "./error-analyzer.js";

const nextProcess = spawn("npm", ["run", "dev"]);

nextProcess.stdout.pipe(logger);

logger.on("data", (data) => {
  if (data.includes("error")) {
    handleErrors(data);
  }
});
