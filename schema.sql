CREATE TABLE users (
  user_name TEXT PRIMARY KEY
);

CREATE TABLE roles (
  role_pk SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL,
  can_read BOOLEAN NOT NULL,
  can_write BOOLEAN NOT NULL,
  can_delete BOOLEAN NOT NULL
);

CREATE TABLE users_mapping (
  user_role_pk SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL REFERENCES users(user_name),
  role_fk INTEGER NOT NULL REFERENCES roles(role_pk),
  UNIQUE (user_name)
);

CREATE TABLE oauth_tokens (
    id INT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date TIMESTAMP
);

CREATE TABLE calendar_events (
    event_id VARCHAR(255) PRIMARY KEY,
    summary TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    description TEXT
);

-- Sample data
INSERT INTO users (user_name) VALUES
    ('user1@gmail.com'),
    ('user2@gmail.com'),
    ('user3@gmail.com');

INSERT INTO roles (role_name, can_read, can_write, can_delete) VALUES
    ('Admin', TRUE, TRUE, TRUE),
    ('Editor', TRUE, TRUE, FALSE),
    ('Viewer', TRUE, FALSE, FALSE);

INSERT INTO users_mapping (user_name, role_fk) VALUES
    ('user1@gmail.com', 1),
    ('user2@gmail.com', 2),
    ('user3@gmail.com', 3);