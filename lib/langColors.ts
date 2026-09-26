/** GitHub linguist language colors (subset covering the owner's repos). */
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  Python: "#3572A5",
  Astro: "#ff5a03",
  CSS: "#563d7c",
  Go: "#00ADD8",
  Rust: "#dea584",
  Shell: "#89e051",
  Kotlin: "#A97BFF",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Vue: "#41b883",
  SCSS: "#c6538c",
  Dockerfile: "#384d54",
  Lua: "#000080",
  "Jupyter Notebook": "#DA5B0B",
  Markdown: "#083fa1",
  MDX: "#fcb32c",
  Svelte: "#ff3e00",
  Zig: "#ec915c",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
};

export const FALLBACK_LANG_COLOR = "#8e8b82";

export function langColor(language: string): string {
  return LANG_COLORS[language] ?? FALLBACK_LANG_COLOR;
}
