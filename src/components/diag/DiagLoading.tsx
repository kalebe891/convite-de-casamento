import { useEffect } from "react";
import { diag } from "@/lib/diag";

/**
 * DiagLoading — instrumentação Etapa 1.24.15.01.
 * Loga mount/unmount do componente de loading identificado por `source`.
 */
interface Props {
  source: string;
  className?: string;
  children: React.ReactNode;
}

const DiagLoading = ({ source, className, children }: Props) => {
  useEffect(() => {
    diag(source, "Loading component mounted");
    return () => {
      diag(source, "Loading component unmounted");
    };
  }, [source]);

  return <div className={className}>{children}</div>;
};

export default DiagLoading;
