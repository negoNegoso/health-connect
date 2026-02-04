-- Reset Database and Seed Realistic Data
-- Clears: appointments, community_visits, medical_records, patients
-- Preserves: profiles, user_roles
-- Generates: 100 patients with varied data. 
-- Return Deadlines: 1/3 Overdue (Atrasados), 1/3 Upcoming (Em dia), 1/3 None/Done.

DO $$
DECLARE
  v_doctor_id uuid;
  v_patient_id uuid;
  v_num_patients integer := 100;
  
  -- Data
  v_first_names text[] := ARRAY['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Lucas', 'Maria', 'Nicolas', 'Olivia', 'Pedro', 'Rafaela', 'Samuel', 'Tatiana', 'Vitor', 'Yasmin'];
  v_last_names text[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];
  v_streets text[] := ARRAY['Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Av. Faria Lima', 'Rua da Consolação', 'Av. Brasil', 'Rua Oscar Freire', 'Av. Rebouças', 'Rua Domingos de Morais', 'Av. Ibirapuera'];
  v_diagnoses text[] := ARRAY['Hipertensão', 'Diabetes Tipo 2', 'Asma', 'Bronquite', 'Artrite', 'Dores nas Costas', 'Enxaqueca', 'Gastrite', 'Ansiedade', 'Colesterol Alto', null, null, null];
  
  -- Vars
  v_full_name text;
  v_address text;
  v_phone text;
  v_cns text;
  v_priority text;
  v_lat double precision;
  v_lng double precision;
  v_return_date date;
  i integer;
  
BEGIN
  -- 1. Get Doctor
  SELECT user_id INTO v_doctor_id FROM user_roles WHERE role = 'doctor' LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE NOTICE 'No doctor found.';
  END IF;

  -- 2. Clear tables
  TRUNCATE TABLE appointments, community_visits, medical_records, patients CASCADE;

  -- 3. Loop 100 Patients
  FOR i IN 1..v_num_patients LOOP
    
    -- Basic Info
    v_full_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int] || ' ' || 
                   v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
    v_address := v_streets[1 + floor(random() * array_length(v_streets, 1))::int] || ', ' || floor(random() * 2000 + 1)::text;
    v_lat := -23.5505 + (random() * 0.04 - 0.02);
    v_lng := -46.6333 + (random() * 0.04 - 0.02);
    v_phone := '119' || floor(random() * 90000000 + 10000000)::text;
    v_cns := (700000000000000 + floor(random() * 99999999))::text;
    
    -- Priority (Visual)
    IF random() < 0.7 THEN v_priority := NULL;
    ELSE 
      CASE floor(random() * 4)::int
        WHEN 0 THEN v_priority := 'green';
        WHEN 1 THEN v_priority := 'yellow';
        WHEN 2 THEN v_priority := 'orange';
        ELSE v_priority := 'red';
      END CASE;
    END IF;

    -- Insert Patient
    INSERT INTO patients (full_name, cns, phone, address, territory, latitude, longitude, manual_priority)
    VALUES (v_full_name, v_cns, v_phone, v_address, 'Área Central', v_lat, v_lng, v_priority)
    RETURNING id INTO v_patient_id;

    IF v_doctor_id IS NOT NULL THEN
      
      -- Insert some PAST random history first (so they aren't the latest)
      FOR j IN 1..floor(random() * 3)::int LOOP
        INSERT INTO medical_records (patient_id, doctor_id, diagnosis, clinical_notes, created_at, return_deadline_date)
        VALUES (
          v_patient_id, 
          v_doctor_id, 
          v_diagnoses[1 + floor(random() * array_length(v_diagnoses, 1))::int],
          'Histórico antigo.',
          CURRENT_TIMESTAMP - (floor(random() * 300) + 100 || ' days')::interval,
          (CURRENT_DATE - (floor(random() * 200) + 100 || ' days')::interval)::date
        );
      END LOOP;

      -- LATEST RECORD (Determines status)
      -- Scenario A: OVERDUE Return (1/3) -> i % 3 == 0
      IF i % 3 = 0 THEN
         -- Return deadline was in the past (e.g., 5 to 45 days ago)
         v_return_date := (CURRENT_DATE - (floor(random() * 40) + 5 || ' days')::interval)::date;
         
         INSERT INTO medical_records (patient_id, doctor_id, diagnosis, clinical_notes, created_at, return_deadline_date)
         VALUES (v_patient_id, v_doctor_id, v_diagnoses[1 + floor(random() * array_length(v_diagnoses, 1))::int], 'Paciente precisa retornar.', CURRENT_TIMESTAMP, v_return_date);

      -- Scenario B: UPCOMING Return (1/3) -> i % 3 == 1
      ELSIF i % 3 = 1 THEN
         -- Return deadline is in the future (e.g., 10 to 60 days from now)
         v_return_date := (CURRENT_DATE + (floor(random() * 50) + 10 || ' days')::interval)::date;
         
         INSERT INTO medical_records (patient_id, doctor_id, diagnosis, clinical_notes, created_at, return_deadline_date)
         VALUES (v_patient_id, v_doctor_id, v_diagnoses[1 + floor(random() * array_length(v_diagnoses, 1))::int], 'Retorno agendado.', CURRENT_TIMESTAMP, v_return_date);

      -- Scenario C: NO Return Needed / Discharged (1/3) -> i % 3 == 2
      ELSE
         -- return_deadline_date IS NULL
         INSERT INTO medical_records (patient_id, doctor_id, diagnosis, clinical_notes, created_at, return_deadline_date)
         VALUES (v_patient_id, v_doctor_id, v_diagnoses[1 + floor(random() * array_length(v_diagnoses, 1))::int], 'Alta ambulatorial.', CURRENT_TIMESTAMP, NULL);
      END IF;

    END IF;

  END LOOP;
END $$;
