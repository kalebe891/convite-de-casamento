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

const ThemeToggle = () => {
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

  const label = institutional
    ? `Alternar tema (atual: ${theme ?? "light"})`
    : "Alternar tema";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="rounded-full relative"
    >
      {institutional && theme === "brown" ? (
        <Sparkles className="h-5 w-5 text-primary" />
      ) : (
        <>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </>
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
};

export default ThemeToggle;
