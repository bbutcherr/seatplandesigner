// Helpers for generating seat labels.

/** Convert a 0-based index to a spreadsheet-style row letter: 0->A, 25->Z,
 *  26->AA, 27->AB ... */
export function indexToAlpha(index: number): string {
  let n = index
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

export type RowLabelMode = 'alpha' | 'numeric'

export function rowLabel(index: number, mode: RowLabelMode, start: string): string {
  if (mode === 'numeric') {
    const base = parseInt(start, 10)
    return String((isNaN(base) ? 1 : base) + index)
  }
  // alpha — offset by the starting letter
  const offset = start.trim()
    ? start.trim().toUpperCase().charCodeAt(0) - 65
    : 0
  return indexToAlpha(index + offset)
}

/** Build a seat label from a row token, a seat number, and a prefix. */
export function seatLabel(
  prefix: string,
  row: string,
  seatNo: number,
): string {
  return `${prefix}${row}${seatNo}`
}

/** Extract the row token from a seat label by stripping the trailing seat
 *  number: "A12" -> "A", "AA3" -> "AA", "Circle-A5" -> "Circle-A". A label
 *  with no trailing number returns itself. */
export function rowToken(label: string): string {
  const m = /^(.*?)(\d+)\s*$/.exec(label)
  return (m ? m[1] : label).trim() || label
}
