// 主题色板：manifest.theme → 覆盖 Tailwind brand-* CSS 变量，整站换肤
// 每个色板 10 阶（50-900），pink 为默认（=viral-video-team 粉品红）
export const THEMES: Record<string, Record<string, string>> = {
  pink: {
    50: "#fdf2f9", 100: "#fce7f6", 200: "#fbcfe9", 300: "#f9a8d4", 400: "#f472b6",
    500: "#ec4899", 600: "#db2777", 700: "#be185d", 800: "#9d174d", 900: "#831843",
  },
  purple: {
    50: "#eeedfe", 100: "#cecbf6", 200: "#afa9ec", 300: "#9790e4", 400: "#7f77dd",
    500: "#6f62ca", 600: "#534ab7", 700: "#473f9f", 800: "#3c3489", 900: "#26215c",
  },
  teal: {
    50: "#e1f5ee", 100: "#9fe1cb", 200: "#5dcaa5", 300: "#3eb48e", 400: "#1d9e75",
    500: "#178c66", 600: "#0f6e56", 700: "#0d5f4b", 800: "#085041", 900: "#04342c",
  },
  blue: {
    50: "#e6f1fb", 100: "#b5d4f4", 200: "#85b7eb", 300: "#5ea9e4", 400: "#378add",
    500: "#2874c1", 600: "#185fa5", 700: "#145190", 800: "#0c447c", 900: "#042c53",
  },
  amber: {
    50: "#faeeda", 100: "#fac775", 200: "#ef9f27", 300: "#d2ab4e", 400: "#ba7517",
    500: "#a06211", 600: "#854f0b", 700: "#74440a", 800: "#633806", 900: "#412402",
  },
  green: {
    50: "#eaf3de", 100: "#c0dd97", 200: "#97c459", 300: "#7bb03e", 400: "#639922",
    500: "#4f831a", 600: "#3b6d11", 700: "#315e0e", 800: "#27500a", 900: "#173404",
  },
  coral: {
    50: "#faece7", 100: "#f5c4b3", 200: "#f0997b", 300: "#e47757", 400: "#d85a30",
    500: "#bc4b26", 600: "#993c1d", 700: "#853418", 800: "#712b13", 900: "#4a1b0c",
  },
};

export function applyTheme(theme?: string): void {
  const p = THEMES[theme ?? "pink"] ?? THEMES.pink;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p)) {
    root.style.setProperty(`--color-brand-${k}`, v);
  }
}
