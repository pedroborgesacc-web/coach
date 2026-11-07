# Coach do Pedro

App web (PWA) de rotina, nutrição e treino. Funciona offline e os dados ficam só no telemóvel.

- **Editar o plano:** `src/data/plan.ts` (horários, refeições, treinos, meal prep, compras).
- **Desenvolver:** `npm install` e depois `npm run dev`
- **Publicar:** cada push para `main` publica no GitHub Pages (`.github/workflows/deploy.yml`).
- **Lembretes:** `npm run build` gera `public/lembretes.ics` a partir do plano.
