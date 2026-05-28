import { Link } from "react-router-dom";

const MarketingFooter = () => {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl font-semibold text-foreground">Convites</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Plataforma premium de convites digitais para casamentos, aniversários e celebrações marcantes.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Produtos</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/casamento" className="hover:text-foreground">Casamento</Link></li>
            <li><Link to="/aniversario" className="hover:text-foreground">Aniversário</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Conta</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Entrar</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Convites. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
