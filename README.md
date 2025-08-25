# Node Calendar and Permissions App

A Node.js web application with two main features:

1. **Google Calendar Integration**: Syncs events from Google Calendar to a PostgreSQL database using OAuth2 authentication.
2. **User Rights and Permissions**: Manages user roles (Admin, Editor, Viewer) with permissions (read, write, delete) via a web interface.

## Project Structure

- `routes/calendar.js`, `model/calendarController.js`: Handles Google Calendar OAuth2 and event syncing.
- `routes/permissions.js`, `model/permissionsController.js`, `public/index.html`: Manages user login, role assignment, and permissions display.
- `lib/connection.js`: PostgreSQL database connection.
- `app.js`: Main Express server setup.
- `schema.sql`: Database schema for required tables.

## Setup

1. **Clone the Repository**:

   git clone https://github.com/your-username/node-calendar-and-permissions.git

2. **Install Dependencies**:

   npm install

3. **Set Up Environment Variables**:

   Create a .env file in the root directory with your own credentials

   PORT=3000
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   DB_NAME=calendar_db
   DB_PORT=5432
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/calendar/oauth2callback

   Get Google API keys from the Google Cloud Console.

4. **Set Up PostgreSQL Database**

   Install PostgreSQL if needed (from postgresql.org).
   Create a database named calendar_db.
   Run the SQL in schema.sql using a tool like pgAdmin or the psql command line.

5. **Run the Application**

   node app.js

   Access the permissions UI at http://localhost:3000.
   For calendar: Go to http://localhost:3000/calendar/auth to authenticate, then use /calendar/sync.

Features
Task 1: Google Calendar Integration

Authenticates via Google OAuth2.
Syncs events to the calendar_events table.
Endpoints: /calendar/auth, /calendar/oauth2callback, /calendar/sync.

Task 2: User Rights and Permissions

Login and view roles/permissions.
Admin can map users to roles.
Endpoints: /permissions/users, /permissions/login, /permissions/:email, /permissions/roles, /permissions/map-user-role.

Database Schema
See schema.sql for the full setup.
