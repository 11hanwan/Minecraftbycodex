# Vildmark — Strandad

Ett webbaserat survivalspel i förstaperson med naturlig terräng, skog, stränder och en egen stil inspirerad av Tribals-liknande överlevnad. Du börjar **tomhänt**. Inga verktyg eller material ges gratis.

## Spela i Chrome / på Chromebook

När GitHub Pages-publiceringen lyckats: **https://11hanwan.github.io/Minecraftbycodex/**

Klicka på **Börja tomhänt**. Använd mus och tangentbord. Du behöver ingen terminal eller Linux för att spela den publicerade versionen. Esc pausar och släpper muspekaren. Välj **Grafik: låg** i pausmenyn om datorn har svårt att hålla jämn bildfrekvens.

## Från strand till läger

1. Plocka grenar, småsten och fiber på marken med **E**. Plocka bär för mat. Du kan även bearbeta träd för hand, men det tar längre tid och ger mindre trä.
2. Öppna **C** och tillverka en stenyxa (4 trä, 3 sten, 2 fiber). Tillverka därefter en hacka för sten och järnmalm, och ett spjut för jakt.
3. Bygg en lägereld via **C → Läger & byggande**. Välj en byggdel, sikta ned på torr mark 2–6 meter framför dig och vänsterklicka. **R** roterar; **1** avbryter byggläget. Material förbrukas först vid placering.
4. Drick sötvatten med **E** nära källan väster om startstranden. **F** äter stekt kött eller bär. Jaga hjortar med spjut och stek köttet vid en lägereld. Rått kött äts inte automatiskt.
5. Bygg ett skydd med grund, väggar, dörr och tak. Dörrar öppnas med E. Eldar skrämmer vargar och återställer hälsa om du inte svälter eller är uttorkad.
6. Bygg en arbetsbänk, därefter en smältugn nära bänken. Bränn träkol vid elden och smält sedan järnmalm med träkol i ugnen. Tillverka en järnyxa vid bänken för effektivare insamling.
7. Lägg resurser i kistor med **E** och använd en sovplats för att hoppa till morgonen när inga vargar är nära. Samlade resurser växer fram igen efter en tid.

**Styrning:** WASD går · musen tittar · Shift springer · mellanslag hoppar · 1 händer · 2 yxa · 3 hacka · 4 spjut · 5 järnyxa · E interagerar · C tillverkar · B öppnar byggrecept · F äter · M växlar karta · H öppnar hjälp.

Sju överlevnadsmål guidar progressionen. Det finns dag/natt, hunger, törst, uthållighet, hjortar och nattliga vargar. Nio resurstyper och sexton recept ingår. Arbetsstationer måste finnas inom sju meter för sina recept. Lägerdelar placeras fritt på ett tvåmetersrutnät; världen består inte av redigerbara voxelblock.

## Sparning

Framsteg sparas lokalt i webbläsaren: resurser, tillverkade verktyg, position, dygn, byggnader, dörrars läge, kistors innehåll och tid för återväxt. Nyckeln är `vildmark-strandad-v2`. Den gamla prototypens sparning lämnas orörd, men används inte i den nya versionen: den nya progressionen börjar tomhänt. **Börja en ny överlevnad** tar bort den aktuella sparningen. Vid död börjar du om.

Det här är ett enspelarspel. Multiplayer och den fullständiga funktionsmängden i Tribals.io ingår inte. Spelet använder egen kod och procedurgenererade modeller och texturer, inga tillgångar hämtade från Tribals.io.

## Utveckla

Node.js 20.19+ eller 22.12+ krävs (Node.js 22 eller 24 rekommenderas).

```sh
npm ci
npm run dev
```

`npm test` kör sju tester för tomhänt start, verktygsprogression, stationskrav, resurskostnader och terräng. `npm run build` skapar produktionsversionen i `dist/`; `npm run preview` visar den lokalt. `src/progression.js` innehåller recept och insamlingsregler, `src/world.js` skapar världen och `src/main.js` hanterar spelet.

## Publicering

`.github/workflows/pages.yml` testar, bygger och publicerar `main` automatiskt med GitHub Actions. Under **Settings → Pages → Source** ska **GitHub Actions** vara valt. En publicerad webbversion behöver ingen backend, inga hemligheter och inga externa runtime-anrop. Relativa resurssökvägar i `vite.config.js` gör att spelet fungerar under projektets GitHub Pages-sökväg.
