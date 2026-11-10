/**
 * Nivåmatrisen för spelarna (5–7 år). Fyra områden med delar som bedöms A–D.
 * Fotbollsaktioner väger tyngst, fysik lätt. Mentalt och socialt används för
 * att sätta ihop grupper och flyttar aldrig ner ett barn, så de räknas inte in.
 */
export type Grade = 'A' | 'B' | 'C' | 'D'
export const GRADES: Grade[] = ['A', 'B', 'C', 'D']

export type Criterion = { key: string; name: string; levels: Record<Grade, string> }
export type Area = { key: string; name: string; weight: number; note: string; criteria: Criterion[] }

export const LEVEL_AREAS: Area[] = [
  {
    key: 'fotboll',
    name: 'Fotbollsaktioner',
    weight: 0.75,
    note: 'Väger tyngst.',
    criteria: [
      {
        key: 'teknik', name: 'Teknisk utveckling', levels: {
          A: 'Driver bollen nära foten i fart och kan byta riktning. Passar och skjuter med rätt riktning, ibland med båda fötterna. Tar emot en passning och har kontroll direkt.',
          B: 'Driver bollen i lugnt tempo och kan svänga. Skjuter mot mål med riktning. Passar korta passningar till en kompis nära. Stoppar en lugn boll.',
          C: 'Sparkar bollen framåt, men den hamnar ofta långt bort. Stoppar en boll som rullar sakta. Skjuter ofta med tån och utan riktning.',
          D: 'Träffar bollen ibland och tappar den lätt. Tittar ner på fötterna. Har svårt att stoppa bollen.',
        },
      },
      {
        key: 'spelforstaelse', name: 'Spelförståelse', levels: {
          A: 'Söker fria ytor och ser en fri kompis att passa till. Går tillbaka och hjälper till när laget tappar bollen. Förstår inspark, inkast och hörna.',
          B: 'Vet åt vilket håll laget anfaller. Försöker vinna bollen när motståndaren har den. Passar ibland men driver och skjuter oftast själv.',
          C: 'Följer bollen i klungan. Vet oftast vilket mål som är vårt men glömmer det i stunden. Behöver påminnelser om riktning.',
          D: 'Står ofta utanför spelet eller springer utan att söka bollen. Vet sällan vilket mål laget anfaller. Har ännu ingen förståelse för reglerna.',
        },
      },
    ],
  },
  {
    key: 'fysik',
    name: 'Fysik',
    weight: 0.25,
    note: 'Väger lätt, eftersom födelsemånad och storlek gör stor skillnad.',
    criteria: [
      {
        key: 'motorik', name: 'Motorik och koordination', levels: {
          A: 'Springer, stannar och vänder smidigt. Hoppar jämfota och på ett ben. Behåller balansen i närkamper.',
          B: 'Springer och vänder oftast utan att ramla. Hoppar jämfota och kan hoppa på ett ben en kort stund.',
          C: 'Springer lite stelt och ramlar ibland i vändningar. Har svårt att springa och hantera bollen samtidigt.',
          D: 'Är osäker i grundrörelser som att springa, stanna och hoppa. Tappar balansen lätt.',
        },
      },
      {
        key: 'biomotorik', name: 'Biomotoriska förmågor', levels: {
          A: 'Orkar vara aktiv hela matchen. Snabb i starter och kan öka farten med bollen.',
          B: 'Orkar de flesta perioder men behöver vila ibland. Snabb utan boll men tappar fart med bollen.',
          C: 'Orkar korta stunder och behöver vila ofta. Kommer långsamt igång.',
          D: 'Tröttnar snabbt och tappar intresset när det blir ansträngande.',
        },
      },
    ],
  },
  {
    key: 'mentalt',
    name: 'Mentalt',
    weight: 0,
    note: 'Används för att sätta ihop grupper, aldrig för att flytta ner någon. Räknas inte in i nivån.',
    criteria: [
      {
        key: 'drivkraft', name: 'Inre drivkraft (motivation)', levels: {
          A: 'Vill prova nya saker själv och frågar efter mer. Tränar ofta med bollen hemma.',
          B: 'Är glad och engagerad på träning och gör övningarna utan att behöva lockas.',
          C: 'Är engagerad i perioder och behöver uppmuntran för att komma igång.',
          D: 'Vill ofta inte vara med, eller är med mest för att en kompis eller förälder är där.',
        },
      },
      {
        key: 'fokus', name: 'Fokus och koncentration', levels: {
          A: 'Lyssnar på instruktioner och håller fokus en hel övning, även när den är jobbig.',
          B: 'Håller fokus i korta övningar och kommer tillbaka efter en påminnelse.',
          C: 'Tappar fokus snabbt och behöver en vuxen nära.',
          D: 'Har svårt att följa instruktioner och att stanna kvar i en övning.',
        },
      },
      {
        key: 'resiliens', name: 'Resiliens', levels: {
          A: 'Reser sig snabbt efter ett misstag och fortsätter. Klarar att förlora en match.',
          B: 'Blir ibland ledsen eller arg men är tillbaka efter en kort stund.',
          C: 'Blir ofta ledsen eller slutar spela efter ett misstag och behöver tröst för att komma tillbaka.',
          D: 'Vill sluta eller går ut när något går fel.',
        },
      },
    ],
  },
  {
    key: 'socialt',
    name: 'Socialt',
    weight: 0,
    note: 'Används på samma sätt som det mentala. Räknas inte in i nivån.',
    criteria: [
      {
        key: 'lagspel', name: 'Lagspel', levels: {
          A: 'Passar till kompisar, jublar när andra gör mål och hjälper den som har ramlat.',
          B: 'Leker bra med andra, passar ibland och kan dela på bollen.',
          C: 'Spelar mest för sig själv och kan behöva hjälp att dela.',
          D: 'Har svårt att vara i grupp och söker hellre en vuxen än kompisar.',
        },
      },
      {
        key: 'ledarskap', name: 'Ledarskap och ansvar', levels: {
          A: 'Hjälper till med koner och bollar utan att bli tillfrågad. Påminner kompisar om regler på ett snällt sätt och tar hand om nya barn.',
          B: 'Hämtar sin egen boll och vattenflaska och hjälper till när man frågar.',
          C: 'Behöver påminnelser om sina egna saker.',
          D: 'Behöver en vuxen som hjälper till med det mesta.',
        },
      },
    ],
  },
]

export const ALL_CRITERIA = LEVEL_AREAS.flatMap((a) => a.criteria.map((c) => ({ ...c, area: a.key })))
/** Delarna som räknas in i nivån */
export const RATED_KEYS = LEVEL_AREAS.filter((a) => a.weight > 0).flatMap((a) => a.criteria.map((c) => c.key))

const POINTS: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1 }
/** 4 = A, 3.5 = AB, 3 = B … 1 = D */
const LEVEL_BY_HALF: Record<number, string> = { 8: 'A', 7: 'AB', 6: 'B', 5: 'BC', 4: 'C', 3: 'CD', 2: 'D' }

export type Scores = Partial<Record<string, Grade>>

/** Poäng per område (medel av delarna, 1–4), eller null om något saknas. */
export function areaScore(area: Area, scores: Scores) {
  const g = area.criteria.map((c) => scores[c.key])
  if (g.some((x) => !x)) return null
  return g.reduce((a, x) => a + POINTS[x!], 0) / g.length
}

/**
 * Föreslagen nivå: viktat medel av områdena som räknas, avrundat till närmaste
 * halva steg (A, AB, B, BC, C, CD, D). null tills alla delar som räknas är ifyllda.
 */
export function suggestLevel(scores: Scores): { level: string; score: number } | null {
  let sum = 0
  let weight = 0
  for (const a of LEVEL_AREAS) {
    if (!a.weight) continue
    const s = areaScore(a, scores)
    if (s == null) return null
    sum += s * a.weight
    weight += a.weight
  }
  const score = sum / weight
  return { level: LEVEL_BY_HALF[Math.round(score * 2)], score }
}

/** "3.4" → grad för ett område (för visning) */
export function gradeOf(score: number) {
  return LEVEL_BY_HALF[Math.round(score * 2)]
}
