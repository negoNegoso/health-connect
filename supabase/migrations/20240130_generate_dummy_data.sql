-- Propagate data for testing
-- Generates 100 patients with appointments for Dr. Felipe
-- split by address and priority as requested
-- FIXED: Correctly finds doctor using user_roles table

DO $$
DECLARE
  v_doctor_id uuid;
  v_patient_id uuid;
  v_priority text;
  v_address text;
  v_lat double precision;
  v_lng double precision;
  v_phone text;
  i integer;
BEGIN
  -- Get the doctor ID (Dr. Felipe or any doctor)
  -- Checks user_roles table instead of profiles which doesn't have role column
  SELECT user_id INTO v_doctor_id FROM user_roles WHERE role = 'doctor' LIMIT 1;
  
  -- If no doctor found, raise error or handle it. Assuming one exists based on prompt.
  IF v_doctor_id IS NULL THEN
    RAISE NOTICE 'No doctor found. Please ensure there is a user with doctor role.';
    -- Fallback: try to find ANY user to attach to if strictly testing, but better to warn.
    -- RETURN; 
  END IF;

  FOR i IN 1..100 LOOP
    -- Determine Priority (1/3 split)
    IF i % 3 = 0 THEN
      v_priority := 'red';
    ELSIF i % 3 = 1 THEN
      v_priority := 'yellow';
    ELSE
      v_priority := 'green';
    END IF;

    -- Determine Address (50/50 split)
    IF i % 2 = 0 THEN
      v_address := 'Rua das Flores, ' || i;
      -- Approx coords for Rua das Flores (mock)
      v_lat := -23.5505 + (random() * 0.01 - 0.005);
      v_lng := -46.6333 + (random() * 0.01 - 0.005);
    ELSE
      v_address := 'Avenida Paulista, ' || i;
      -- Approx coords for Avenida Paulista (mock)
      v_lat := -23.5615 + (random() * 0.01 - 0.005);
      v_lng := -46.6559 + (random() * 0.01 - 0.005);
    END IF;

    -- Generate random phone number
    v_phone := '119' || floor(random() * 90000000 + 10000000)::text;

    -- Insert Patient
    INSERT INTO patients (full_name, cns, phone, address, territory, latitude, longitude, manual_priority)
    VALUES (
      'Paciente Teste ' || i,
      (700000000000000 + i)::text,
      v_phone,
      v_address,
      'Area 1',
      v_lat,
      v_lng,
      v_priority
    )
    RETURNING id INTO v_patient_id;

    -- Insert Appointment (Scheduled in the future)
    -- Only insert appointment if we found a doctor
    IF v_doctor_id IS NOT NULL THEN
      INSERT INTO appointments (patient_id, doctor_id, scheduled_date, status)
      VALUES (
        v_patient_id,
        v_doctor_id,
        (CURRENT_TIMESTAMP + (i || ' days')::interval),
        'scheduled'
      );
    END IF;

  END LOOP;
END $$;
