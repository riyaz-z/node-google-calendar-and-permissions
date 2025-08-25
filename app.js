require("dotenv").config();
const express = require("express");
const winston = require("winston");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// Logger configuration
const winstonlogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log" }),
  ],
});

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Database connection
const { getConnection } = require("./lib/connection");

// Middleware
app.use(express.json());

// Serve static files
app.use(express.static("public"));

// Routes
const calendarRouter = require("./routes/calendar");
const permissionsRouter = require("./routes/permissions");
app.use("/calendar", calendarRouter);
app.use("/permissions", permissionsRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send("API RUNNING");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 404 Error Handling
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// General Error Handling
app.use((err, req, res, next) => {
  winstonlogger.error(err.message, err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  getConnection((err, client) => {
    if (err) {
      winstonlogger.error("Database connection failed", err);
      return;
    }
    console.log("Database connected successfully");
    client.release();
  });
});

module.exports = app;
