import winston from "winston";

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  transports: [new winston.transports.Console()],
});

export default logger;
