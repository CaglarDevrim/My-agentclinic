CREATE TABLE staff_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) BETWEEN 3 AND 254),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX staff_sessions_expiry_idx ON staff_sessions (expires_at);

CREATE TABLE staff_login_throttles (
  identity_hash TEXT PRIMARY KEY CHECK (length(identity_hash) = 64),
  failure_count INTEGER NOT NULL CHECK (failure_count >= 1),
  window_started_at TEXT NOT NULL
);
