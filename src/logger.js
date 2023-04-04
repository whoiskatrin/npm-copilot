import winston from "winston";

const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    trace: 5,
  },
  transports: [
    new winston.transports.Console({
      level: "trace",
    }),
  ],
});

export default logger;
