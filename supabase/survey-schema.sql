-- Respuestas de encuestas (Centro de Estudiantes)
-- Ejecutar en el SQL Editor de Supabase después de tener la tabla public.admins.

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_key text NOT NULL DEFAULT 'demo_v1',
  q1 text NOT NULL CHECK (q1 IN ('mucho', 'a_veces', 'poco')),
  q2 text NOT NULL CHECK (q2 IN ('si', 'no', 'indistinto')),
  comment text,
  respondent_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT survey_responses_survey_respondent UNIQUE (survey_key, respondent_key)
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_key ON public.survey_responses (survey_key);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created ON public.survey_responses (created_at DESC);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Envío desde la web pública (clave anon del frontend)
CREATE POLICY "Cualquiera puede enviar una respuesta de encuesta"
  ON public.survey_responses FOR INSERT
  TO anon
  WITH CHECK (
    q1 IN ('mucho', 'a_veces', 'poco')
    AND q2 IN ('si', 'no', 'indistinto')
    AND length(respondent_key) >= 8
  );

-- Solo cuentas administradoras
CREATE POLICY "Admins pueden leer respuestas de encuestas"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );
