const { getConnection } = require("../lib/connection");
const winston = require("winston");
const Joi = require("joi");
const { calendar } = require("@googleapis/calendar");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

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

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const syncSchema = Joi.object({
  calendarId: Joi.string().default("primary"),
  timeMin: Joi.date().iso().optional(),
  timeMax: Joi.date().iso().optional(),
});

const calendarController = {
  getAuthUrl: (callback) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
      prompt: "consent",
    });
    callback(null, { result: result_success, code: 200, data: authUrl });
  },

  handleOAuthCallback: async (code, callback) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      getConnection(async (err, client) => {
        if (err) {
          winstonlogger.error("Connection error in handleOAuthCallback:", {
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
          winstonlogger.info("Attempting to save tokens to oauth_tokens", {
            tokens,
          });
          await client.query(
            `
            INSERT INTO oauth_tokens (id, access_token, refresh_token, expiry_date)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
              access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token,
              expiry_date = EXCLUDED.expiry_date;
          `,
            [
              1,
              tokens.access_token,
              tokens.refresh_token,
              new Date(tokens.expiry_date),
            ]
          );
          winstonlogger.info("Tokens saved successfully");
          client.release();
          callback(null, {
            result: result_success,
            code: 200,
            message: "Authenticated successfully",
            tokens,
          });
        } catch (dbError) {
          client.release();
          winstonlogger.error("Error saving tokens to oauth_tokens:", {
            error: dbError.message,
            stack: dbError.stack,
          });
          callback(
            {
              result: result_failure,
              code: 400,
              message: `Failed to save tokens: ${dbError.message}`,
            },
            null
          );
        }
      });
    } catch (error) {
      winstonlogger.error("OAuth error in handleOAuthCallback:", {
        error: error.message,
        stack: error.stack,
      });
      callback(
        {
          result: result_failure,
          code: 400,
          message: `OAuth error: ${error.message}`,
        },
        null
      );
    }
  },

  syncEvents: async (jsonValue, callback) => {
    const { error, value } = syncSchema.validate(jsonValue);
    if (error) {
      return callback(
        {
          result: result_failure,
          code: 400,
          message: error.details[0].message,
        },
        null
      );
    }

    getConnection(async (err, client) => {
      if (err) {
        winstonlogger.error("Connection error in syncEvents:", {
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
          "SELECT access_token, refresh_token, expiry_date FROM oauth_tokens WHERE id = 1"
        );
        client.release();
        if (res.rows.length === 0) {
          return callback(
            {
              result: result_failure,
              code: 400,
              message: "No OAuth tokens found",
            },
            null
          );
        }
        oauth2Client.setCredentials(res.rows[0]);
        if (new Date(res.rows[0].expiry_date) < new Date()) {
          winstonlogger.info("Access token expired, refreshing...");
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          getConnection(async (err2, client2) => {
            if (err2) {
              winstonlogger.error("Connection error in token refresh:", {
                error: err2.message,
                stack: err2.stack,
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
              await client2.query(
                `
                UPDATE oauth_tokens SET access_token = $1, expiry_date = $2 WHERE id = 1
              `,
                [credentials.access_token, new Date(credentials.expiry_date)]
              );
              client2.release();
              winstonlogger.info("Token refreshed and updated in oauth_tokens");
            } catch (dbError) {
              client2.release();
              winstonlogger.error("Error updating tokens:", {
                error: dbError.message,
                stack: dbError.stack,
              });
              callback(
                {
                  result: result_failure,
                  code: 400,
                  message: `Failed to update tokens: ${dbError.message}`,
                },
                null
              );
            }
          });
        }
      } catch (dbError) {
        client.release();
        winstonlogger.error("Error loading tokens in syncEvents:", {
          error: dbError.message,
          stack: dbError.stack,
        });
        return callback(
          {
            result: result_failure,
            code: 400,
            message: `Failed to load tokens: ${dbError.message}`,
          },
          null
        );
      }

      const cal = calendar({ version: "v3", auth: oauth2Client });
      try {
        const res = await cal.events.list({
          calendarId: value.calendarId,
          timeMin: value.timeMin ? value.timeMin.toISOString() : undefined,
          timeMax: value.timeMax ? value.timeMax.toISOString() : undefined,
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime",
        });

        const events = res.data.items;
        if (!events || events.length === 0) {
          return callback(null, {
            result: result_success,
            code: 200,
            message: "No events found",
          });
        }

        getConnection(async (err, client) => {
          if (err) {
            winstonlogger.error("Connection error in event sync:", {
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
            await client.query("BEGIN");
            for (const event of events) {
              const query = `
                INSERT INTO calendar_events (event_id, summary, start_time, end_time, description)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (event_id) DO UPDATE SET
                  summary = EXCLUDED.summary,
                  start_time = EXCLUDED.start_time,
                  end_time = EXCLUDED.end_time,
                  description = EXCLUDED.description;
              `;
              const values = [
                event.id,
                event.summary || "",
                event.start?.dateTime || event.start?.date,
                event.end?.dateTime || event.end?.date,
                event.description || "",
              ];
              await client.query(query, values);
            }
            await client.query("COMMIT");
            client.release();
            callback(null, {
              result: result_success,
              code: 200,
              message: `Synced ${events.length} events`,
            });
          } catch (dbError) {
            await client.query("ROLLBACK");
            client.release();
            winstonlogger.error("Error inserting events:", {
              error: dbError.message,
              stack: dbError.stack,
            });
            callback(
              {
                result: result_failure,
                code: 400,
                message: `Failed to insert events: ${dbError.message}`,
              },
              null
            );
          }
        });
      } catch (apiError) {
        winstonlogger.error("Google API error:", {
          error: apiError.message,
          stack: apiError.stack,
        });
        callback(
          {
            result: result_failure,
            code: 400,
            message: `Google API error: ${apiError.message}`,
          },
          null
        );
      }
    });
  },
};

module.exports = calendarController;
