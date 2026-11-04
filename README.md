# Vildmark — Strandad

Ett webbaserat survivalspel i förstaperson med naturlig terräng, skog, stränder och en egen stil inspirerad av Tribals-liknande överlevnad. Du börjar **tomhänt**. Inga verktyg eller material ges gratis.

## Spela i Chrome / på Chromebook

När GitHub Pages-publiceringen lyckats: **https://11hanwan.github.io/Minecraftbycodex/**

Klicka på **Börja tomhänt**. Använd mus och tangentbord. Du behöver ingen terminal eller Linux för att spela den publicerade versionen. Esc pausar och släpper muspekaren. Välj **Grafik: låg** i pausmenyn om datorn har svårt att hålla jämn bildfrekvens.

## Inventarium och kontroller

**27 platser totalt**: två packningsrader och en tredje rad med nio hotbarplatser. Hotbaren visar bara föremål du faktiskt har. Den börjar tom. Material staplas till 64, verktyg tar en plats var. Olika trä- och stensorter ligger i separata staplar. Föremål flyttas med drag och släpp eller genom att klicka på källplatsen och sedan målplatsen. Shift-klick flyttar till/från hotbaren. Inga resursräknare visas ovanför hotbaren.

- **WASD:** gå. **R (håll):** spring. **Mellanslag:** hoppa.
- **F:** plocka från marken, drick och använd stationer, dörrar, kistor och sovplatser.
- **E:** öppna/stäng inventariet och receptboken till vänster.
- **1–9:** välj hotbarplats. **Vänsterklick:** använd verktyget eller placera vald byggdel.
- **T:** rotera byggdelen. **Högerklick:** ät bär eller stekt kött i vald hotbarplats.
- **B:** öppna byggrecept. **M:** karta. **H:** hjälp. **Esc:** paus.

Tillverkade verktyg och byggdelar är riktiga föremål som tar plats. De läggs i en ledig hotbarplats när det går. Byggmaterial betalas när byggföremålet tillverkas; vid placering förbrukas det föremålet, utan ytterligare materialkostnad. En full packning stoppar insamling och tillverkning utan att radera material. Ingredienser som används upp kan frigöra plats för tillverkningsresultatet.

## Från strand till läger

1. Plocka **grenar, småsten och löv** med F. Öppna E och tillverka första stenyxan (4 trä, 3 sten, 2 löv). Du kan **inte** skada eller få något från stående träd med händerna, spjut eller hacka.
2. Hugg med yxan och bryt med hackan. Trä av alla sorter kan användas som trä i recept, och sten av alla sorter räknas som sten. Sorterna skiljer sig i utseende, hållbarhet och mängd material:

| Resurs   | Hållbarhet | Dropp vid förstöring |
| -------- | ---------: | -------------------- |
| Tall     |         18 | 10 tallträ           |
| Björk    |         26 | 16 björkträ          |
| Ek       |         38 | 24 ekträ             |
| Kalksten |         22 | 12 kalksten          |
| Granit   |         36 | 18 granit            |
| Basalt   |         50 | 26 basalt            |
| Järnåder |         40 | 8 järnmalm           |

Stenyxan/hackan gör 2 skada per slag; järnyxan gör 5. Hållbarheten visas när du siktar, och skador sparas vid vanlig sparning. Markföremål plockas direkt utan verktyg. Löv ersätter växtfiber både i världen och i recepten.

3. Tillverka en lägereld och välj den i hotbaren för att bygga. Lägg till grund, väggar, dörr, tak, kista och sovplats.
4. Drick sötvatten vid källan väster om startstranden. Jaga hjortar med spjut och stek kött vid en eld. Lägg maten i hotbaren och högerklicka för att äta.
5. Bygg en arbetsbänk och en smältugn, bränn träkol vid elden och smält järnmalm. Tillverka en järnyxa vid bänken.

Stationer måste finnas inom sju meter för sina recept. Lägerdelar placeras på ett tvåmetersrutnät. Det finns dygn, hunger, törst, uthållighet, hjortar, nattliga vargar, återväxt och sju överlevnadsmål. Spelet är enspelarläge med egen kod och procedurgenererade tillgångar.

## Sparningar

Nyckeln `vildmark-strandad-v2` behålls, men formatversionen är nu 3. Äldre sparningar konverteras automatiskt till platser: fiber blir löv, material delas upp i staplar och tidigare verktyg blir föremål. Om en äldre packning är för stor visas **Hämta tidigare sparade föremål**; överskottet bevaras tills du frigör plats. Hotbarens ordning, vald plats, byggnader, kistor, resursers skador och återväxt sparas. **Börja en ny överlevnad** återställer aktuell sparning. Vid död börjar du om.

## Utveckla

Node.js 20.19+ eller 22.12+ krävs (Node.js 22 eller 24 rekommenderas).

```sh
npm ci
npm run dev
```

`npm test` kontrollerar slotkapacitet, staplar, flytt/byte, tillverkning, sparningsmigration, resurssorter, verktygskrav och terräng. `npm run build` skapar produktionsversionen i `dist/`; `npm run preview` visar den lokalt. `src/inventory.js` hanterar platser och transaktioner, `src/progression.js` innehåller recept och insamlingsregler, `src/world.js` skapar världen och `src/main.js` hanterar spelet.

## Publicering

`.github/workflows/pages.yml` testar, bygger och publicerar `main` automatiskt med GitHub Actions. Under **Settings → Pages → Source** ska **GitHub Actions** vara valt. En publicerad webbversion behöver ingen backend, inga hemligheter och inga externa runtime-anrop. Relativa resurssökvägar i `vite.config.js` gör att spelet fungerar under projektets GitHub Pages-sökväg.
