// =====================================================================
//  PLANO DO PEDRO — edita aqui. A app lê tudo deste ficheiro.
//  Horas no formato "HH:MM". Categorias: comida, treino, portugal,
//  turno, prep (preparação e carro), sono (sono e descanso).
//  Refeições: p = proteína (g), kcal = estimativa (pesos em cru).
//  ~ antes da hora (approx: true) = hora aproximada.
// =====================================================================

export type CategoryId = 'comida' | 'treino' | 'portugal' | 'turno' | 'prep' | 'sono'
export type DayId = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type WorkoutId = 'push' | 'pull' | 'corrida' | 'pernas' | 'upper' | 'lower' | 'descanso'

export interface Meal { desc: string; p: number; kcal: number }
export interface TimelineItem {
  t: string
  end?: string
  approx?: boolean
  title: string
  cat: CategoryId
  meal?: Meal
}
export interface Day {
  id: DayId
  name: string
  short: string
  type: string
  shift: string | null
  workout: WorkoutId
  sleep: { bed: string; wake: string } // sono desta noite
  kcalTarget: number
  water: string
  timeline: TimelineItem[]
  prepTitle: string
  prepTomorrow: string[]
}
export interface Exercise {
  id: string
  name: string
  sets: number
  repMin: number
  repMax: number
  unit?: 'reps' | 's' | 'amrap'
  perSide?: boolean
  main: boolean // principal: descanso 2–3 min
  inc: number // kg a subir quando chega ao topo
  bodyweight?: boolean // kg = peso extra
  superset?: string
  note?: string
  chart?: boolean // aparece nos gráficos de progresso
}
export interface Workout { id: WorkoutId; name: string; note?: string; exercises: Exercise[] }
export interface PrepStep { t: string; text: string; min?: number }

// ---------------------------------------------------------------------
export const profile = {
  name: 'Pedro',
  startDate: '2026-11-10', // terça-feira (a semana 1 conta a partir da segunda, 9/11)
  age: 27,
  heightCm: 179,
  startWeightKg: 72.5,
  goal: 'Recomposição: ~10–11% de gordura em 12–16 semanas, peso 72–74 kg',
}

export const targets = {
  proteinMin: 165,
  proteinMax: 180,
  fat: 70,
  carbs: 320,
  waterL: 3,
  creatineG: 5,
  bed: '23:15',
  sleep: '23:30',
}

export const categories: Record<CategoryId, { label: string; color: string }> = {
  comida: { label: 'Comida', color: '#22c55e' },
  treino: { label: 'Treino', color: '#3b82f6' },
  portugal: { label: 'Portugal e estudo', color: '#eab308' },
  turno: { label: 'Turno no Gymage', color: '#94a3b8' },
  prep: { label: 'Preparação e carro', color: '#f97316' },
  sono: { label: 'Sono e descanso', color: '#a855f7' },
}

// ---------------------------------------------------------------------
// Refeições repetidas (para não haver gralhas entre dias)
const M = {
  bananaCafe: { desc: 'Banana e café', p: 0, kcal: 110 },
  oats: { desc: 'Overnight oats (200 g skyr, 1 scoop proteína, 50 g aveia, frutos vermelhos), 2 ovos cozidos, 5 g creatina', p: 50, kcal: 620 },
  almocoFrangoArroz: { desc: '180 g frango, 100 g arroz, legumes, 1 colher azeite', p: 45, kcal: 700 },
  wrap: { desc: 'Wrap integral com 120 g frango, queijo fresco e alface', p: 35, kcal: 420 },
  skyrBanana: { desc: '200 g skyr, 1 banana, 25 g amêndoas', p: 25, kcal: 385 },
  ceia: { desc: '200 g cottage com frutos vermelhos', p: 25, kcal: 240 },
  ovosCasa: { desc: '3 ovos, 100 g claras, 2 tostas integrais, ½ abacate, 1 fruta, 5 g creatina', p: 35, kcal: 600 },
  chili: { desc: 'Chili de carne magra com 100 g arroz e legumes', p: 40, kcal: 680 },
  lancheSkyr: { desc: 'Skyr, 40 g aveia, mirtilos, 1 scoop proteína, 1 colher manteiga de amendoim', p: 40, kcal: 520 },
  salmao: { desc: '150 g salmão, 300 g batata, legumes', p: 35, kcal: 590 },
}

const prepNoiteTurno = [
  'Overnight oats no frigorífico',
  '2 ovos cozidos',
  'Caixa do almoço',
  'Wrap embrulhado em alumínio',
  'Kit de skyr (pote 200 g, banana, 25 g amêndoas)',
  'Tudo na mala térmica no frigorífico e gelo no congelador',
  'Mochila: roupa de trabalho, toalha, chinelos, desodorizante, portátil, carregador, auscultadores',
  'Roupa de treino na cadeira e garrafa lavada',
]

// Manhã dos dias de turno da tarde (segunda, terça, quinta, sexta)
const manhaTurno = (treino: string): TimelineItem[] => [
  { t: '06:45', title: 'Acordar, copo de água, 10 min sem telemóvel', cat: 'sono' },
  { t: '06:50', title: 'Casa de banho e roupa de treino', cat: 'prep' },
  { t: '07:00', title: 'Pré-treino', cat: 'comida', meal: M.bananaCafe },
  { t: '07:10', title: 'Mala térmica do frigorífico com gelo, mochila e garrafa', cat: 'prep' },
  { t: '07:15', end: '08:05', title: 'Carro: chamadas para Portugal (12h15–13h em Lisboa) ou áudio do exame de real estate da Florida', cat: 'portugal' },
  { t: '08:15', end: '09:25', title: `Treino ${treino} no Gymage`, cat: 'treino' },
  { t: '09:25', end: '09:45', title: 'Duche e vestir', cat: 'prep' },
  { t: '09:50', title: 'Pequeno-almoço no café', cat: 'comida', meal: M.oats },
]

const tardeTurno = (almoco: Meal, almocoTitle = 'Almoço, aquecido no staff'): TimelineItem[] => [
  { t: '10:00', end: '11:30', title: 'Portugal: chamadas, clientes, equipa (15h–16h30 em Lisboa)', cat: 'portugal' },
  { t: '11:30', end: '12:45', title: 'Estudo do exame ou conteúdo para o Instagram', cat: 'portugal' },
  { t: '12:45', title: almocoTitle, cat: 'comida', meal: almoco },
  { t: '13:15', end: '13:50', title: 'Pausa: caminhar ou descansar', cat: 'sono' },
  { t: '14:00', end: '22:00', title: 'Turno no Gymage — beber 1 L de água', cat: 'turno' },
  { t: '16:30', approx: true, title: 'Refeição no turno', cat: 'comida', meal: M.wrap },
  { t: '19:30', approx: true, title: 'Refeição no turno', cat: 'comida', meal: M.skyrBanana },
  { t: '22:00', end: '22:35', title: 'Carro para casa, nada exigente', cat: 'prep' },
  { t: '22:35', title: 'Ceia', cat: 'comida', meal: M.ceia },
]

// ---------------------------------------------------------------------
export const days: Day[] = [
  {
    id: 'seg', name: 'Segunda', short: 'Seg',
    type: 'Turno 14h–22h', shift: '14:00–22:00', workout: 'push',
    sleep: { bed: '23:30', wake: '06:45' }, kcalTarget: 2600, water: '3 L (1 L no turno)',
    timeline: [
      ...manhaTurno('Push'),
      ...tardeTurno(M.almocoFrangoArroz),
      { t: '22:45', end: '23:05', title: 'Preparar terça', cat: 'prep' },
      { t: '23:05', title: 'Higiene, telemóvel fora do quarto, alarme 6:45', cat: 'sono' },
      { t: '23:30', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para terça', prepTomorrow: prepNoiteTurno,
  },
  {
    id: 'ter', name: 'Terça', short: 'Ter',
    type: 'Turno 14h–22h', shift: '14:00–22:00', workout: 'pull',
    sleep: { bed: '23:30', wake: '07:30' }, kcalTarget: 2600, water: '3 L (1 L no turno)',
    timeline: [
      ...manhaTurno('Pull'),
      ...tardeTurno(M.chili),
      { t: '22:45', end: '23:00', title: 'Preparar quarta', cat: 'prep' },
      { t: '23:00', title: 'Higiene, telemóvel fora do quarto, alarme 7:30', cat: 'sono' },
      { t: '23:30', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para quarta',
    prepTomorrow: [
      'Passar a caixa congelada no sábado (almoço de quarta) para o frigorífico',
      'Roupa de corrida e ténis à porta',
      'Confirmar o que falta para o meal prep e as compras',
    ],
  },
  {
    id: 'qua', name: 'Quarta', short: 'Qua',
    type: 'Folga · corrida · meal prep', shift: null, workout: 'corrida',
    sleep: { bed: '23:30', wake: '06:45' }, kcalTarget: 2600, water: '3 L',
    timeline: [
      { t: '07:30', title: 'Acordar (8 h de sono), água, 10 min sem telemóvel', cat: 'sono' },
      { t: '07:35', title: 'Pré-corrida', cat: 'comida', meal: M.bananaCafe },
      { t: '08:00', end: '08:40', title: 'Corrida leve perto de casa e 5 min de alongamentos', cat: 'treino' },
      { t: '08:45', title: 'Duche', cat: 'prep' },
      { t: '09:15', title: 'Cozinhar e comer o pequeno-almoço (15 min)', cat: 'comida', meal: M.ovosCasa },
      { t: '10:00', end: '13:00', title: 'Portugal num café ou em casa da namorada (15h–18h Lisboa)', cat: 'portugal' },
      { t: '13:00', title: 'Almoço: caixa congelada no sábado', cat: 'comida', meal: { ...M.chili, desc: 'Chili com arroz (caixa congelada no sábado)' } },
      { t: '14:00', end: '15:00', title: 'Compras de reposição: frango, salmão, fruta', cat: 'prep' },
      { t: '15:00', end: '16:30', title: 'Meal prep para quarta à noite, quinta e sexta', cat: 'prep' },
      { t: '17:00', title: 'Lanche', cat: 'comida', meal: M.lancheSkyr },
      { t: '17:30', end: '20:00', title: 'Livre', cat: 'sono' },
      { t: '20:00', title: 'Jantar', cat: 'comida', meal: { ...M.salmao, desc: '150 g salmão do prep, 300 g batata, legumes' } },
      { t: '21:00', end: '21:30', title: 'Preparar quinta', cat: 'prep' },
      { t: '22:30', title: 'Ceia', cat: 'comida', meal: M.ceia },
      { t: '23:00', title: 'Higiene, telemóvel fora do quarto, alarme 6:45', cat: 'sono' },
      { t: '23:30', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para quinta',
    prepTomorrow: [
      'Overnight oats',
      '2 ovos cozidos',
      'Caixa do almoço',
      'Lanche num pote (iogurte grego, 40 g aveia, 1 colher manteiga de amendoim)',
      'Caixa do jantar (salmão, batata, legumes)',
      '1 fruta e 25 g amêndoas',
      'Mala térmica no frigorífico',
      'Mochila e roupa de treino',
    ],
  },
  {
    id: 'qui', name: 'Quinta', short: 'Qui',
    type: 'Turno 18h–22h', shift: '18:00–22:00', workout: 'pernas',
    sleep: { bed: '23:30', wake: '06:45' }, kcalTarget: 2600, water: '3 L (0,5 L no turno)',
    timeline: [
      ...manhaTurno('Pernas'),
      { t: '10:00', end: '12:45', title: 'Portugal e estudo (15h–17h45 Lisboa)', cat: 'portugal' },
      { t: '12:45', title: 'Almoço', cat: 'comida', meal: M.almocoFrangoArroz },
      { t: '13:15', end: '15:00', title: 'Descanso: sesta de 20 min ou tempo livre', cat: 'sono' },
      { t: '15:00', end: '16:30', title: 'Bloco extra opcional de Portugal ou estudo', cat: 'portugal' },
      { t: '15:30', title: 'Lanche', cat: 'comida', meal: { desc: 'Iogurte grego, 40 g aveia, 1 colher manteiga de amendoim', p: 20, kcal: 340 } },
      { t: '17:00', title: 'Jantar', cat: 'comida', meal: M.salmao },
      { t: '17:30', end: '17:50', title: 'Ir para o turno', cat: 'prep' },
      { t: '18:00', end: '22:00', title: 'Turno — beber 0,5 L de água', cat: 'turno' },
      { t: '20:00', approx: true, title: 'Snack no turno', cat: 'comida', meal: { desc: '1 fruta e 25 g amêndoas', p: 5, kcal: 230 } },
      { t: '22:00', end: '22:35', title: 'Carro para casa', cat: 'prep' },
      { t: '22:35', title: 'Ceia', cat: 'comida', meal: M.ceia },
      { t: '22:45', end: '23:05', title: 'Preparar sexta', cat: 'prep' },
      { t: '23:05', title: 'Higiene, alarme 6:45', cat: 'sono' },
      { t: '23:30', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para sexta', prepTomorrow: prepNoiteTurno,
  },
  {
    id: 'sex', name: 'Sexta', short: 'Sex',
    type: 'Turno 14h–22h', shift: '14:00–22:00', workout: 'upper',
    sleep: { bed: '23:30', wake: '08:00' }, kcalTarget: 2600, water: '3 L (1 L no turno)',
    timeline: [
      ...manhaTurno('Upper'),
      ...tardeTurno({ desc: '180 g frango, 350 g batata, legumes, 1 colher azeite', p: 45, kcal: 610 }),
      { t: '22:45', end: '23:00', title: 'Preparar sábado', cat: 'prep' },
      { t: '23:00', title: 'Higiene, telemóvel fora do quarto, alarme 8:00', cat: 'sono' },
      { t: '23:30', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para sábado',
    prepTomorrow: [
      'Roupa de treino',
      'Esvaziar e lavar as caixas da semana',
      'Ver o que falta e ajustar a lista de compras',
    ],
  },
  {
    id: 'sab', name: 'Sábado', short: 'Sáb',
    type: 'Folga · compras e meal prep', shift: null, workout: 'lower',
    sleep: { bed: '22:00', wake: '06:15' }, kcalTarget: 2600, water: '3 L',
    timeline: [
      { t: '08:00', title: 'Acordar (8h30 de sono), água', cat: 'sono' },
      { t: '08:05', title: 'Pré-treino', cat: 'comida', meal: M.bananaCafe },
      { t: '09:00', end: '10:10', title: 'Treino Lower + core no condomínio ou no Gymage (se Gymage, sair às 8:10)', cat: 'treino' },
      { t: '10:10', title: 'Duche', cat: 'prep' },
      { t: '10:30', title: 'Cozinhar e comer o pequeno-almoço', cat: 'comida', meal: M.ovosCasa },
      { t: '11:00', end: '13:00', title: 'Livre, ou Portugal se precisar', cat: 'portugal' },
      { t: '13:00', title: 'Almoço', cat: 'comida', meal: { desc: '180 g bife magro, 100 g arroz, salada', p: 40, kcal: 620 } },
      { t: '13:45', end: '14:45', title: 'Compras da semana', cat: 'prep' },
      { t: '15:00', end: '17:00', title: 'Meal prep para domingo, segunda e terça', cat: 'prep' },
      { t: '17:15', title: 'Lanche', cat: 'comida', meal: M.lancheSkyr },
      { t: '17:30', end: '20:00', title: 'Livre', cat: 'sono' },
      { t: '20:00', title: 'Jantar', cat: 'comida', meal: { desc: '180 g frango do prep, 300 g batata, legumes', p: 40, kcal: 480 } },
      { t: '20:45', end: '21:15', title: 'Preparar domingo', cat: 'prep' },
      { t: '21:30', title: 'Ceia', cat: 'comida', meal: M.ceia },
      { t: '21:45', title: 'Higiene, telemóvel fora, alarme 6:15', cat: 'sono' },
      { t: '22:00', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para domingo',
    prepTomorrow: [
      'Bowl de chili com arroz e legumes',
      'Wrap',
      'Kit de skyr (pote 200 g, 1 fruta, 25 g frutos secos)',
      'Mala térmica no frigorífico',
      'Mochila: roupa de trabalho, desodorizante, carregador, auscultadores, garrafa',
    ],
  },
  {
    id: 'dom', name: 'Domingo', short: 'Dom',
    type: 'Turno 8h–20h · sem treino', shift: '08:00–20:00', workout: 'descanso',
    sleep: { bed: '23:00', wake: '06:45' }, kcalTarget: 2400, water: '3 L (1,5 L no turno)',
    timeline: [
      { t: '06:15', title: 'Acordar (8h15 de sono), água', cat: 'sono' },
      { t: '06:25', title: 'Cozinhar e comer o pequeno-almoço', cat: 'comida', meal: { desc: '4 ovos, 2 tostas integrais, ½ abacate, 1 fruta, 5 g creatina', p: 30, kcal: 620 } },
      { t: '06:50', title: 'Mala térmica com gelo, mochila e garrafa', cat: 'prep' },
      { t: '07:00', end: '07:40', title: 'Carro: áudio do exame ou podcast', cat: 'portugal' },
      { t: '08:00', end: '20:00', title: 'Turno — beber 1,5 L de água', cat: 'turno' },
      { t: '11:00', approx: true, title: 'Refeição', cat: 'comida', meal: { desc: 'Bowl de chili com arroz e legumes', p: 40, kcal: 680 } },
      { t: '14:30', approx: true, title: 'Refeição', cat: 'comida', meal: M.wrap },
      { t: '17:30', approx: true, title: 'Refeição', cat: 'comida', meal: { desc: '200 g skyr, 1 fruta, 25 g frutos secos', p: 25, kcal: 360 } },
      { t: '20:00', end: '20:40', title: 'Carro para casa', cat: 'prep' },
      { t: '20:45', title: 'Jantar, aquecer a caixa', cat: 'comida', meal: { desc: '180 g frango, 300 g batata, legumes', p: 40, kcal: 480 } },
      { t: '21:15', end: '21:35', title: 'Preparar segunda', cat: 'prep' },
      { t: '21:35', end: '22:45', title: 'Livre, sem ecrãs na última meia hora', cat: 'sono' },
      { t: '22:45', title: 'Higiene, alarme 6:45', cat: 'sono' },
      { t: '23:00', title: 'Dormir', cat: 'sono' },
    ],
    prepTitle: 'Preparar para segunda', prepTomorrow: prepNoiteTurno,
  },
]

// ---------------------------------------------------------------------
export const trainingRules = {
  rir: '1–2 repetições em reserva',
  restMainSec: 150, // 2–3 min
  restOtherSec: 75, // 60–90 s
  warmup: '5 min de mobilidade + 2 séries leves do primeiro exercício',
  returnWeeks: 2, // semanas 1–2: −1 série e 3 RIR
  deloadEvery: 7, // semana de deload (6–8)
  progression: 'Quando todas as séries chegam ao topo do intervalo, sobe a carga na sessão seguinte (+2,5 kg nos básicos, +1–2 kg nos restantes). Na calistenia, sobe reps e depois junta peso.',
}

export const workouts: Record<WorkoutId, Workout> = {
  push: {
    id: 'push', name: 'Push',
    exercises: [
      { id: 'supino-inclinado-halteres', name: 'Supino inclinado com halteres', sets: 4, repMin: 6, repMax: 10, main: true, inc: 2, chart: true },
      { id: 'dips', name: 'Dips', sets: 3, repMin: 8, repMax: 12, main: true, inc: 2.5, bodyweight: true, note: 'Com peso a partir de 12 reps', chart: true },
      { id: 'press-ombros', name: 'Press de ombros sentado', sets: 3, repMin: 8, repMax: 10, main: true, inc: 2, chart: true },
      { id: 'crucifixo-cabo', name: 'Crucifixo no cabo', sets: 3, repMin: 12, repMax: 15, main: false, inc: 1 },
      { id: 'elevacoes-laterais', name: 'Elevações laterais', sets: 4, repMin: 12, repMax: 20, main: false, inc: 1 },
      { id: 'triceps-cabo', name: 'Extensão de tríceps no cabo', sets: 3, repMin: 10, repMax: 15, main: false, inc: 1 },
    ],
  },
  pull: {
    id: 'pull', name: 'Pull',
    exercises: [
      { id: 'pull-ups', name: 'Pull-ups', sets: 4, repMin: 5, repMax: 10, main: true, inc: 2.5, bodyweight: true, note: 'Com peso a partir de 10 reps', chart: true },
      { id: 'remada', name: 'Remada com barra ou halter', sets: 3, repMin: 8, repMax: 10, main: true, inc: 2.5, chart: true },
      { id: 'puxada-neutra', name: 'Puxada no cabo, pega neutra', sets: 3, repMin: 10, repMax: 12, main: false, inc: 2 },
      { id: 'face-pulls', name: 'Face pulls', sets: 3, repMin: 15, repMax: 15, main: false, inc: 1 },
      { id: 'curl-ez', name: 'Curl com barra EZ', sets: 3, repMin: 8, repMax: 12, main: false, inc: 1 },
      { id: 'curl-martelo', name: 'Curl martelo', sets: 2, repMin: 10, repMax: 15, main: false, inc: 1 },
    ],
  },
  corrida: {
    id: 'corrida', name: 'Corrida',
    note: '30–40 min em zona 2 + 5 min de alongamentos. De 15 em 15 dias: 6 sprints de 20 s no fim.',
    exercises: [],
  },
  pernas: {
    id: 'pernas', name: 'Pernas',
    exercises: [
      { id: 'agachamento', name: 'Agachamento com barra', sets: 4, repMin: 5, repMax: 8, main: true, inc: 2.5, chart: true },
      { id: 'peso-morto-romeno', name: 'Peso morto romeno', sets: 3, repMin: 8, repMax: 10, main: true, inc: 2.5, chart: true },
      { id: 'leg-press', name: 'Leg press', sets: 3, repMin: 10, repMax: 12, main: true, inc: 5 },
      { id: 'curl-pernas', name: 'Curl de pernas', sets: 3, repMin: 10, repMax: 15, main: false, inc: 2 },
      { id: 'gemeos-pe', name: 'Gémeos em pé', sets: 4, repMin: 10, repMax: 15, main: false, inc: 2 },
      { id: 'hanging-leg-raises', name: 'Hanging leg raises', sets: 3, repMin: 10, repMax: 15, main: false, inc: 1, bodyweight: true },
    ],
  },
  upper: {
    id: 'upper', name: 'Upper',
    exercises: [
      { id: 'supino-plano', name: 'Supino plano com barra', sets: 4, repMin: 5, repMax: 8, main: true, inc: 2.5, chart: true },
      { id: 'chin-ups', name: 'Chin-ups', sets: 3, repMin: 6, repMax: 10, main: true, inc: 2.5, bodyweight: true },
      { id: 'remada-cabo', name: 'Remada no cabo sentado', sets: 3, repMin: 10, repMax: 12, main: false, inc: 2 },
      { id: 'flexoes-pes-elevados', name: 'Flexões com pés elevados', sets: 3, repMin: 0, repMax: 0, unit: 'amrap', main: false, inc: 0, bodyweight: true, note: 'Até 2 reps antes da falha' },
      { id: 'laterais-cabo', name: 'Elevações laterais no cabo', sets: 3, repMin: 12, repMax: 15, main: false, inc: 1 },
      { id: 'curl-inclinado', name: 'Curl inclinado', sets: 3, repMin: 10, repMax: 12, main: false, inc: 1, superset: 'A' },
      { id: 'triceps-overhead', name: 'Tríceps por cima da cabeça', sets: 3, repMin: 10, repMax: 12, main: false, inc: 1, superset: 'A' },
    ],
  },
  lower: {
    id: 'lower', name: 'Lower + core',
    exercises: [
      { id: 'hip-thrust', name: 'Hip thrust', sets: 4, repMin: 8, repMax: 10, main: true, inc: 2.5, chart: true },
      { id: 'bulgaro', name: 'Agachamento búlgaro', sets: 3, repMin: 8, repMax: 10, perSide: true, main: true, inc: 2, chart: true },
      { id: 'extensao-pernas', name: 'Extensão de pernas', sets: 3, repMin: 12, repMax: 15, main: false, inc: 2 },
      { id: 'peso-morto', name: 'Peso morto convencional (leve a moderado)', sets: 3, repMin: 5, repMax: 5, main: true, inc: 2.5 },
      { id: 'ab-wheel', name: 'Ab wheel', sets: 3, repMin: 8, repMax: 12, main: false, inc: 0, bodyweight: true },
      { id: 'prancha-lateral', name: 'Prancha lateral', sets: 3, repMin: 30, repMax: 45, unit: 's', perSide: true, main: false, inc: 0, bodyweight: true },
    ],
  },
  descanso: { id: 'descanso', name: 'Descanso total', exercises: [] },
}

// ---------------------------------------------------------------------
export const mealPreps: Record<'sab' | 'qua', { title: string; window: string; steps: PrepStep[] }> = {
  sab: {
    title: 'Meal prep de sábado', window: '15:00–17:00',
    steps: [
      { t: '15:00', text: 'Forno a 200 °C: 1,5 kg batata e 2 tabuleiros de legumes (brócolos, curgete, pimento, cebola)', min: 38 },
      { t: '15:10', text: '1,2 kg peito de frango temperado (sal, alho, paprika, limão) ao forno', min: 24 },
      { t: '15:15', text: 'Cozer 400 g arroz', min: 15 },
      { t: '15:20', text: 'Chili: 500 g carne picada magra, cebola, alho, 1 lata de feijão, 1 lata de tomate, especiarias', min: 25 },
      { t: '15:30', text: 'Cozer 8 ovos', min: 10 },
      { t: '16:15', text: 'Dividir: jantar de hoje, bowl de chili para domingo, almoço de segunda (frango), almoço de terça (chili), frango para os wraps de domingo a terça, ovos para segunda e terça' },
      { t: '16:30', text: 'Uma caixa de chili com arroz vai para o congelador (almoço de quarta)' },
      { t: '16:45', text: 'Limpeza' },
    ],
  },
  qua: {
    title: 'Meal prep de quarta', window: '15:00–16:30',
    steps: [
      { t: '15:00', text: 'Forno a 200 °C: 1 kg batata e 1 tabuleiro de legumes', min: 38 },
      { t: '15:10', text: '700 g peito de frango temperado (sal, alho, paprika, limão) ao forno', min: 24 },
      { t: '15:15', text: 'Cozer 250 g arroz', min: 15 },
      { t: '15:15', text: 'Cozer 4 ovos', min: 10 },
      { t: '15:35', text: '2 postas de salmão de 150 g ao forno', min: 15 },
      { t: '16:00', text: 'Arrefecer e dividir: almoços de quinta e sexta, salmão para hoje e quinta, frango para wraps, ovos para pequenos-almoços' },
      { t: '16:15', text: 'Limpeza' },
    ],
  },
}

export const shopping: string[] = [
  'Peito de frango 2 kg',
  'Carne picada magra (5%) 500 g',
  'Bife / vazia magra 400 g',
  'Salmão 4 postas (~600 g)',
  'Peru fatiado 300 g',
  'Ovos 30',
  'Claras líquidas 1 L',
  'Skyr ou iogurte grego magro 3 kg',
  'Cottage 1 kg',
  'Queijo fresco 2',
  'Proteína em pó (~1 kg por mês)',
  'Arroz 1 kg',
  'Batata e batata-doce 3 kg',
  'Aveia 500 g',
  'Pão integral 1',
  'Tortilhas integrais 1',
  'Feijão em lata 1',
  'Tomate em lata 1',
  'Legumes variados 3 kg',
  'Bananas 12',
  'Frutos vermelhos congelados 1 kg',
  'Fruta da época 1 kg',
  'Abacates 4',
  'Amêndoas 1',
  'Manteiga de amendoim 1',
  'Azeite, alho, limão, especiarias',
]

export const swaps: string[] = [
  'Frango ↔ peru ↔ atum ↔ pescada',
  'Arroz ↔ massa ↔ batata ↔ batata-doce',
  'Skyr ↔ iogurte grego magro ↔ cottage',
]

export const measurements = {
  weighDays: ['seg', 'qua', 'sex'] as DayId[],
  waistDay: 'sex' as DayId,
  photosEveryWeeks: 4,
}

export const reminders = [
  { title: 'Pesar (em jejum)', days: ['seg', 'qua', 'sex'] as DayId[], time: 'wake+5' },
  { title: 'Medir a cintura ao nível do umbigo', days: ['sex'] as DayId[], time: 'wake+10' },
]
