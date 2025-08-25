const { getConnection } = require("../lib/connection");
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

const result_success = "Success";
const result_failure = "Failure";

const permissionsController = {
  getUsers: (callback) => {
    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in getUsers:", {
          error: err.message,
          stack: err.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 500,
            message: "Database connection error",
          },
          null
        );
      }
      try {
        const res = await client.query("SELECT user_name FROM users");
        client.release();
        callback(null, {
          result: result_success,
          code: 200,
          data: res.rows.map((row) => row.user_name),
        });
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error in getUsers:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Database error: ${dbError.message}`,
          },
          null
        );
      }
    });
  },

  login: (email, callback) => {
    if (!email) {
      return callback(
        { result: result_failure, code: 400, message: "Email is required" },
        null
      );
    }
    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in login:", {
          error: err.message,
          stack: err.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 500,
            message: "Database connection error",
          },
          null
        );
      }
      try {
        const res = await client.query(
          "SELECT um.user_name, um.role_fk, r.role_name FROM users_mapping um JOIN roles r ON um.role_fk = r.role_pk WHERE um.user_name = $1",
          [email]
        );
        client.release();
        if (res.rows.length === 0) {
          return callback(
            {
              result: result_failure,
              code: 404,
              message: "User not found or not mapped to a role",
            },
            null
          );
        }
        callback(null, {
          result: result_success,
          code: 200,
          data: res.rows[0],
        });
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error in login:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Database error: ${dbError.message}`,
          },
          null
        );
      }
    });
  },

  getPermissions: (email, callback) => {
    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in getPermissions:", {
          error: err.message,
          stack: err.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 500,
            message: "Database connection error",
          },
          null
        );
      }
      try {
        const res = await client.query(
          `
          SELECT r.role_name, r.can_read, r.can_write, r.can_delete
          FROM users_mapping um
          JOIN roles r ON um.role_fk = r.role_pk
          WHERE um.user_name = $1
          `,
          [email]
        );
        client.release();
        if (res.rows.length === 0) {
          return callback(
            {
              result: result_failure,
              code: 404,
              message: "Permissions not found",
            },
            null
          );
        }
        callback(null, {
          result: result_success,
          code: 200,
          data: res.rows[0],
        });
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error in getPermissions:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Database error: ${dbError.message}`,
          },
          null
        );
      }
    });
  },

  getRoles: (callback) => {
    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in getRoles:", {
          error: err.message,
          stack: err.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 500,
            message: "Database connection error",
          },
          null
        );
      }
      try {
        const res = await client.query("SELECT role_pk, role_name FROM roles");
        client.release();
        callback(null, {
          result: result_success,
          code: 200,
          data: res.rows,
        });
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error in getRoles:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Database error: ${dbError.message}`,
          },
          null
        );
      }
    });
  },

  mapUserRole: (email, role_fk, callback) => {
    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in mapUserRole:", {
          error: err.message,
          stack: err.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 500,
            message: "Database connection error",
          },
          null
        );
      }
      try {
        await client.query(
          "INSERT INTO users (user_name) VALUES ($1) ON CONFLICT (user_name) DO NOTHING",
          [email]
        );

        const res = await client.query(
          `
          INSERT INTO users_mapping (user_name, role_fk)
          VALUES ($1, $2)
          ON CONFLICT (user_name) DO UPDATE SET role_fk = EXCLUDED.role_fk
          RETURNING user_name, role_fk
          `,
          [email, role_fk]
        );
        client.release();
        callback(null, {
          result: result_success,
          code: 200,
          message: `User ${email} mapped to role ${role_fk}`,
        });
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error in mapUserRole:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Database error: ${dbError.message}`,
          },
          null
        );
      }
    });
  },
};

module.exports = permissionsController;
