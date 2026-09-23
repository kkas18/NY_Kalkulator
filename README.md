# Kalkulator – installérbar PWA

En selvstendig kalkulator på norsk. Den har standard, vitenskapelig og programmermodus, historikk, minne, DEG/RAD, tema, tastaturstøtte og offlinebruk. Appikonet er tegnet som vektor og leveres også i PNG-format for installasjon på Android og iOS.

Grensesnittet viser regnefelt, et lite modusvalg og tastatur. Sveip ned på regnefeltet for historikk. Innstillinger åpnes fra ikonet øverst til høyre; tema velges der.

## Legg ut og installer

1. Pakk ut ZIP-filen, og last opp **hele** mappen med samme filstruktur til et nettsted med **HTTPS**. Innholdet kan også legges direkte i nettstedets rotmappe. Ingen bygging, npm-pakker eller API-nøkler trengs.
2. Åpne nettadressen på Android i Chrome og bruk **Installer app** i nettlesermenyen, eller velg **Installer kalkulator** under Innstillinger når knappen vises. På iPhone: åpne i Safari, trykk **Del** → **Legg til på Hjem-skjermen**.
3. Åpne appen én gang mens du er på nett. Etter det ligger appfilene i lokal hurtigbuffer, og kalkulatoren fungerer uten nett. Historikk og innstillinger ligger lokalt på enheten.

For lokal testing kan du kjøre `python3 -m http.server 8000` inne i mappen og åpne `http://localhost:8000`. Å åpne `index.html` direkte som `file://` gir ikke PWA-installasjon eller service worker.

Ved ny versjon: oppdater filene på serveren og endre `CACHE`-navnet i `sw.js`, slik at offlinefilene oppdateres. Ingen APK er inkludert; dette er en installérbar PWA.

## Bruk

- Standard tastatur har 4 × 5 like høye knapper, inkludert `=`. Vitenskapelige funksjoner ligger over det samme tastaturet. Sveip sidelengs mellom Standard, Vitenskapelig og Programmer; trykk på modusnavnet som alternativ.
- Programmer viser HEX, DEC, OCT og BIN under hverandre. Valgt grunnlag har en svak toning i sin egen farge og en smal markør. Sveip sidelengs på displayet for å gå mellom tallgrunnlagene (HEX → DEC → OCT → BIN, med overgang tilbake til HEX), eller trykk på ønsket linje. Tastaturet viser bare gyldige siffer: HEX 0–9/A–F, DEC 0–9, OCT 0–7 og BIN 0–1. HEX har en egen, smal rad for A–F; bitoperasjonene ligger i én rad. Alle fire linjer viser den samme verdien og har egne, dempede fargetoner.
- Programmer bruker 32-bits heltall med fortegn. HEX/OCT/BIN viser negative tall som toerkomplement; DEC viser fortegnet. Operasjoner er `+`, `−`, `×`, heltallsdivisjon, AND, OR, XOR, NOT og aritmetiske skift. Flere operasjoner etter hverandre beregnes fortløpende fra venstre mot høyre. Overløp går rundt på 32 bit. Skiftantallet bruker de fem laveste bitene (0–31). Desimalberegningen i de andre modusene holdes separat når du bytter modus.
- Sveip ned på resultatfeltet for historikk. På enheter med tastatur kan du fokusere feltet og trykke Enter. Historikkpanelet kan lukkes med ×, ved å trykke utenfor eller ved å sveipe ned fra panelets topp.
- `INV` gir omvendte funksjoner, kubikkrot, kubikk og n-te rot. `ANS` henter siste svar. `DEG`/`RAD` kan endres i vitenskapelig modus eller Innstillinger.
- `%` deler foregående verdi på 100; for eksempel `200 × 15 % = 30`. Vitenskapelige funksjoner åpner en parentes som `=` kan lukke automatisk.
- Hold inne en avansert funksjonsknapp, også bitoperasjonene i Programmer, i omtrent 0,6 sekunder for en guide med fremgangsmåte, eksempel og begrensninger. Bevegelser under sveip avbryter langtrykket.
- `⌫` sletter ett tegn. Langtrykk tømmer uttrykket. Historikk kan trykkes for å hente et resultat. Data slettes når nettleserens nettsteddata tømmes.

Merk: Beregningene bruker JavaScript-tall (IEEE 754), og visningen avrundes til 12 signifikante sifre.
