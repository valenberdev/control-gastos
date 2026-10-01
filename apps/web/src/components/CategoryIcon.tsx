import type { CSSProperties, ReactNode } from "react";

interface CategoryStyle {
  c1: string;
  c2: string;
  icon: ReactNode;
}

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const STYLES: Record<string, CategoryStyle> = {
  comida: {
    c1: "#FFA53D",
    c2: "#FF6B2C",
    icon: (
      <>
        <path d="M7 3v7a2.5 2.5 0 0 0 0 0M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 10.5V21" />
        <path d="M17 21V3c-2.3 1.2-3.5 3.8-3.5 7 0 1.8 1.2 3 3.5 3.2" />
      </>
    ),
  },
  transporte: {
    c1: "#5AC8FA",
    c2: "#0A84FF",
    icon: (
      <>
        <path d="M5 17H3.5v-4L5.5 8h13l2 5v4H19" />
        <path d="M5 13h14" />
        <circle cx="7.5" cy="17" r="1.8" />
        <circle cx="16.5" cy="17" r="1.8" />
      </>
    ),
  },
  entretenimiento: {
    c1: "#D68CFF",
    c2: "#A64DE8",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3.5" />
        <path d="M10.2 9.4v5.2l4.4-2.6z" />
      </>
    ),
  },
  salud: {
    c1: "#FF7A9C",
    c2: "#F0366B",
    icon: <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.5 2.4c0 5.8-7.5 10.4-7.5 10.4z" />,
  },
  servicios: {
    c1: "#3DDBB0",
    c2: "#12A87F",
    icon: <path d="M13 3L5.5 13H11l-1 8 7.5-10H12z" />,
  },
  otros: {
    c1: "#A6AABB",
    c2: "#7A7F93",
    icon: (
      <>
        <circle cx="6" cy="12" r="1.3" />
        <circle cx="12" cy="12" r="1.3" />
        <circle cx="18" cy="12" r="1.3" />
      </>
    ),
  },
  ingreso: {
    c1: "#5FE08A",
    c2: "#27B957",
    icon: (
      <>
        <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
        <path d="M5 20h14" />
      </>
    ),
  },
};

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STYLES).map(([name, s]) => [name, s.c2]),
);

export function categoryVars(name: string): CSSProperties {
  const s = STYLES[name] ?? STYLES.otros;
  return { "--c1": s.c1, "--c2": s.c2 } as CSSProperties;
}

interface CategoryIconProps {
  name: string;
  small?: boolean;
}

export default function CategoryIcon({ name, small }: CategoryIconProps) {
  const s = STYLES[name] ?? STYLES.otros;
  return (
    <span
      className={small ? "cat-icon sm" : "cat-icon"}
      style={categoryVars(name)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" {...common}>
        {s.icon}
      </svg>
    </span>
  );
}
