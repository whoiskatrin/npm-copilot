import { createLogger, format, transports } from "winston";

const logFormatter = format.printf((info) => {
  let { timestamp, level = "info", stack, message } = info;
  message = stack || message;
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  levels: { info: 0 },
  format: format.errors({ stack: true }),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple(),
        format.timestamp(),
        logFormatter
      ),
    }),
  ],
});

export default logger;
