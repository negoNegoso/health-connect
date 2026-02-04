-- Add latitude and longitude columns to patients table
ALTER TABLE patients ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE patients ADD COLUMN longitude DOUBLE PRECISION;

-- Update the view to include the new columns
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
LEFT JOIN appointments a ON p.id = a.patient_id AND a.scheduled_date > CURRENT_DATE AND a.status = 'scheduled'::text
ORDER BY
  CASE
    WHEN mr.return_deadline_date IS NOT NULL AND mr.return_deadline_date < CURRENT_DATE THEN CURRENT_DATE - mr.return_deadline_date
    ELSE 0
  END DESC;
