CREATE TRIGGER staff_users_reject_linked_therapist
BEFORE INSERT ON staff_users
WHEN NEW.role = 'therapist' AND EXISTS (
  SELECT 1 FROM therapists
  WHERE normalized_name = lower(trim(NEW.display_name)) AND staff_user_id IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'therapist profile already linked');
END;

CREATE TRIGGER staff_users_create_therapist_profile
AFTER INSERT ON staff_users
WHEN NEW.role = 'therapist'
BEGIN
  UPDATE therapists
  SET staff_user_id = NEW.id, display_name = trim(NEW.display_name)
  WHERE normalized_name = lower(trim(NEW.display_name)) AND staff_user_id IS NULL;

  INSERT INTO therapists (staff_user_id, normalized_name, display_name)
  SELECT NEW.id, lower(trim(NEW.display_name)), trim(NEW.display_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM therapists WHERE normalized_name = lower(trim(NEW.display_name))
  );
END;
