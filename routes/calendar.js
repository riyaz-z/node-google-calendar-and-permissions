const express = require("express");
const router = express.Router();
const calendarController = require("../model/calendar");
const winston = require("winston");

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

const result_failure = "Failure";

router.get("/auth", (req, res) => {
  const url = req.originalUrl;
  const params = req.query;
  try {
    winstonlogger.info(JSON.stringify({ url, params }));
    calendarController.getAuthUrl((error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.redirect(result.data);
      }
    });
  } catch (err) {
    const errorMsg = { url, params, error_msg: err.message };
    winstonlogger.error(JSON.stringify(errorMsg));
    res
      .status(400)
      .json({ result: result_failure, code: 400, message: err.message });
  }
});

router.get("/oauth2callback", (req, res) => {
  const url = req.originalUrl;
  const params = req.query;
  winstonlogger.info(JSON.stringify({ url, params }));
  try {
    if (!req.query.code) {
      throw new Error("No authorization code provided");
    }
    calendarController.handleOAuthCallback(req.query.code, (error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    const errorMsg = { url, params, error_msg: err.message };
    winstonlogger.error(JSON.stringify(errorMsg));
    res
      .status(400)
      .json({ result: result_failure, code: 400, message: err.message });
  }
});

router.post("/sync", (req, res) => {
  const url = req.originalUrl;
  const params = req.body;
  try {
    winstonlogger.info(JSON.stringify({ url, params, data: params }));
    calendarController.syncEvents(req.body, (error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    const errorMsg = { url, params, error_msg: err.message };
    winstonlogger.error(JSON.stringify(errorMsg));
    res
      .status(400)
      .json({ result: result_failure, code: 400, message: err.message });
  }
});

module.exports = router;
