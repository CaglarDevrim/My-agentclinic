CREATE UNIQUE INDEX appointments_open_slot_unique_idx
ON appointments (lower(trim(therapist_name)), scheduled_at)
WHERE status IN ('pending', 'confirmed');
