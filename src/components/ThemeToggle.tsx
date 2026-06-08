import { Moon, Sun, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const INSTITUTIONAL_ROUTES = new Set(["/", "/casamento", "/aniversario"]);

const isInstitutionalPath = (pathname: string) => {
  // Apenas rotas institucionais exatas. /casamento/:slug e /aniversario/:slug NÃO entram.
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return INSTITUTIONAL_ROUTES.has(normalized);
};

interface ThemeToggleProps {
  label?: string;
}

const ThemeToggle = ({ label: textLabel }: ThemeToggleProps = {}) => {
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const institutional = isInstitutionalPath(pathname);

  // Calcula o próximo tema, seguindo a mesma lógica do clique.
  const nextTheme = institutional
    ? theme === "light"
      ? "brown"
      : theme === "brown"
        ? "dark"
        : "light"
    : theme === "dark"
      ? "light"
      : "dark";

  // Label dinâmico: representa o próximo tema que será ativado.
  const NEXT_LABELS: Record<string, string> = {
    light: "Light",
    brown: "Brown",
    dark: "Dark",
  };
  const dynamicLabel = NEXT_LABELS[nextTheme] ?? "Tema";

  const handleClick = () => {
    setTheme(nextTheme);
  };

  const a11yLabel = `Alternar tema (próximo: ${dynamicLabel})`;
  const showLabel = Boolean(textLabel);

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={handleClick}
      className={showLabel ? "gap-2" : "rounded-full relative"}
    >
      <span className={showLabel ? "relative inline-flex h-5 w-5 items-center justify-center" : "contents"}>
        {institutional && theme === "brown" ? (
          <Sparkles className="h-5 w-5 text-primary" />
        ) : (
          <>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </>
        )}
      </span>
      {showLabel ? (
        <span className="hidden sm:inline">{dynamicLabel}</span>
      ) : null}
      <span className="sr-only">{a11yLabel}</span>
    </Button>
  );
};

export default ThemeToggle;
