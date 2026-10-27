# Jak opublikować aplikację (krok po kroku)

Aplikacja jest hostowana za darmo na **Cloudflare Pages**. Robisz to **raz** — potem każda zmiana
wysłana na gałąź `main` publikuje się sama w ok. 2 minuty.

> Dlaczego Cloudflare, a nie Vercel/Netlify? Repozytorium jest prywatne, a darmowe plany Vercel i Netlify
> blokują publikację zmian, których autorem nie jest właściciel konta (zmiany robi Claude).
> Cloudflare Pages nie ma tego ograniczenia i jest darmowy bez limitu osób.

## 1. Załóż konto (2 min)
1. Wejdź na **https://dash.cloudflare.com/sign-up**.
2. Wpisz e-mail i hasło → **Sign up**. Potwierdź e-mail (link w skrzynce).
3. Jeśli Cloudflare zapyta o domenę albo plan — pomiń (**Skip** / wybierz **Free**). Domena nie jest potrzebna.

## 2. Połącz z GitHubem (3 min)
1. W menu po lewej kliknij **Workers & Pages** (czasem jest w grupie **Compute**).
2. Kliknij niebieski przycisk **Create** (albo **Create application**).
3. Wybierz zakładkę **Pages** → **Import an existing Git repository** → **Get started**.
   - Jeśli widzisz tylko „Workers”, poszukaj na dole linku **„Looking to deploy Pages? Get started”**.
4. Kliknij **Connect GitHub** → zaloguj się na GitHuba.
5. Wybierz **Only select repositories** → zaznacz **eng-app** → **Install & Authorize**.

## 3. Ustaw publikację (1 min)
1. Na liście wybierz **eng-app** → **Begin setup**.
2. Wypełnij:
   - **Project name:** `speak-by-summer` (to będzie adres strony)
   - **Production branch:** `main`
   - **Framework preset:** `React (Vite)` (albo `None` — nieważne, jeśli poniższe pola się zgadzają)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Kliknij **Save and Deploy** i poczekaj 1–3 minuty.
4. Gotowe! Adres aplikacji: **https://speak-by-summer.pages.dev**
   (jeśli nazwa była zajęta, Cloudflare pokaże inny adres — skopiuj go).

## 4. Zainstaluj na telefonie
**Android (Chrome):**
1. Otwórz link w Chrome.
2. Menu **⋮** (prawy górny róg) → **Zainstaluj aplikację** albo **Dodaj do ekranu głównego**.

**iPhone (Safari):**
1. Otwórz link w Safari.
2. Przycisk **Udostępnij** (kwadrat ze strzałką) → **Do ekranu początkowego** → **Dodaj**.

## 5. Przygotuj tryb offline i głosy
1. Otwórz aplikację raz **z internetem** i przejdź pierwsze uruchomienie.
2. Wejdź w **Ustawienia → O aplikacji** — powinno być **„Tryb offline: gotowy ✓”**.
3. Lektor bez internetu (Android): **Ustawienia telefonu → Zamiana tekstu na mowę → Usługi Google →
   Zainstaluj dane głosowe** → pobierz **angielski (Wielka Brytania)** i **polski**.
4. Na iPhonie: **Ustawienia → Dostępność → Treść mówiona → Głosy** → pobierz głos angielski (np. „Daniel”, „Serena”) i polski.

## 6. Aktualizacje
- Gdy Claude wyśle zmiany na `main`, Cloudflare sam zbuduje nową wersję (ok. 2 min).
- W aplikacji na ekranie „Dziś” pojawi się **„Jest nowa wersja aplikacji — Aktualizuj”**. Kliknij i gotowe.
- Twoje postępy zostają w telefonie — aktualizacja ich nie usuwa.

## 7. Kopia zapasowa
Dane są tylko w telefonie. Co 1–2 tygodnie: **Ustawienia → Zapisz kopię do pliku** i wyślij plik sobie
(mail / Dysk Google). Na nowym telefonie: pierwsze uruchomienie → **„Mam kopię postępów — wczytaj”**.

## Dla programisty: test lokalny w tej samej sieci Wi-Fi
```bash
npm install
npm run dev -- --host
```
Na telefonie otwórz adres `http://<IP-komputera>:5173` (IP pokaże się w terminalu jako „Network”).
Tryb offline i instalację najlepiej testować na wersji opublikowanej (HTTPS).
