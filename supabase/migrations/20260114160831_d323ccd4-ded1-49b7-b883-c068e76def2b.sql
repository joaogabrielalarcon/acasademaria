-- Atualizar as políticas RLS para permitir acesso anônimo
-- Isso é necessário enquanto não há autenticação implementada

-- Tabela: colaboradores
DROP POLICY IF EXISTS "Authenticated users can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can insert colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can update colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can delete colaboradores" ON public.colaboradores;

CREATE POLICY "Allow all access to colaboradores" ON public.colaboradores FOR ALL USING (true) WITH CHECK (true);

-- Tabela: entregas_colaborador
DROP POLICY IF EXISTS "Authenticated users can view entregas_colaborador" ON public.entregas_colaborador;
DROP POLICY IF EXISTS "Authenticated users can insert entregas_colaborador" ON public.entregas_colaborador;
DROP POLICY IF EXISTS "Authenticated users can update entregas_colaborador" ON public.entregas_colaborador;
DROP POLICY IF EXISTS "Authenticated users can delete entregas_colaborador" ON public.entregas_colaborador;

CREATE POLICY "Allow all access to entregas_colaborador" ON public.entregas_colaborador FOR ALL USING (true) WITH CHECK (true);

-- Tabela: insumos
DROP POLICY IF EXISTS "Authenticated users can view insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated users can insert insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated users can update insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated users can delete insumos" ON public.insumos;

CREATE POLICY "Allow all access to insumos" ON public.insumos FOR ALL USING (true) WITH CHECK (true);

-- Tabela: fornecedores
DROP POLICY IF EXISTS "Authenticated users can view fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can insert fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can update fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can delete fornecedores" ON public.fornecedores;

CREATE POLICY "Allow all access to fornecedores" ON public.fornecedores FOR ALL USING (true) WITH CHECK (true);

-- Tabela: clientes
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete clientes" ON public.clientes;

CREATE POLICY "Allow all access to clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

-- Tabela: plantas
DROP POLICY IF EXISTS "Authenticated users can view plantas" ON public.plantas;
DROP POLICY IF EXISTS "Authenticated users can insert plantas" ON public.plantas;
DROP POLICY IF EXISTS "Authenticated users can update plantas" ON public.plantas;
DROP POLICY IF EXISTS "Authenticated users can delete plantas" ON public.plantas;

CREATE POLICY "Allow all access to plantas" ON public.plantas FOR ALL USING (true) WITH CHECK (true);

-- Tabela: categorias_plantas
DROP POLICY IF EXISTS "Authenticated users can view categorias_plantas" ON public.categorias_plantas;
DROP POLICY IF EXISTS "Authenticated users can insert categorias_plantas" ON public.categorias_plantas;
DROP POLICY IF EXISTS "Authenticated users can update categorias_plantas" ON public.categorias_plantas;
DROP POLICY IF EXISTS "Authenticated users can delete categorias_plantas" ON public.categorias_plantas;

CREATE POLICY "Allow all access to categorias_plantas" ON public.categorias_plantas FOR ALL USING (true) WITH CHECK (true);

-- Tabela: categorias_servico
DROP POLICY IF EXISTS "Authenticated users can view categorias_servico" ON public.categorias_servico;
DROP POLICY IF EXISTS "Authenticated users can insert categorias_servico" ON public.categorias_servico;
DROP POLICY IF EXISTS "Authenticated users can update categorias_servico" ON public.categorias_servico;
DROP POLICY IF EXISTS "Authenticated users can delete categorias_servico" ON public.categorias_servico;

CREATE POLICY "Allow all access to categorias_servico" ON public.categorias_servico FOR ALL USING (true) WITH CHECK (true);

-- Tabela: maquinas
DROP POLICY IF EXISTS "Authenticated users can view maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Authenticated users can insert maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Authenticated users can update maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Authenticated users can delete maquinas" ON public.maquinas;

CREATE POLICY "Allow all access to maquinas" ON public.maquinas FOR ALL USING (true) WITH CHECK (true);

-- Tabela: diarias
DROP POLICY IF EXISTS "Authenticated users can view diarias" ON public.diarias;
DROP POLICY IF EXISTS "Authenticated users can insert diarias" ON public.diarias;
DROP POLICY IF EXISTS "Authenticated users can update diarias" ON public.diarias;
DROP POLICY IF EXISTS "Authenticated users can delete diarias" ON public.diarias;

CREATE POLICY "Allow all access to diarias" ON public.diarias FOR ALL USING (true) WITH CHECK (true);

-- Tabela: registros
DROP POLICY IF EXISTS "Authenticated users can view registros" ON public.registros;
DROP POLICY IF EXISTS "Authenticated users can insert registros" ON public.registros;
DROP POLICY IF EXISTS "Authenticated users can update registros" ON public.registros;
DROP POLICY IF EXISTS "Authenticated users can delete registros" ON public.registros;

CREATE POLICY "Allow all access to registros" ON public.registros FOR ALL USING (true) WITH CHECK (true);

-- Tabela: registro_insumos
DROP POLICY IF EXISTS "Authenticated users can view registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Authenticated users can insert registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Authenticated users can update registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Authenticated users can delete registro_insumos" ON public.registro_insumos;

CREATE POLICY "Allow all access to registro_insumos" ON public.registro_insumos FOR ALL USING (true) WITH CHECK (true);

-- Tabela: registro_maquinas
DROP POLICY IF EXISTS "Authenticated users can view registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Authenticated users can insert registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Authenticated users can update registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Authenticated users can delete registro_maquinas" ON public.registro_maquinas;

CREATE POLICY "Allow all access to registro_maquinas" ON public.registro_maquinas FOR ALL USING (true) WITH CHECK (true);

-- Tabela: propostas
DROP POLICY IF EXISTS "Authenticated users can view propostas" ON public.propostas;
DROP POLICY IF EXISTS "Authenticated users can insert propostas" ON public.propostas;
DROP POLICY IF EXISTS "Authenticated users can update propostas" ON public.propostas;
DROP POLICY IF EXISTS "Authenticated users can delete propostas" ON public.propostas;

CREATE POLICY "Allow all access to propostas" ON public.propostas FOR ALL USING (true) WITH CHECK (true);

-- Tabela: trechos
DROP POLICY IF EXISTS "Authenticated users can view trechos" ON public.trechos;
DROP POLICY IF EXISTS "Authenticated users can insert trechos" ON public.trechos;
DROP POLICY IF EXISTS "Authenticated users can update trechos" ON public.trechos;
DROP POLICY IF EXISTS "Authenticated users can delete trechos" ON public.trechos;

CREATE POLICY "Allow all access to trechos" ON public.trechos FOR ALL USING (true) WITH CHECK (true);

-- Tabela: recebimento_itens
DROP POLICY IF EXISTS "Authenticated users can view recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Authenticated users can insert recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Authenticated users can update recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Authenticated users can delete recebimento_itens" ON public.recebimento_itens;

CREATE POLICY "Allow all access to recebimento_itens" ON public.recebimento_itens FOR ALL USING (true) WITH CHECK (true);