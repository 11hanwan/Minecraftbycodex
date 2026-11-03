# Vildmark

Ett 3D-survivalspel i förstaperson för webbläsaren, inspirerat av resurssamling och fritt byggande i Minecraft och Tribals.io. Egen stil, en ö i lågpolygonstil och svensk speltext. Enspelarläge; ingen server eller inloggning behövs.

## Starta

Node.js 20.19+ eller 22.12+ krävs.

```sh
npm ci
npm run dev
```

Öppna adressen Vite visar i en webbläsare med WebGL. Klicka på **Kliv ut i vildmarken** för att fånga muspekaren. Spelet kräver mus och tangentbord. `npm run build` skapar produktionsversionen i `dist/`; `npm run preview` visar den. `npm test` testar resursekonomi och terränggenerering.

## Spela

- WASD: gå. Mus: titta. Shift: spring. Mellanslag: hoppa.
- E eller vänsterklick med yxan: samla trä, sten och bär inom räckhåll.
- 1: yxa. 2: spjut. Vänsterklick attackerar vargar.
- 3: vägg (4 trä). 4: golv (3 trä). 5: lägereld (5 trä + 4 sten).
- Sikta på marken och vänsterklicka för att bygga. R roterar. B växlar byggläge. Mushjulet byter plats.
- F: ät bär. H: hjälp. Esc: pausa och släpp muspekaren.

Samla 12 trä och 8 sten, bygg ett läger och håll hungern uppe. Dygn varar åtta aktiva minuter. Vargar kommer på natten, undviker väggar och flyr från lägereldar. Eldar återställer hälsa när du är mätt. Havet skadar dig. Framsteg sparas lokalt i webbläsaren. Vid död börjar du om; menyn har också en återställningsknapp.

Ingen multiplayer, fullständig voxelredigering eller mobilstyrning ingår i den här första spelversionen. Spelet behöver inga externa nätverksanrop efter att sidan laddats.
