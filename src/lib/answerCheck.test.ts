import { describe, expect, it } from 'vitest'
import { checkAnswer, diffWords, normalize, numberToWords, ordinalToWords } from './answerCheck'

describe('normalize', () => {
  it('ignoruje wielkość liter, interpunkcję i rodzaj apostrofu', () => {
    expect(normalize('Sorry, could you say that again?')).toBe('sorry could you say that again')
    expect(normalize('I’m fine!')).toBe(normalize("i'm fine"))
  })

  it('rozwija skróty', () => {
    expect(normalize("I'm")).toBe('i am')
    expect(normalize("don't")).toBe('do not')
    expect(normalize("can't")).toBe('can not')
    expect(normalize('cannot')).toBe('can not')
    expect(normalize("won't")).toBe('will not')
    expect(normalize("it's")).toBe('it is')
    expect(normalize("what's up")).toBe('what is up')
    expect(normalize("let's go")).toBe('let us go')
    expect(normalize("we're")).toBe('we are')
    expect(normalize("I'd like")).toBe('i would like')
    expect(normalize("I've")).toBe('i have')
    expect(normalize("I'll")).toBe('i will')
  })

  it('traktuje gonna / wanna / okay jak pełne formy', () => {
    expect(normalize("I'm gonna")).toBe(normalize('I am going to'))
    expect(normalize('wanna')).toBe('want to')
    expect(normalize('Okay')).toBe('ok')
  })

  it('zrównuje pisownię UK i US', () => {
    expect(normalize('my favourite colour')).toBe(normalize('my favorite color'))
  })

  it('zamienia cyfry na słowa', () => {
    expect(normalize("I'm 25")).toBe(normalize("I'm twenty-five"))
    expect(normalize('at 7:30')).toBe('at seven thirty')
    expect(normalize('one hundred and twenty')).toBe(normalize('120'))
    expect(normalize('a hundred')).toBe('one hundred')
    expect(normalize('the 21st of May')).toBe('the twenty first of may')
  })

  it('nie zmienia dzierżawczego ’s w rzeczownikach na „is”', () => {
    expect(normalize("Tom's car")).toBe('toms car')
  })
})

describe('numberToWords / ordinalToWords', () => {
  it('liczby', () => {
    expect(numberToWords(0)).toBe('zero')
    expect(numberToWords(13)).toBe('thirteen')
    expect(numberToWords(40)).toBe('forty')
    expect(numberToWords(99)).toBe('ninety nine')
    expect(numberToWords(305)).toBe('three hundred five')
    expect(numberToWords(2027)).toBe('two thousand twenty seven')
  })
  it('liczebniki porządkowe', () => {
    expect(ordinalToWords(1)).toBe('first')
    expect(ordinalToWords(2)).toBe('second')
    expect(ordinalToWords(3)).toBe('third')
    expect(ordinalToWords(12)).toBe('twelfth')
    expect(ordinalToWords(20)).toBe('twentieth')
    expect(ordinalToWords(31)).toBe('thirty first')
  })
})

describe('checkAnswer', () => {
  const how = ["How's it going?", 'How is it going?']

  it('poprawna odpowiedź mimo różnic w zapisie', () => {
    expect(checkAnswer('hows it going', how).verdict).toBe('correct')
    expect(checkAnswer('im fine thanks', ["I'm fine, thanks."]).verdict).toBe('correct')
    expect(checkAnswer('i dont know', ["I don't know."]).verdict).toBe('correct')
    expect(checkAnswer("how's it going", how).verdict).toBe('correct')
    expect(checkAnswer('HOW IS IT GOING', how).verdict).toBe('correct')
    expect(checkAnswer("I am 25", ["I'm twenty-five."]).verdict).toBe('correct')
  })

  it('akceptuje warianty z listy', () => {
    const r = checkAnswer('could you repeat that please', ['Sorry, could you say that again?', 'Could you repeat that, please?'])
    expect(r.verdict).toBe('correct')
    expect(r.best).toBe('Could you repeat that, please?')
  })

  it('drobna literówka = prawie dobrze', () => {
    const r = checkAnswer('Nice to meat you', ['Nice to meet you.'])
    expect(r.verdict).toBe('almost')
    expect(r.expected.find((w) => w.text === 'meet')?.kind).toBe('typo')
    expect(r.given.find((w) => w.text === 'meat')?.kind).toBe('typo')
  })

  it('brakujący przedimek = prawie dobrze z zaznaczeniem', () => {
    const r = checkAnswer("I'm student", ["I'm a student."])
    expect(r.verdict).toBe('almost')
    expect(r.expected.map((w) => w.kind)).toEqual(['ok', 'missing', 'ok'])
  })

  it('zła odpowiedź', () => {
    const r = checkAnswer('I have 25 years', ["I'm 25."])
    expect(r.verdict).toBe('wrong')
  })

  it('pusta odpowiedź', () => {
    expect(checkAnswer('   ', ['Hello']).verdict).toBe('empty')
  })

  it('krótkie słowa nie dopuszczają literówek', () => {
    expect(checkAnswer('gim', ['gym']).verdict).toBe('wrong')
  })

  it('słówka: ignoruje przedimek na początku', () => {
    expect(checkAnswer('the gym', ['gym'], { ignoreLeadingArticle: true }).verdict).toBe('correct')
    expect(checkAnswer('gym', ['a gym'], { ignoreLeadingArticle: true }).verdict).toBe('correct')
    expect(checkAnswer('to book', ['book'], { ignoreLeadingArticle: true }).verdict).toBe('correct')
  })
})

describe('diffWords', () => {
  it('zachowuje oryginalny zapis słów', () => {
    const d = diffWords('I going to gym', "I'm going to the gym.")
    expect(d.expected.map((w) => w.text)).toEqual(["I'm", 'going', 'to', 'the', 'gym.'])
    expect(d.expected.find((w) => w.text === 'the')?.kind).toBe('missing')
    expect(d.expected.find((w) => w.text === "I'm")?.kind).toBe('missing')
  })

  it('zaznacza zbędne słowa w odpowiedzi', () => {
    const d = diffWords('I am go to the gym', "I'm going to the gym")
    expect(d.given.find((w) => w.text === 'go')?.kind).not.toBe('ok')
  })
})
