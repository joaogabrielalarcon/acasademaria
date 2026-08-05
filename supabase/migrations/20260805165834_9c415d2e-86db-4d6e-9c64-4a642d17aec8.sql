ALTER TABLE public.registros DROP CONSTRAINT registros_tipo_check;

ALTER TABLE public.registros ADD CONSTRAINT registros_tipo_check
CHECK (tipo = ANY (ARRAY[
  'manutencao'::text,
  'implantacao'::text,
  'entrega'::text,
  'visita_tecnica'::text,
  'reuniao'::text,
  'outro'::text,
  'visita'::text,
  'tarefa'::text,
  'acompanhamento'::text,
  'intercorrencia'::text,
  'solicitacao'::text,
  'observacao'::text,
  'irrigacao'::text
]));