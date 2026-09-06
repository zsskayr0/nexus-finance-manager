/**
 * Saudação da tela inicial — varia por horário do dia e, às vezes, pelo dia
 * da semana (sextou, começo de semana, fim de semana). Escolhida uma vez
 * por carregamento da página, então não pisca ficando diferente a cada
 * segundo.
 *
 * Clima não entra aqui: precisaria de geolocalização + chave de API de
 * previsão do tempo (ex.: OpenWeatherMap), nenhuma das duas configurada
 * neste projeto ainda — dá pra ligar depois se você trouxer uma chave.
 */

export interface Greeting {
  headline: string;
  subtext: string;
  icon: "sun" | "moon";
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]!;
}

const MADRUGADA = [
  { subtext: "As contas não dormem, né?" },
  { subtext: "Silêncio total — boa hora pra revisar o extrato com calma." },
  { subtext: "Trabalhando até tarde. Bora fechar as contas e descansar." },
];

const MANHA_CEDO = [
  { subtext: "Café na mão, saldo em dia — vamos nessa." },
  { subtext: "Começando o dia de olho nas finanças. Respeito." },
  { subtext: "Bom dia. Hora boa pra revisar o que entrou e o que saiu." },
];

const MANHA = [
  { subtext: "Hora boa pra colocar tudo em ordem." },
  { subtext: "Vamos ver como estão as contas hoje?" },
];

const TARDE_INICIO = [
  { subtext: "Pausa do almoço? Aproveita pra dar uma olhada nas contas." },
  { subtext: "Meio do dia — um bom momento pra um lançamento rápido." },
];

const TARDE = [
  { subtext: "Como estão os números hoje?" },
  { subtext: "Boa hora pra revisar os gastos da semana." },
];

const NOITE = [
  { subtext: "Fechando o dia — vamos ver como ficaram as contas." },
  { subtext: "Um minuto pra organizar as finanças antes de descansar." },
];

const NOITE_TARDE = [
  { subtext: "Ainda por aqui? Bora fechar o dia com as contas em ordem." },
  { subtext: "Madrugando ou terminando tarde? De qualquer forma, boa noite." },
];

const SEGUNDA = [{ subtext: "Início de semana — hora de recalcular a rota financeira." }];
const SEXTA = [{ subtext: "Sextou! Só confere as contas antes de comemorar." }];
const FIM_DE_SEMANA = [{ subtext: "Relaxa, mas não esquece de registrar os gastos do rolê." }];

export function getGreeting(firstName: string): Greeting {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Dom .. 6=Sáb

  let salutation: string;
  let pool: ReadonlyArray<{ subtext: string }>;
  let icon: Greeting["icon"];

  if (hour < 5) {
    salutation = "Boa madrugada";
    pool = MADRUGADA;
    icon = "moon";
  } else if (hour < 9) {
    salutation = "Bom dia";
    pool = MANHA_CEDO;
    icon = "sun";
  } else if (hour < 12) {
    salutation = "Bom dia";
    pool = MANHA;
    icon = "sun";
  } else if (hour < 14) {
    salutation = "Boa tarde";
    pool = TARDE_INICIO;
    icon = "sun";
  } else if (hour < 18) {
    salutation = "Boa tarde";
    pool = TARDE;
    icon = "sun";
  } else if (hour < 22) {
    salutation = "Boa noite";
    pool = NOITE;
    icon = "moon";
  } else {
    salutation = "Boa noite";
    pool = NOITE_TARDE;
    icon = "moon";
  }

  // Em ~1 a cada 3 acessos, troca o subtexto pelo comentário do dia da
  // semana (segunda / sexta / fim de semana) em vez do horário.
  const dayPool = day === 1 ? SEGUNDA : day === 5 ? SEXTA : day === 0 || day === 6 ? FIM_DE_SEMANA : null;
  const finalPool = dayPool && Math.random() < 0.35 ? dayPool : pool;

  return {
    headline: `${salutation}, ${firstName}`,
    subtext: pick(finalPool).subtext,
    icon,
  };
}
