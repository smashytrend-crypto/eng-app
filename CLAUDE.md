# Speak by Summer — instrukcja dla Claude

Osobista aplikacja PWA do nauki **mówienia** po angielsku dla Domina (poziom ok. A2, cel: swobodne
rozmowy do 1.07.2027). Pełne wymagania: `docs/SPEC.md` (źródło prawdy). Ten plik opisuje, jak projekt
jest zbudowany i jak dodawać treści.

## Jak rozmawiać z właścicielem
- Domin **nie jest programistą**. Odpisuj po polsku, krótko i prosto: co zrobiłeś + co dokładnie ma
  kliknąć/wpisać. Bez żargonu, bez długich wyjaśnień kodu.
- Decyzje techniczne podejmuj sam (najprostsze sensowne rozwiązanie) i uzasadnij je jednym zdaniem.
- Po każdej fazie/module: testy + build + walidacja, commit, push, 3–5 zdań podsumowania.

## Polecenia
| Polecenie | Co robi |
|---|---|
| `npm install` | instaluje zależności |
| `npm run dev` | serwer deweloperski (`npm run dev -- --host` = dostęp z telefonu w tej samej sieci Wi-Fi) |
| `npm test` | testy Vitest (harmonogram, sprawdzanie odpowiedzi, plan) |
| `npm run validate` | walidacja treści w `content/` (zod + unikalne id + duplikaty + proporcje) |
| `npm run build` | typecheck + build produkcyjny do `dist/` (z PWA) |
| `npm run preview` | podgląd builda |

Przed każdym commitem: `npm run validate && npm test && npm run build` — wszystko musi przejść.

## Technologia (i dlaczego)
- **Vite + React + TypeScript + Tailwind CSS v4** — mobile-first, duże przyciski, UI po polsku.
  Motyw: `system` / `light` / `dark` (klasa `.dark` na `<html>`, domyślnie wg systemu).
- **PWA (vite-plugin-pwa, generateSW)** — wszystkie pliki (w tym treści) są w precache → działa offline.
- **Dexie.js (IndexedDB)** — wszystkie dane użytkownika lokalnie w telefonie. Brak backendu i kont.
- **ts-fsrs** — harmonogram powtórek. Oceny: Again/Hard/Good/Easy = „Nie pamiętam / Trudne / Dobrze / Łatwe”.
- **zod** — schemat treści, wspólny dla aplikacji i skryptu walidacji.
- **Web Speech API** — `speechSynthesis` (lektor EN i PL), `SpeechRecognition` (faza 2) z fallbackiem
  „powiedz na głos i oceń się”.
- **Routing: własny prosty router na `#hash`** — działa offline i na każdym hostingu bez konfiguracji;
  przycisk „wstecz” w telefonie cofa ekran zamiast zamykać aplikację.
- **Hosting: Cloudflare Pages** (darmowy). Repo jest prywatne: GitHub Pages wymaga płatnego planu, a darmowe
  Vercel/Netlify blokują wdrożenia commitów, których autor nie jest właścicielem konta (commity robi Claude).
  Każdy push na `main` = automatyczne wdrożenie. Instrukcja dla laika: `docs/DEPLOY.md`.
  `public/_headers` ustawia cache (sw.js i index.html bez cache, assets na rok).

## Struktura folderów
```
content/                    TREŚCI (JSON) — tu dodajesz moduły
  stages.json               lista 8 etapów (id, tytuł, opis, szacowane tygodnie)
  stage-1/01-greetings.json jeden plik = jeden moduł
  stage-1/02-....json
scripts/validate.ts         npm run validate
docs/SPEC.md                specyfikacja właściciela
docs/DEPLOY.md              instrukcja wdrożenia krok po kroku
public/                     ikony PWA, favicon
src/
  main.tsx, App.tsx         start aplikacji, router, dolna nawigacja
  content/schema.ts         schemat zod + typy TS (Item, Module, Stage)
  content/index.ts          ładuje wszystkie content/**/*.json (import.meta.glob) — nowe pliki
                            są wykrywane automatycznie, bez zmian w kodzie
  db/                       Dexie: tabele, ustawienia, eksport/import kopii zapasowej
  lib/                      czysta logika (bez Reacta) + testy *.test.ts obok plików:
    srs.ts                    FSRS: tworzenie kart, ocena, retencja dla gramatyki
    lessonQueue.ts            budowanie dzisiejszej lekcji (limity, zaległości, nowe elementy)
    answerCheck.ts            tolerancyjne sprawdzanie wpisanej odpowiedzi + diff
    dates.ts                  „dzień nauki” (zaczyna się o 4:00), seria, daty
    plan.ts                   (faza 3) przeliczanie planu do daty docelowej
  speech/                   TTS (wybór najlepszego głosu EN/PL), rozpoznawanie mowy (faza 2)
  screens/                  ekrany: Today, Lesson, Onboarding, Settings, (później Path, Phrasebook,
                            Audio, Progress)
  components/               wspólne komponenty UI (Button, Card, BottomNav, ...)
```

## Dane użytkownika (Dexie)
- `cards` — stan FSRS dla każdego elementu (klucz = `itemId`). **Postęp jest przypięty do `id` elementu.**
- `reviewLogs` — historia ocen (do statystyk i listy „trudnych”).
- `settings` — jeden rekord: data docelowa, nowe/dzień, max powtórek/dzień, głos, tempo, motyw.
- `days` — aktywność per dzień nauki (czas, liczba kart) → seria i kalendarz.
- `session` — bieżąca lekcja (kolejka + pozycja), żeby po przerwaniu wrócić w to samo miejsce.
- (faza 3) `customItems`, `favorites`, `trips`.
- Zapis po **każdej** karcie (transakcja: karta + log + dzień + sesja).
- Eksport/import: jeden plik JSON ze wszystkimi tabelami + `schemaVersion`.

## Zasady nauki zaszyte w logice
- Kierunek główny **PL → EN**. EN → PL tylko przy pierwszej prezentacji nowego elementu.
- Nowy element: prezentacja (EN, odsłuch, PL, kiedy używać, przykład, uwaga, wymowa) → od razu szybkie
  przypomnienie PL → EN. Kroki nauki FSRS (1 min, 10 min) wracają jeszcze w tej samej lekcji.
- Limity: domyślnie 8 nowych i max 60 powtórek dziennie. Zaległości ponad limit przechodzą na kolejne
  dni (najpierw najbardziej zaległe); przy dużych zaległościach liczba nowych elementów maleje.
- Elementy z tagami gramatyki priorytetowej (`gr:present-simple`, `gr:there-is-are`, `gr:going-to`,
  `gr:present-continuous-future`) mają wyższą docelową retencję (0,95 zamiast 0,90) → częstsze powtórki.
- „Dzień nauki” zaczyna się o 4:00 (nocna sesja po imprezie liczy się do poprzedniego dnia).
- Seria: 1 dzień przerwy w tygodniu (7 dni kroczących) nie zrywa serii.
- „Opanowany” element = interwał FSRS ≥ 21 dni.

## Schemat treści

### Plik modułu `content/stage-N/NN-slug.json`
```json
{
  "module": {
    "id": "s1.greetings",
    "stage": 1,
    "order": 1,
    "title": "Powitania i pożegnania",
    "titleEn": "Greetings & goodbyes",
    "description": "Krótko po polsku: czego się nauczysz i w jakiej sytuacji się przyda.",
    "tags": ["general"]
  },
  "items": [ /* elementy, patrz niżej */ ]
}
```
- `module.tags` służą do priorytetu przed wyjazdem: `travel`, `festival` (faza 3) oraz `general`.
- Nazwa pliku: dwucyfrowy numer = `module.order`, potem slug po angielsku.

### Element (`Item`)
| Pole | Typ | Opis |
|---|---|---|
| `id` | string | `s{etap}.{slug-modułu}.{slug-elementu}`, np. `s1.greetings.how-are-you`. Małe litery, cyfry, `-`, `.`. **Niezmienne po publikacji.** |
| `type` | `phrase` \| `word` \| `pattern` \| `dialog` | zwrot / słówko / wzorzec zdania / mini-dialog |
| `stage` | 1–8 | musi zgadzać się z `module.stage` |
| `module` | string | musi zgadzać się z `module.id` |
| `order` | int ≥ 1 | kolejność w module (unikalna w module); najczęstsze i najważniejsze najpierw |
| `en` | string | angielski (dla `pattern`: rama z `___`; dla `dialog`: tytuł sytuacji) |
| `pl` | string | naturalne polskie tłumaczenie (dla `pattern` też z `___`) |
| `alternatives` | string[] | inne akceptowane odpowiedzi EN (tylko naprawdę inne sformułowania — skróty typu I'm/I am, wielkość liter i interpunkcję aplikacja obsługuje sama) |
| `usage` | string | po polsku: kiedy i z kim tego użyć (1 zdanie) |
| `register` | `casual` \| `neutral` \| `polite` | |
| `example` | `{ en, pl, speaker? }[]` | min. 1 kwestia; `dialog`: 2–6 kwestii z `speaker` `"A"`/`"B"`; `pattern`: 2–3 wypełnione przykłady (z nich powstają zadania PL → EN) |
| `collocations` | string[] | **wymagane dla `word`** (min. 2 typowe połączenia), opcjonalne dla innych |
| `note` | string? | typowy błąd Polaków, fałszywy przyjaciel, różnica UK/US, mini-gramatyka (max 2–3 zdania) |
| `pronunciation` | string? | wskazówka wymowy dla Polaka, np. `„θ” jak seplenione „s”: think ≈ fink — NIE „tink”` |
| `tags` | string[] | patrz konwencja tagów |
| `level` | `A2` \| `B1` \| `B2` | |

### Konwencja tagów
- Gramatyka: `gr:present-simple`, `gr:there-is-are`, `gr:going-to`, `gr:present-continuous-future`,
  `gr:past-simple`, `gr:present-perfect`, `gr:questions-do`, `gr:articles`, `gr:can`, `gr:would-like`.
- Tematy: `gym`, `music`, `festival`, `games`, `travel`, `food`, `work`, `smalltalk`, `numbers`, `time`.
- Specjalne: `rescue` (zwroty ratunkowe), `polish-trap` (pułapka dla Polaków), `uk-us` (różnica UK/US),
  `slang`, `idiom`.

## Zasady jakości treści
1. **Naturalny, współczesny angielski mówiony** — tak mówią native speakerzy (np. „How's it going?”,
   „No worries”, „I'm off”), nie podręcznik („How do you do?”). Jeśli coś brzmi sztywno — zmień.
2. **Polskie tłumaczenia naturalne**, nie słowo w słowo („Nie ma sprawy” zamiast „Żadnych zmartwień”).
3. Każdy element ma **kontekst**: przykład z życia (siłownia, techno/house, Tomorrowland, gry, podróże,
   praca fizyczna, Szczecin) lub mini-dialog.
4. **Pułapki Polaków** w `note` + tag `polish-trap`: actually ≠ aktualnie, eventually ≠ ewentualnie,
   a/the, „do” w pytaniach, „I'm 25” (nie „I have 25 years”), sympathetic ≠ sympatyczny, itp.
5. Najpierw **najczęstsze i najbardziej przydatne**; idiomy i slang w późniejszych etapach.
6. **Gramatyka przemycona we wzorcach** (`pattern`) + max 2–3 zdania wyjaśnienia po polsku w `note`.
   Gramatykę priorytetową (Present Simple — nawyki, there is/are z l. mnogą, going to / Present
   Continuous dla ustaleń) wplataj w każdy etap, gdzie pasuje.
7. Proporcje modułu (25–40 elementów): ok. **50% `phrase`, 30% `word`, 20% `pattern` + 1–2 `dialog`**
   (walidator ostrzega przy dużych odchyleniach).
8. Bez duplikatów: ten sam `en` (po normalizacji) nie może wystąpić dwa razy w całym `content/`.
   Jeśli zwrot naturalnie pasuje do dwóch modułów — zostaw go w pierwszym, w drugim użyj w przykładzie.
9. Brytyjska pisownia domyślnie (lektor domyślnie en-GB); różnice UK/US w `note` + tag `uk-us`.

## Jak dodać moduł („dodaj moduł X do etapu Y”)
1. Przeczytaj `content/stages.json` i **wszystkie** istniejące moduły etapu Y (oraz pobieżnie
   wcześniejsze etapy), żeby nie dublować zwrotów i trzymać się progresji.
2. Utwórz `content/stage-Y/NN-slug.json` (NN = kolejny numer w etapie) z nagłówkiem `module`.
3. Napisz 25–40 elementów wg proporcji i zasad jakości powyżej. `order` = od najważniejszego.
   Użyj zainteresowań Domina w przykładach. Dodaj 1–2 mini-dialogi.
4. **Samokontrola** (przejdź listę element po elemencie):
   - Czy native speaker powiedziałby to dokładnie tak? Czy polski brzmi naturalnie?
   - Poprawność: przedimki, czasy, pisownia, apostrofy (’ vs ' — używaj prostego `'`).
   - Czy `alternatives` obejmują inne naturalne odpowiedzi, które Domin mógłby powiedzieć?
   - Czy każdy `word` ma `collocations` i przykład? Czy `pattern` ma `___` i 2–3 przykłady?
   - Duplikaty z innymi modułami?
5. Uruchom `npm run validate` → popraw błędy/ostrzeżenia. Potem `npm test` i `npm run build`.
6. Commit (`content: add stage Y module NN slug`) i push na `main` → Cloudflare Pages wdroży sam w ~2 min.
7. Napisz Dominowi 2–3 zdania: jaki moduł, ile elementów, kiedy pojawi się w lekcjach (nowe elementy
   wchodzą w kolejności etap → moduł → order; w fazie 3 wyjazd może dać priorytet modułom
   `travel`/`festival`).

Nowy moduł nie wymaga zmian w kodzie — `src/content/index.ts` wykrywa pliki automatycznie.
**Nigdy nie zmieniaj ani nie usuwaj `id` istniejących elementów** (postęp jest do nich przypięty).
Poprawianie tekstu (`en`, `pl`, przykładów) jest OK.

## Fazy
- [ ] Faza 1 — MVP: lekcja (FSRS, karty PL → EN, wpisywanie, odsłuch), onboarding, ustawienia,
      eksport/import, treści Etapu 1, PWA, wdrożenie.
- [ ] Faza 2 — mówienie i ćwiczenia: luki, rozsypanki, dyktando, rozpoznawanie mowy, shadowing,
      zadanie mówione, „Ćwicz rozmowę z Claude”.
- [ ] Faza 3 — prowadzenie: Ścieżka do wakacji (plan, wyjazdy), rozmówki, własne zwroty, trudne,
      tryb audio, postępy.
- [ ] Faza 4 — treści: kolejne etapy, po jednym module, zawsze z walidacją.
