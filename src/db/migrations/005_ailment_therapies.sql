CREATE TABLE ailment_therapies (
  ailment_id INTEGER NOT NULL REFERENCES ailments(id) ON DELETE CASCADE,
  therapy_id INTEGER NOT NULL REFERENCES therapies(id) ON DELETE CASCADE,
  PRIMARY KEY (ailment_id, therapy_id)
);
