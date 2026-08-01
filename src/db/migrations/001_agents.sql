CREATE TABLE agents (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'on_leave', 'discharged')),
  description TEXT NOT NULL
);
