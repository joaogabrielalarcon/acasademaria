// Funções de formatação de campos brasileiros

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Formata CPF ou CNPJ automaticamente baseado no tamanho
 */
export function formatCPFCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  // Se tiver mais de 11 dígitos, é CNPJ
  if (digits.length > 11) {
    return formatCNPJ(value);
  }
  return formatCPF(value);
}

/**
 * Formata CEP: 00000-000
 */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Formata Telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  
  // Celular (11 dígitos) ou fixo (10 dígitos)
  if (digits.length <= 10) {
    // Formato antigo: (00) 0000-0000
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // Celular: (00) 00000-0000
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Formata Inscrição Estadual (formato genérico com pontos a cada 3 dígitos)
 * Nota: O formato varia por estado, este é um formato simplificado
 */
export function formatIE(value: string): string {
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length === 0) return '';
  
  // Formata com pontos a cada 3 dígitos
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  
  return parts.join('.');
}

/**
 * Remove formatação, retornando apenas dígitos
 */
export function unformat(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Hook para gerenciar input com máscara
 */
export function handleMaskedInput(
  value: string,
  formatter: (value: string) => string,
  setter: (value: string) => void
) {
  setter(formatter(value));
}
