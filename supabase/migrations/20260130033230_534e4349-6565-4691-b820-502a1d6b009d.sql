-- Create role enum for user types
CREATE TYPE public.app_role AS ENUM ('doctor', 'nurse', 'agent');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    cns TEXT UNIQUE, -- Cartão Nacional de Saúde
    phone TEXT,
    address TEXT,
    territory TEXT, -- For agent assignment
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create medical_records table
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    diagnosis TEXT,
    prescription TEXT,
    clinical_notes TEXT,
    return_deadline_date DATE, -- KEY FEATURE: Recommended return date
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Create community_visits table for agent tracking
CREATE TABLE public.community_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'visited', 'unreachable')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.community_visits ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for patients (all authenticated users can view/manage patients)
CREATE POLICY "Authenticated users can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors and nurses can insert patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse')
);

CREATE POLICY "Doctors and nurses can update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse')
);

-- RLS Policies for appointments
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors and nurses can insert appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse')
);

CREATE POLICY "Doctors can update their appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    doctor_id = auth.uid() OR 
    public.has_role(auth.uid(), 'nurse')
);

-- RLS Policies for medical_records
CREATE POLICY "Doctors and nurses can view medical records"
ON public.medical_records FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'nurse')
);

CREATE POLICY "Doctors can insert medical records"
ON public.medical_records FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND 
    doctor_id = auth.uid()
);

CREATE POLICY "Doctors can update their own medical records"
ON public.medical_records FOR UPDATE
TO authenticated
USING (
    doctor_id = auth.uid()
);

-- RLS Policies for community_visits
CREATE POLICY "Agents can view their visits"
ON public.community_visits FOR SELECT
TO authenticated
USING (
    agent_id = auth.uid() OR 
    public.has_role(auth.uid(), 'nurse')
);

CREATE POLICY "Agents can insert their visits"
ON public.community_visits FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'agent') AND 
    agent_id = auth.uid()
);

CREATE POLICY "Agents can update their visits"
ON public.community_visits FOR UPDATE
TO authenticated
USING (
    agent_id = auth.uid()
);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_community_visits_updated_at
    BEFORE UPDATE ON public.community_visits
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create view for "Busca Ativa" - patients who are late for return
CREATE OR REPLACE VIEW public.late_patients AS
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