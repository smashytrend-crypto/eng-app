# Projekt: „Speak by Summer” – moja aplikacja do nauki mówienia po angielsku

> Oryginalna specyfikacja od właściciela projektu (Domin). To jest źródło prawdy dla wymagań.
> Decyzje techniczne podjęte w trakcie pracy są opisane w `CLAUDE.md`.

## Twoja rola
Jesteś doświadczonym programistą aplikacji webowych i metodykiem nauczania języków (podejście leksykalne, powtórki rozłożone w czasie, aktywne przypominanie). Zbuduj dla mnie osobistą aplikację, która poprowadzi mnie od podstaw do swobodnych rozmów po angielsku.

## O mnie
- Domin, mieszkam w Szczecinie. Angielski: podstawy (ok. A2), nie umiem jeszcze swobodnie mówić.
- Cel: swobodnie rozmawiać po angielsku do wakacji 2027 (data docelowa domyślnie 1.07.2027, do zmiany w ustawieniach).
- Najszybciej uczę się przez gotowe zwroty i słówka w kontekście, a nie przez wykłady z gramatyki.
- Pracuję fizycznie, więc lekcja ma trwać 10–20 minut, działać na telefonie i dać się przerwać w dowolnym momencie.
- Zainteresowania (używaj ich w przykładach i modułach): siłownia, muzyka elektroniczna (techno, house, EDM, dubstep), festiwale (co roku jeżdżę na Tomorrowland), gry, podróże.
- Gramatyka do wzmocnienia (wplataj ją we wzorce zdań i powtarzaj częściej): Present Simple dla nawyków, there is / there are z liczbą mnogą, mówienie o planach (going to, Present Continuous dla ustaleń).
- Nie jestem programistą. Pisz do mnie po polsku, krótko i prosto: co zrobiłeś i co dokładnie mam wpisać albo kliknąć.

## Zasady nauki (najważniejsze)
1. Mówienie przed rozpoznawaniem: główny kierunek ćwiczeń to PL → EN (widzę po polsku, mówię lub piszę po angielsku). EN → PL tylko przy pierwszym poznaniu elementu.
2. Wszystko w kontekście: każdy zwrot i słówko ma przykład z życia lub mini-dialog.
3. Powtórki według algorytmu FSRS (biblioteka ts-fsrs). Oceny: „Nie pamiętam / Trudne / Dobrze / Łatwe”.
4. Codziennie coś na głos: każda lekcja kończy się krótkim zadaniem mówionym.
5. Gramatyka przemycona we wzorcach zdań (np. „I usually ___ after work.”) + najwyżej 2–3 zdania wyjaśnienia po polsku.
6. Najpierw najczęstsze i najbardziej przydatne zwroty, idiomy i slang później.
7. Zwroty ratunkowe od pierwszego dnia („Sorry, could you say that again?”, „How do you say ___ in English?”, „It's a kind of…”), żebym umiał się dogadać, nawet gdy zabraknie mi słowa.

## Funkcje

### 1. Dzisiejsza lekcja (ekran główny, jeden duży przycisk „Zacznij”)
- Powtórki z FSRS (domyślnie max 60 dziennie; zaległości po przerwie rozkładaj na kolejne dni).
- Nowe elementy (domyślnie 8 dziennie, regulowane): prezentacja → odsłuch → przykład → od razu szybkie przypomnienie.
- Mieszanka ćwiczeń:
  - karta PL → EN: mówię na głos, odkrywam odpowiedź, oceniam się,
  - wpisywanie z tolerancyjnym sprawdzaniem (wielkość liter, interpunkcja, apostrofy, I'm = I am, akceptowane warianty; drobna literówka = „prawie dobrze” z podświetleniem różnic),
  - uzupełnianie luki, układanie zdania z rozsypanki, dyktando ze słuchu, własne zdanie ze wzorca.
- Mówienie: rozpoznawanie mowy (Web Speech API) porównuje to, co powiedziałem, z poprawną wersją i pokazuje pominięte lub błędne słowa. Gdy przeglądarka tego nie obsługuje: „powiedz na głos i oceń się”.
- Shadowing: odsłuch w tempie 0,8× i 1×, powtarzam za lektorem.
- Zadanie mówione dnia, np. „Powiedz 3 zdania o swoim weekendzie: I went to…, It was…, Next weekend I'm going to…”.
- Przycisk „Ćwicz rozmowę z Claude”: kopiuje do schowka gotowy prompt po angielsku (scenka + zwroty z tego tygodnia + prośba, żeby Claude zadawał po jednym pytaniu i krótko poprawiał moje błędy po polsku). Wklejam go do aplikacji Claude.
- Postęp zapisuje się po każdej karcie.

### 2. Ścieżka do wakacji
- Etapy (niżej) z odliczaniem dni do daty docelowej.
- Plan sam się przelicza: ile nowych elementów dziennie potrzebuję, żeby zdążyć, i czy jestem przed planem, czy za nim (bez straszenia).
- Mogę dodać wyjazd (data + okazja): moduły podróżne i festiwalowe dostają wtedy priorytet przed tym terminem.
- Misja weekendowa: dłuższa symulacja sytuacji z materiałem z całego tygodnia.

### 3. Rozmówki
- Wszystkie zwroty według etapów i sytuacji, wyszukiwarka (PL i EN), ulubione.
- Lista „trudnych” (elementy, które często mi nie wychodzą) z dodatkowymi podpowiedziami.
- Działa offline, więc na wyjeździe służy jako rozmówki.
- Dodawanie własnych zwrotów i słówek (trafiają do powtórek).

### 4. Tryb audio (bez patrzenia na ekran)
- Lektor czyta zdanie po polsku → pauza na moją odpowiedź na głos → wersja angielska dwa razy. Do słuchania w drodze albo na siłowni. Użyj Screen Wake Lock, żeby ekran nie gasł.

### 5. Postępy
- Liczba opanowanych zwrotów i słówek (np. interwał ≥ 21 dni), seria dni (1 dzień przerwy w tygodniu nie zrywa serii), kalendarz aktywności, czas nauki. Bez nachalnej grywalizacji.

### 6. Start i ustawienia
- Pierwsze uruchomienie: data docelowa, liczba nowych elementów dziennie, głos (en-GB / en-US), tempo mowy + szybki test „to już znam” z podstaw, żebym nie tracił czasu na to, co umiem.
- Eksport i import postępów do pliku (kopia zapasowa, bo dane są tylko w telefonie).

## Treści

### Etapy (ok. 35 tygodni, kolejność możesz dopracować)
1. Fundamenty rozmowy: powitania, przedstawianie się, small talk, zwroty ratunkowe, liczby, godziny, daty.
2. O mnie: skąd jestem, praca i plany zawodowe, rodzina, mieszkanie, mój dzień i nawyki.
3. Moje pasje: siłownia, muzyka elektroniczna, festiwale, gry.
4. Podróże: lotnisko, hotel i hostel, transport, pytanie o drogę, restauracja i bar, zakupy, problemy i reklamacje, apteka i lekarz.
5. Opowiadanie: co się wydarzyło (Past Simple), doświadczenia (Have you ever…?), plany i marzenia.
6. Opinie i emocje: zgadzanie się i niezgadzanie, reakcje („No way!”, „That makes sense.”), uczucia, porównania.
7. Naturalny angielski: najczęstsze phrasal verbs, wypełniacze (you know, I mean, kind of), codzienne idiomy, imprezy i festiwale (poznawanie ludzi z innych krajów, umawianie się w tłumie, wymiana kontaktów).
8. Próba generalna: symulacje całych sytuacji z wyjazdu + powtórka najtrudniejszych elementów.

### Typy elementów
- zwrot (gotowe wyrażenie),
- słówko (zawsze z przykładem i typowymi połączeniami),
- wzorzec zdania (rama z luką, np. „I'm planning to ___.”),
- mini-dialog (2–6 kwestii, odsłuch dwoma głosami, mogę odegrać jedną z ról).

### Pola elementu (typy w TypeScript + walidacja zod)
id, type, stage, module, order, en, pl, alternatives[] (akceptowane warianty), usage (kiedy używać, po polsku), register (casual / neutral / polite), example (kwestie EN + PL), note (opcjonalnie: typowy błąd Polaków, fałszywy przyjaciel, różnica UK/US), pronunciation (opcjonalnie: wskazówka wymowy dla Polaka), tags[], level (A2 / B1 / B2).

### Jakość treści
- Naturalny, współczesny angielski mówiony: tak, jak mówią native speakerzy, a nie podręczniki.
- Polskie tłumaczenia naturalne, nie słowo w słowo.
- Uwzględniaj pułapki Polaków: actually ≠ aktualnie, eventually ≠ ewentualnie, przedimki a / the, brak „do” w pytaniach, „I have 25 years” zamiast „I'm 25”.
- Moduł = 25–40 elementów: ok. 50% zwrotów, 30% słówek, 20% wzorców + 1–2 mini-dialogi.
- Po każdym module zrób samokontrolę (naturalność, poprawność, duplikaty) i uruchom skrypt walidacji.
- Docelowo ok. 1500 elementów. W pierwszej fazie pełny Etap 1, kolejne etapy w następnych sesjach.

## Technologia
- Vite + React + TypeScript + Tailwind CSS. Mobile-first, duże przyciski, jasny i ciemny motyw (domyślnie systemowy), interfejs po polsku.
- PWA (vite-plugin-pwa): instalacja na ekranie telefonu i działanie offline.
- Dane lokalnie w IndexedDB (Dexie.js). Bez backendu, kont i płatnych API, koszt 0 zł.
- Treści w plikach JSON w repozytorium + skrypt `npm run validate` (unikalne id, wymagane pola, duplikaty).
- Audio: Web Speech API, czyli speechSynthesis (wybierz najlepszy dostępny głos angielski i polski) i SpeechRecognition z fallbackiem.
- Testy (Vitest): harmonogram powtórek, sprawdzanie odpowiedzi, przeliczanie planu.
- Hosting: najprostsza darmowa opcja (np. Vercel, Netlify albo GitHub Pages) + instrukcja krok po kroku dla laika.

## Sposób pracy
1. Zapisz tę specyfikację jako docs/SPEC.md. W CLAUDE.md opisz projekt, strukturę folderów, schemat treści, zasady jakości i instrukcję „jak dodać moduł”, żebym w kolejnych sesjach mógł napisać tylko: „dodaj moduł X do etapu Y”.
2. Zanim zaczniesz kodować, pokaż mi krótki plan (architektura, struktura folderów, fazy) i poczekaj na moje OK.
3. Pracuj w fazach. Po każdej uruchom testy i build, zrób commit w gicie i napisz w 3–5 zdaniach, co działa i jak to sprawdzić, także na telefonie w tej samej sieci Wi-Fi.
   - Faza 1 (MVP do codziennej nauki): Dzisiejsza lekcja (FSRS, karty PL → EN, wpisywanie, odsłuch), pierwsze uruchomienie, ustawienia, eksport i import, treści Etapu 1, PWA i wdrożenie na hosting.
   - Faza 2 (mówienie i ćwiczenia): luki, rozsypanki, dyktando, rozpoznawanie mowy, shadowing, zadanie mówione, „Ćwicz rozmowę z Claude”.
   - Faza 3 (prowadzenie): Ścieżka do wakacji z przeliczaniem planu i wyjazdami, rozmówki, własne zwroty, trudne elementy, tryb audio, postępy.
   - Faza 4 (treści): kolejne etapy, po jednym module, zawsze z walidacją.
4. Gdy trzeba podjąć decyzję techniczną, wybierz najprostsze sensowne rozwiązanie i krótko je uzasadnij, zamiast mnie dopytywać.

## Faza 1 jest gotowa, gdy
otwieram link na telefonie, dodaję aplikację do ekranu głównego, robię pełną lekcję bez internetu, a po zamknięciu i ponownym otwarciu mój postęp nadal jest zapisany.
