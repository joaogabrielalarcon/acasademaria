
-- Add parcelas_config to projetos for non-maintenance manual parcelas
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS parcelas_config jsonb DEFAULT NULL;

-- Update trigger to handle manual parcelas for non-maintenance projects
CREATE OR REPLACE FUNCTION public.auto_create_parcela_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_mes date;
  v_abril_proximo date;
  v_num integer := 1;
  v_dia integer;
  v_vencimento date;
  v_parcela jsonb;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    IF NEW.tipo = 'manutencao' AND NEW.valor_mensal IS NOT NULL AND NEW.valor_mensal > 0 THEN
      -- Maintenance: monthly parcelas until April next year
      v_abril_proximo := make_date(
        CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 4 
          THEN EXTRACT(YEAR FROM CURRENT_DATE)::int 
          ELSE (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::int 
        END, 4, 1
      ) + interval '1 month' - interval '1 day';

      v_dia := COALESCE(NEW.dia_vencimento, 10);
      v_mes := date_trunc('month', CURRENT_DATE)::date;

      WHILE v_mes <= v_abril_proximo LOOP
        v_vencimento := make_date(
          EXTRACT(YEAR FROM v_mes)::int,
          EXTRACT(MONTH FROM v_mes)::int,
          LEAST(v_dia, (date_trunc('month', v_mes) + interval '1 month' - interval '1 day')::date - date_trunc('month', v_mes)::date + 1)
        );

        INSERT INTO public.financeiro_parcelas (projeto_id, cliente_id, numero_parcela, valor, data_vencimento, tipo)
        VALUES (NEW.id, NEW.cliente_id, v_num, NEW.valor_mensal, v_vencimento, 'mensal');

        v_num := v_num + 1;
        v_mes := (v_mes + interval '1 month')::date;
      END LOOP;
    ELSIF NEW.parcelas_config IS NOT NULL AND jsonb_array_length(NEW.parcelas_config) > 0 THEN
      -- Non-maintenance with manual parcelas config
      FOR v_parcela IN SELECT * FROM jsonb_array_elements(NEW.parcelas_config)
      LOOP
        INSERT INTO public.financeiro_parcelas (projeto_id, cliente_id, numero_parcela, valor, data_vencimento, tipo)
        VALUES (
          NEW.id,
          NEW.cliente_id,
          v_num,
          COALESCE((v_parcela->>'valor')::numeric, 0),
          CASE WHEN v_parcela->>'data_vencimento' IS NOT NULL 
            THEN (v_parcela->>'data_vencimento')::date 
            ELSE NULL 
          END,
          'avulsa'
        );
        v_num := v_num + 1;
      END LOOP;
    ELSE
      -- Fallback: single parcela
      INSERT INTO public.financeiro_parcelas (projeto_id, cliente_id, numero_parcela, valor, tipo)
      VALUES (NEW.id, NEW.cliente_id, 1, COALESCE(NEW.valor_total, 0), 'avulsa');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
