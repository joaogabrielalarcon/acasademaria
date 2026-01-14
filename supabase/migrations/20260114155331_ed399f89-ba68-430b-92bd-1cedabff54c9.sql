-- Adicionar campos de dados pessoais na tabela colaboradores
ALTER TABLE public.colaboradores
ADD COLUMN data_nascimento date,
ADD COLUMN cpf text;