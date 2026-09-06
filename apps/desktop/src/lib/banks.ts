/**
 * Bancos mais conhecidos, pro seletor da tela de Contas — só uma lista
 * fixa de apoio pra preencher rápido (nome + cor da marca), não é dado
 * gravado em lugar nenhum: escolher um aqui só sugere `bank` e `color` no
 * formulário, a conta continua sendo só a conta. "Outro" cobre qualquer
 * banco fora da lista.
 *
 * Sem os logos oficiais de cada marca (o app não baixa nada da internet) —
 * cada um vira um selo colorido com a cor real do banco + uma sigla, pra
 * ficar reconhecível de relance sem depender de artes de terceiros.
 */
export interface KnownBank {
  name: string;
  color: string;
  /** Sigla curta pro selo — maiúsculas, 1 a 3 letras. */
  initials: string;
}

export const KNOWN_BANKS: KnownBank[] = [
  { name: "Itaú", color: "#EC7000", initials: "It" },
  { name: "Bradesco", color: "#CC092F", initials: "Bd" },
  { name: "Banco do Brasil", color: "#FADB00", initials: "BB" },
  { name: "Caixa Econômica Federal", color: "#0070AD", initials: "CX" },
  { name: "Santander", color: "#EC0000", initials: "Sa" },
  { name: "Nubank", color: "#820AD1", initials: "Nu" },
  { name: "Banco Inter", color: "#FF7A00", initials: "In" },
  { name: "C6 Bank", color: "#000000", initials: "C6" },
  { name: "BTG Pactual", color: "#0B2942", initials: "BTG" },
  { name: "PagBank", color: "#00A868", initials: "Pg" },
  { name: "Mercado Pago", color: "#00AEEF", initials: "MP" },
  { name: "Sicoob", color: "#7DB61C", initials: "Si" },
];
