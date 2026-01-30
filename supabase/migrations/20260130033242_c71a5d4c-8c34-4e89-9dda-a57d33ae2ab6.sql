-- Drop the SECURITY DEFINER view and recreate as regular view
DROP VIEW IF EXISTS public.late_patients;

-- Recreate as a regular view (without SECURITY DEFINER)
CREATE VIEW public.late_patients AS
SELECT 
    p.id AS patient_id,
    p.full_name,
    p.cns,
    p.phone,
    p.address,
    p.territory,
    mr.return_deadline_date,
    mr.id AS last_record_id,
    mr.diagnosis AS last_diagnosis,
    COALESCE(
        (SELECT MIN(a.scheduled_date) 
         FROM public.appointments a 
         WHERE a.patient_id = p.id 
           AND a.status = 'scheduled' 
           AND a.scheduled_date > CURRENT_DATE),
        NULL
    ) AS next_appointment_date,
    CURRENT_DATE - mr.return_deadline_date AS days_overdue
FROM public.patients p
INNER JOIN LATERAL (
    SELECT * FROM public.medical_records m
    WHERE m.patient_id = p.id
      AND m.return_deadline_date IS NOT NULL
    ORDER BY m.created_at DESC
    LIMIT 1
) mr ON true
WHERE mr.return_deadline_date < CURRENT_DATE
  AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = p.id
        AND a.status = 'scheduled'
        AND a.scheduled_date > CURRENT_DATE
  );