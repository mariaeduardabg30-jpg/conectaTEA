/**
 * Código único de vinculação entre a conta do dependente e a do responsável.
 *
 * O código tem 8 caracteres de um alfabeto sem letras/números confusos
 * (sem O, 0, I, 1), inspirado em códigos de convites. É exibido separado
 * em dois blocos (XXXX-XXXX) para facilitar a leitura.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateLinkCode(existing: Set<string> = new Set()): string {
  for (;;) {
    let code = "";
    for (let index = 0; index < 8; index += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!existing.has(code)) return code;
  }
}

/** Remove tudo que não é letra/número e padroniza em maiúsculas. */
export function normalizeLinkCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Formata o código como XXXX-XXXX para exibição. */
export function formatLinkCode(code: string | null | undefined): string {
  if (!code) return "";
  const clean = normalizeLinkCode(code);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
