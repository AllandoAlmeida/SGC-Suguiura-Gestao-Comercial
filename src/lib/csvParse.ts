/** Faz o parse de uma linha CSV respeitando aspas e o separador ";". */
export function parseCsvLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/** Quebra o conteudo do arquivo em linhas, ignorando linhas vazias e o BOM inicial. */
export function splitCsvLines(content: string): string[] {
  return content
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\n/)
    .filter((line) => line.trim().length > 0);
}

/** Converte "dd/MM/yyyy" (formato do formatDate) para Date. Retorna null se invalido. */
export function parseBrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Converte "1234,56" (virgula decimal) para number. Retorna null se invalido. */
export function parseBrNumber(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isNaN(num) ? null : num;
}