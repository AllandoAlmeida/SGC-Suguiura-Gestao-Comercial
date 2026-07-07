/**
 * Normaliza qualquer telefone brasileiro pro formato padrao "+55(11) 999999999".
 * Aceita entrada com ou sem +55, com ou sem parenteses/traco/espaco.
 * Retorna null se nao tiver digitos suficientes pra ser um telefone valido.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;

  // So remove o "55" da frente se sobrar DDD+numero valido depois (12 ou 13 digitos totais).
  // Isso evita confundir o DDD 55 (Rio Grande do Sul) com o codigo do pais.
  let rest = digits;
  if (rest.startsWith("55") && rest.length > 11) {
    rest = rest.slice(2);
  }
  if (rest.length < 10 || rest.length > 11) return null;

  const ddd = rest.slice(0, 2);
  const number = rest.slice(2);
  return `+55(${ddd}) ${number}`;
}