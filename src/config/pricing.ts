export type Plan = {
  id: "free" | "pro" | "clinic";
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  ctaLabel: string;
  ctaTo: "/cadastro" | "/login";
  highlight?: boolean;
  badge?: string;
  features: string[];
};

export const pricing: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Para testar a organização básica do FisioFlow.",
    monthly: 0,
    yearly: 0,
    ctaLabel: "Começar grátis",
    ctaTo: "/cadastro",
    features: [
      "Até 10 pacientes",
      "Agenda básica",
      "Tarefas básicas",
      "Financeiro limitado",
      "Modo individual",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    tagline: "Para fisioterapeutas que querem controlar toda a rotina.",
    monthly: 49.9,
    yearly: 499,
    ctaLabel: "Assinar PRO",
    ctaTo: "/cadastro",
    highlight: true,
    badge: "Mais escolhido",
    features: [
      "Pacientes ilimitados",
      "Agenda completa",
      "Notas clínicas",
      "Financeiro completo",
      "Cobranças e vencimentos",
      "Exercícios e prescrições",
      "Tarefas",
      "Ferramentas",
      "Dicionário",
      "Suporte prioritário",
    ],
  },
  {
    id: "clinic",
    name: "Clínica",
    tagline: "Para clínicas com equipe e gestão administrativa.",
    monthly: 97,
    yearly: 997,
    ctaLabel: "Falar com especialista",
    ctaTo: "/cadastro",
    features: [
      "Tudo do PRO",
      "Múltiplos usuários",
      "Permissões por função",
      "Painel administrativo",
      "Gestão de equipe",
      "Controle por profissional",
      "Relatórios futuros",
      "Suporte premium",
    ],
  },
];

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}
