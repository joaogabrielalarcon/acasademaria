
-- Add tipo and categoria columns, plus insumo-specific fields
ALTER TABLE public.memorial_descritivo
  ADD COLUMN tipo text NOT NULL DEFAULT 'planta',
  ADD COLUMN planta_id uuid REFERENCES public.plantas(id) ON DELETE SET NULL,
  ADD COLUMN insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  ADD COLUMN categoria text DEFAULT '';
