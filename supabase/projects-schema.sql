-- Tabla de proyectos del Centro de Estudiantes
-- Ejecutar en el SQL Editor de Supabase (Settings > API)

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'en_curso' CHECK (status IN ('en_curso', 'finalizado', 'planificado')),
  meta text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para ordenar
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON public.projects (display_order, created_at);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer proyectos (público)
CREATE POLICY "Proyectos visibles para todos"
  ON public.projects FOR SELECT
  USING (true);

-- Solo admins pueden insertar
CREATE POLICY "Solo admins pueden crear proyectos"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- Solo admins pueden actualizar
CREATE POLICY "Solo admins pueden actualizar proyectos"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- Solo admins pueden eliminar
CREATE POLICY "Solo admins pueden eliminar proyectos"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );
