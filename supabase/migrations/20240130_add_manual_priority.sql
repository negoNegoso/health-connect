-- Migration to add manual_priority column for doctor control over patient status
-- Includes fix for 'cannot change name of view column' error

-- Add column to base table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS manual_priority TEXT CHECK (manual_priority IN ('green', 'yellow', 'orange', 'red'));

-- DROP and RECREATE the view to avoid column conflict errors
DROP VIEW IF EXISTS late_patients;

CREATE OR REPLACE VIEW late_patients AS
SELECT
  p.id AS patient_id,
  p.full_name,
  p.cns,
  p.phone,
  p.address,
  p.territory,
  p.latitude,
  p.longitude,
  p.manual_priority,
  mr.id AS last_record_id,
  mr.return_deadline_date,
  mr.diagnosis AS last_diagnosis,
  a.scheduled_date AS next_appointment_date,
  CASE
    WHEN mr.return_deadline_date IS NOT NULL AND mr.return_deadline_date < CURRENT_DATE THEN CURRENT_DATE - mr.return_deadline_date
    ELSE 0
  END AS days_overdue
FROM patients p
LEFT JOIN medical_records mr ON p.id = mr.patient_id AND mr.created_at = (( SELECT max(medical_records.created_at) AS max
   FROM medical_records
  WHERE medical_records.patient_id = p.id))
LEFT JOIN appointments a ON p.id = a.patient_id AND a.scheduled_date > CURRENT_DATE AND a.status = 'scheduled'
ORDER BY
  CASE
    WHEN mr.return_deadline_date IS NOT NULL AND mr.return_deadline_date < CURRENT_DATE THEN CURRENT_DATE - mr.return_deadline_date
    ELSE 0
  END DESC;
