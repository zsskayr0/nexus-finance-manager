import type { SVGProps } from "react";

/**
 * Ícones vetoriais lineares, no mesmo estilo do protótipo de UI (flat,
 * sem preenchimento, stroke-width 2) — nunca ícones do Material Design.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = (children: React.ReactNode, props: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const IconGrid = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="12" width="8" height="9" rx="1.5" />
      <rect x="3" y="14" width="8" height="7" rx="1.5" />
    </>,
    p,
  );

export const IconList = (p: IconProps) => base(<path d="M4 6h16M4 12h16M4 18h10" />, p);

export const IconTable = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </>,
    p,
  );

export const IconRepeat = (p: IconProps) =>
  base(
    <path d="M17 2.1l4 4-4 4M3 12.7V12a4 4 0 0 1 4-4h14M7 21.9l-4-4 4-4M21 11.3V12a4 4 0 0 1-4 4H3" />,
    p,
  );

export const IconTag = (p: IconProps) =>
  base(
    <>
      <path d="M20.6 12.1 12.4 3.9a2 2 0 0 0-1.4-.6H5a2 2 0 0 0-2 2v6a2 2 0 0 0 .6 1.4l8.2 8.2a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </>,
    p,
  );

export const IconCloudDown = (p: IconProps) =>
  base(<path d="M12 3v12M7 10l5 5 5-5M5 19h14" />, p);

export const IconSettings = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
    p,
  );

export const IconSearch = (p: IconProps) =>
  base(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>,
    p,
  );

export const IconArrowUp = (p: IconProps) => base(<path d="M6 15l6-6 6 6" />, p);
export const IconArrowDown = (p: IconProps) => base(<path d="M6 9l6 6 6-6" />, p);

export const IconCalendar = (p: IconProps) =>
  base(<path d="M17 3v4M7 3v4M3 9h18M4 5h16v16H4z" />, p);

export const IconUser = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>,
    p,
  );

export const IconChevronDown = (p: IconProps) => base(<path d="m6 9 6 6 6-6" />, p);
export const IconChevronsUpDown = (p: IconProps) => base(<path d="m7 15 5 5 5-5M7 9l5-5 5 5" />, p);
export const IconLogOut = (p: IconProps) =>
  base(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>, p);
export const IconPlus = (p: IconProps) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconCheck = (p: IconProps) => base(<path d="M20 6L9 17l-5-5" />, p);
export const IconX = (p: IconProps) => base(<path d="M18 6 6 18M6 6l12 12" />, p);
export const IconFolder = (p: IconProps) =>
  base(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />, p);
export const IconTrash = (p: IconProps) =>
  base(<path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6" />, p);

export const IconHome = (p: IconProps) => base(<path d="M3 11l9-8 9 8M5 10v10h14V10" />, p);

export const IconDownload = (p: IconProps) => base(<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />, p);
export const IconUpload = (p: IconProps) => base(<path d="M12 21V9M7 14l5-5 5 5M5 3h14" />, p);

export const IconSun = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </>,
    p,
  );
export const IconMoon = (p: IconProps) => base(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />, p);

export const IconGithub = (p: IconProps) =>
  base(
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.6 2.8 5.5 3.1 5.5 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.1 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
    p,
  );
export const IconLifeBuoy = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m7.5 7.5 2.7 2.7M16.5 7.5l-2.7 2.7M7.5 16.5l2.7-2.7M16.5 16.5l-2.7-2.7" />
    </>,
    p,
  );

export const IconWallet = (p: IconProps) =>
  base(
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    p,
  );

export const IconSort = (p: IconProps) => base(<path d="M7 10l5 5 5-5" />, p);

/** "Fixar como painel lateral" — retângulo com a coluna direita preenchida, convenção de dock-to-side. */
export const IconPanelRight = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="16" />
      <rect x="15" y="4" width="6" height="16" fill="currentColor" stroke="none" />
    </>,
    p,
  );

export const IconShoppingBag = (p: IconProps) =>
  base(<path d="M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4Z M3 6h18M16 10a4 4 0 0 1-8 0" />, p);

export const IconCar = (p: IconProps) =>
  base(
    <path d="M5 17h14M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 17 4 6H2m3 11 1.6-8h11.7L19 13" />,
    p,
  );

export const IconHeartPulse = (p: IconProps) =>
  base(
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6Z" />,
    p,
  );

export const IconBriefcase = (p: IconProps) =>
  base(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>, p);

export const IconZap = (p: IconProps) =>
  base(<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />, p);

export const IconArrowLeftRight = (p: IconProps) =>
  base(<path d="M17 2.1l4 4-4 4M3 12.7V12a4 4 0 0 1 4-4h14M7 21.9l-4-4 4-4M21 11.3V12a4 4 0 0 1-4 4H3" />, p);

export const IconMoreHorizontal = (p: IconProps) =>
  base(
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>,
    p,
  );

/** Fluxo de Trabalho — três colunas de altura desigual, convenção visual de kanban/quadro de arrastar. */
export const IconKanban = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.3" />
      <rect x="9.5" y="4" width="5" height="10" rx="1.3" />
      <rect x="16" y="4" width="5" height="13" rx="1.3" />
    </>,
    p,
  );

/** Alterna pra visão de timeline — uma linha com marcadores, eixo do tempo. */
export const IconTimeline = (p: IconProps) =>
  base(
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="7" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>,
    p,
  );

/** Alça de arrastar — seis pontinhos, convenção padrão de "drag handle". */
export const IconGripVertical = (p: IconProps) =>
  base(
    <>
      <circle cx="9" cy="5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1.3" fill="currentColor" stroke="none" />
    </>,
    p,
  );

/** Editar — lápis, convenção padrão de "edit". */
export const IconPencil = (p: IconProps) =>
  base(<path d="M17 3a2.83 2.83 0 1 1 4 4L7 21l-4 1 1-4Z M15 5l4 4" />, p);

/** Duplicar — dois retângulos sobrepostos, convenção padrão de "copy". */
export const IconCopy = (p: IconProps) =>
  base(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>,
    p,
  );

/** Contas bancárias — fachada de banco (colunas + telhado), convenção de "landmark". */
export const IconBank = (p: IconProps) =>
  base(
    <>
      <path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 10v11M10 10v11M14 10v11M18 10v11" />
    </>,
    p,
  );

/** Hambúrguer — abre o menu lateral no mobile. */
export const IconMenu = (p: IconProps) => base(<path d="M4 6h16M4 12h16M4 18h16" />, p);

export const IconChevronLeft = (p: IconProps) => base(<path d="m15 18-6-6 6-6" />, p);
export const IconChevronRight = (p: IconProps) => base(<path d="m9 18 6-6-6-6" />, p);

// ---------------------------------------------------------------------------
// Ícones de categoria — mais de 50 opções, agrupadas por tema pro seletor
// (ver IconPicker.tsx). Formas simples de propósito (linhas/círculos/retos),
// no mesmo estilo linear das demais — nada de precisão fotográfica, só
// reconhecível de relance num ícone de 16-20px.
// ---------------------------------------------------------------------------

export const IconCoffee = (p: IconProps) =>
  base(
    <>
      <path d="M3 8h13v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 3v1.5M10 3v1.5M13 3v1.5" />
    </>,
    p,
  );

export const IconGift = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <rect x="4" y="12" width="16" height="9" rx="1" />
      <path d="M12 8v13" />
      <path d="M8 8a2.5 2.5 0 1 1 4-3 2.5 2.5 0 1 1 4 3" />
    </>,
    p,
  );

/** Avião de papel — usado pra "viagem". */
export const IconPlane = (p: IconProps) => base(<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>, p);

export const IconBookOpen = (p: IconProps) =>
  base(<><path d="M12 7c-2-2-5-2-8-2v13c3 0 6 0 8 2 2-2 5-2 8-2V5c-3 0-6 0-8 2Z" /><path d="M12 7v13" /></>, p);

export const IconGamepad = (p: IconProps) =>
  base(
    <>
      <rect x="2" y="7" width="20" height="10" rx="5" />
      <path d="M7 10v4M5 12h4" />
      <circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </>,
    p,
  );

export const IconDumbbell = (p: IconProps) => base(<path d="M6 8v8M18 8v8M2 10v4M22 10v4M8 12h8" />, p);

/** Telefone (ligação) — contas de telecom. */
export const IconPhone = (p: IconProps) =>
  base(<path d="M5 4h4l2 5-2.5 1.6a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2Z" />, p);

export const IconCreditCard = (p: IconProps) =>
  base(<><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></>, p);

export const IconShirt = (p: IconProps) => base(<path d="M8 4 4 8l3 3v9h10v-9l3-3-4-4-2 2h-4Z" />, p);

export const IconLightbulb = (p: IconProps) =>
  base(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" />, p);

export const IconGraduationCap = (p: IconProps) =>
  base(<><path d="M12 3 2 8l10 5 10-5-10-5Z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /></>, p);

export const IconDroplet = (p: IconProps) => base(<path d="M12 2s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />, p);

export const IconWifi = (p: IconProps) =>
  base(
    <>
      <path d="M2 8.5a16 16 0 0 1 20 0" />
      <path d="M5.5 12.5a11 11 0 0 1 13 0" />
      <path d="M9 16.5a6 6 0 0 1 6 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </>,
    p,
  );

/** Chave inglesa — manutenção/serviços. */
export const IconTool = (p: IconProps) =>
  base(<path d="M14.7 6.3a4 4 0 0 0-5.6 5l-7 7 2 2 7-7a4 4 0 0 0 5.6-5l-2.8 2.8-2-2Z" />, p);

export const IconUtensils = (p: IconProps) =>
  base(<path d="M6 2v7a2 2 0 0 0 4 0V2M8 9v13M17 2c-1.5 0-3 1.5-3 4v3a1 1 0 0 0 1 1h1v11" />, p);

export const IconPizza = (p: IconProps) =>
  base(
    <>
      <path d="M12 2 2 20h20L12 2Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="16" r="1" fill="currentColor" stroke="none" />
    </>,
    p,
  );

export const IconFilm = (p: IconProps) =>
  base(<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h4M3 15h4M17 9h4M17 15h4M9 4v16M15 4v16" /></>, p);

export const IconMusicNote = (p: IconProps) =>
  base(<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>, p);

export const IconCamera = (p: IconProps) =>
  base(<><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.5" /></>, p);

export const IconTrendingUp = (p: IconProps) => base(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 6h6v6" /></>, p);

/** Pata — pets. */
export const IconPaw = (p: IconProps) =>
  base(
    <>
      <circle cx="7" cy="8" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="17" cy="8" r="2" />
      <path d="M12 12c-3.3 0-6 2-6 4.5S8 21 12 21s6-1.9 6-4.5S15.3 12 12 12Z" />
    </>,
    p,
  );

export const IconShoppingCart = (p: IconProps) =>
  base(
    <>
      <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
    </>,
    p,
  );

export const IconStar = (p: IconProps) => base(<path d="m12 2 3 6.5 7 1-5.2 4.9L18 21l-6-3.5L6 21l1.2-6.6L2 9.5l7-1Z" />, p);

export const IconFlag = (p: IconProps) => base(<><path d="M5 3v18" /><path d="M5 4h13l-3 4 3 4H5" /></>, p);

export const IconMapPin = (p: IconProps) =>
  base(<><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>, p);

export const IconSmartphone = (p: IconProps) => base(<><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>, p);

export const IconKey = (p: IconProps) => base(<><circle cx="7" cy="15" r="4" /><path d="M10 12 20 2M17 5l2 2M14 8l2 2" /></>, p);

export const IconCake = (p: IconProps) =>
  base(<><path d="M4 21v-7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7Z" /><path d="M4 17h16" /><path d="M9 11V7M12 11V7M15 11V7" /></>, p);

export const IconUmbrella = (p: IconProps) =>
  base(<><path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2Z" /><path d="M12 12v8a2 2 0 0 1-4 0" /><path d="M12 2v2" /></>, p);

export const IconScissors = (p: IconProps) =>
  base(<><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 7.5 21 20M8.5 16.5 21 4" /></>, p);

export const IconShield = (p: IconProps) => base(<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />, p);

export const IconTrophy = (p: IconProps) =>
  base(
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0Z" />
      <path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4" />
      <path d="M12 14v4M9 21h6M9 18h6v3H9Z" />
    </>,
    p,
  );

export const IconLeaf = (p: IconProps) => base(<><path d="M4 20c8 0 16-6 16-16-8 0-16 6-16 16Z" /><path d="M6 18c3-5 7-8 13-11" /></>, p);

export const IconTruck = (p: IconProps) =>
  base(
    <>
      <rect x="1" y="7" width="14" height="10" rx="1" />
      <path d="M15 10h4l3 3v4h-7Z" />
      <circle cx="6" cy="18.5" r="1.6" />
      <circle cx="17.5" cy="18.5" r="1.6" />
    </>,
    p,
  );

export const IconGlobe = (p: IconProps) =>
  base(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 2.5 4.3 5.7 4.3 9s-1.5 6.5-4.3 9c-2.8-2.5-4.3-5.7-4.3-9S9.2 5.5 12 3Z" /></>, p);

export const CATEGORY_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  home: IconHome,
  "shopping-bag": IconShoppingBag,
  car: IconCar,
  "heart-pulse": IconHeartPulse,
  repeat: IconRepeat,
  briefcase: IconBriefcase,
  zap: IconZap,
  "arrow-left-right": IconArrowLeftRight,
  "more-horizontal": IconMoreHorizontal,
  tag: IconTag,
  wallet: IconWallet,
  bank: IconBank,
  calendar: IconCalendar,
  user: IconUser,
  folder: IconFolder,
  sun: IconSun,
  moon: IconMoon,
  settings: IconSettings,
  "life-buoy": IconLifeBuoy,
  coffee: IconCoffee,
  gift: IconGift,
  plane: IconPlane,
  "book-open": IconBookOpen,
  gamepad: IconGamepad,
  dumbbell: IconDumbbell,
  phone: IconPhone,
  "credit-card": IconCreditCard,
  shirt: IconShirt,
  lightbulb: IconLightbulb,
  "graduation-cap": IconGraduationCap,
  droplet: IconDroplet,
  wifi: IconWifi,
  tool: IconTool,
  utensils: IconUtensils,
  pizza: IconPizza,
  film: IconFilm,
  "music-note": IconMusicNote,
  camera: IconCamera,
  "trending-up": IconTrendingUp,
  paw: IconPaw,
  "shopping-cart": IconShoppingCart,
  star: IconStar,
  flag: IconFlag,
  "map-pin": IconMapPin,
  smartphone: IconSmartphone,
  key: IconKey,
  cake: IconCake,
  umbrella: IconUmbrella,
  scissors: IconScissors,
  shield: IconShield,
  trophy: IconTrophy,
  leaf: IconLeaf,
  truck: IconTruck,
  globe: IconGlobe,
};

/** Rótulo em português de cada ícone — tooltip do seletor e índice de busca. */
export const CATEGORY_ICON_LABELS: Record<string, string> = {
  home: "Casa",
  "shopping-bag": "Compras",
  car: "Carro",
  "heart-pulse": "Saúde",
  repeat: "Assinatura",
  briefcase: "Trabalho",
  zap: "Energia",
  "arrow-left-right": "Transferência",
  "more-horizontal": "Outros",
  tag: "Etiqueta",
  wallet: "Carteira",
  bank: "Banco",
  calendar: "Calendário",
  user: "Pessoal",
  folder: "Documentos",
  sun: "Ar livre",
  moon: "Vida noturna",
  settings: "Manutenção",
  "life-buoy": "Seguro",
  coffee: "Café",
  gift: "Presente",
  plane: "Viagem",
  "book-open": "Educação",
  gamepad: "Jogos",
  dumbbell: "Academia",
  phone: "Telefonia",
  "credit-card": "Cartão",
  shirt: "Roupas",
  lightbulb: "Energia elétrica",
  "graduation-cap": "Formação",
  droplet: "Água",
  wifi: "Internet",
  tool: "Manutenção",
  utensils: "Alimentação",
  pizza: "Delivery",
  film: "Cinema",
  "music-note": "Música",
  camera: "Fotografia",
  "trending-up": "Investimentos",
  paw: "Pet",
  "shopping-cart": "Mercado",
  star: "Favoritos",
  flag: "Meta",
  "map-pin": "Localização",
  smartphone: "Celular",
  key: "Aluguel",
  cake: "Festas",
  umbrella: "Seguro",
  scissors: "Beleza",
  shield: "Proteção",
  trophy: "Prêmios",
  leaf: "Sustentabilidade",
  truck: "Mudança",
  globe: "Assinaturas online",
};

export interface CategoryIconGroup {
  label: string;
  keys: string[];
}

/** Ícones de categoria agrupados por tema — usado pelo IconPicker (popup com busca). */
export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  { label: "Casa & Utilidades", keys: ["home", "lightbulb", "droplet", "wifi", "tool", "key", "phone"] },
  { label: "Alimentação", keys: ["shopping-bag", "coffee", "utensils", "pizza", "cake"] },
  { label: "Transporte & Viagem", keys: ["car", "plane", "truck", "globe", "map-pin"] },
  { label: "Saúde & Bem-estar", keys: ["heart-pulse", "dumbbell", "scissors", "umbrella", "shield"] },
  { label: "Lazer & Cultura", keys: ["gamepad", "film", "music-note", "camera", "book-open", "star"] },
  { label: "Finanças", keys: ["briefcase", "wallet", "credit-card", "zap", "trending-up", "arrow-left-right", "bank"] },
  { label: "Família & Pets", keys: ["paw", "graduation-cap", "gift", "user"] },
  { label: "Compras", keys: ["shopping-cart", "shirt", "tag", "smartphone", "flag"] },
  { label: "Trabalho & Outros", keys: ["calendar", "folder", "sun", "moon", "settings", "life-buoy", "trophy", "leaf", "repeat", "more-horizontal"] },
];

/** Resolve o `icon` salvo em `categories.icon` (ver packages/core/src/categories.seed.ts) para um componente. */
export function CategoryIcon({ icon, ...rest }: IconProps & { icon: string | null }) {
  const Cmp = (icon && CATEGORY_ICONS[icon]) || IconTag;
  return <Cmp {...rest} />;
}
