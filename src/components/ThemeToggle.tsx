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

  const handleClick = () => {
    if (institutional) {
      // Ciclo institucional: light → brown → dark → light
      const next =
        theme === "light" ? "brown" : theme === "brown" ? "dark" : "light";
      setTheme(next);
    } else {
      // Tenant/Admin: apenas light ↔ dark (brown é tratado como "não-dark")
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const a11yLabel = institutional
    ? `Alternar tema (atual: ${theme ?? "light"})`
    : "Alternar tema";

  return (
    <Button
      variant="ghost"
      size={textLabel ? "sm" : "icon"}
      onClick={handleClick}
      className={textLabel ? "gap-2" : "rounded-full relative"}
    >
      <span className={textLabel ? "relative inline-flex h-5 w-5 items-center justify-center" : "contents"}>
        {institutional && theme === "brown" ? (
          <Sparkles className="h-5 w-5 text-primary" />
        ) : (
          <>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </>
        )}
      </span>
      {textLabel ? (
        <span className="hidden sm:inline">{textLabel}</span>
      ) : null}
      <span className="sr-only">{a11yLabel}</span>
    </Button>
  );
};

export default ThemeToggle;
