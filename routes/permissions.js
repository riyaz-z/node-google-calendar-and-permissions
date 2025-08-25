const express = require("express");
const router = express.Router();
const permissionsController = require("../model/permissions");
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
router.get("/roles", (req, res) => {
  try {
    winstonlogger.info("Fetching all roles");
    permissionsController.getRoles((error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    winstonlogger.error(`Roles fetch error: ${err.message}`, err);
    res.status(400).json({
      result: result_failure,
      code: 400,
      message: err.message,
    });
  }
});
router.get("/users", (req, res) => {
  try {
    winstonlogger.info("Fetching all users");
    permissionsController.getUsers((error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    winstonlogger.error(`Users fetch error: ${err.message}`, err);
    res.status(400).json({
      result: result_failure,
      code: 400,
      message: err.message,
    });
  }
});

router.post("/login", (req, res) => {
  const { email } = req.body;
  try {
    winstonlogger.info(`Login attempt for ${email}`);
    permissionsController.login(email, (error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    winstonlogger.error(`Login error: ${err.message}`, err);
    res.status(400).json({
      result: result_failure,
      code: 400,
      message: err.message,
    });
  }
});

router.get("/:email", (req, res) => {
  const { email } = req.params;
  try {
    winstonlogger.info(`Fetching permissions for ${email}`);
    permissionsController.getPermissions(email, (error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    winstonlogger.error(`Permissions error: ${err.message}`, err);
    res.status(400).json({
      result: result_failure,
      code: 400,
      message: err.message,
    });
  }
});

router.post("/map-user-role", (req, res) => {
  const { email, role_fk } = req.body;
  try {
    winstonlogger.info(`Mapping user ${email} to role ${role_fk}`);
    permissionsController.mapUserRole(email, role_fk, (error, result) => {
      if (error) {
        res.status(error.code || 400).json({ data: error });
      } else {
        res.status(result.code).json({ data: result });
      }
    });
  } catch (err) {
    winstonlogger.error(`User-role mapping error: ${err.message}`, err);
    res.status(400).json({
      result: result_failure,
      code: 400,
      message: err.message,
    });
  }
});

module.exports = router;
