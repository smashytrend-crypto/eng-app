import type { ItemType, Register } from '../content/schema'

export const TYPE_LABELS: Record<ItemType, string> = {
  phrase: 'Zwrot',
  word: 'Słówko',
  pattern: 'Wzorzec zdania',
  dialog: 'Mini-dialog',
}

export const REGISTER_LABELS: Record<Register, string> = {
  casual: 'luźno',
  neutral: 'neutralnie',
  polite: 'grzecznie',
}

export const MODE_LABELS: Record<string, string> = {
  recall: 'Powiedz po angielsku',
  type: 'Napisz po angielsku',
  cloze: 'Uzupełnij lukę',
  scramble: 'Ułóż zdanie',
  dictation: 'Dyktando',
  shadow: 'Powtarzaj za lektorem',
  own: 'Twoje zdanie',
  dialog: 'Odegraj dialog',
}
