import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getPendingCheckins } from "@/lib/db";

export const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePending = async () => {
      const pending = await getPendingCheckins();
      setPendingCount(pending.length);
    };

    updatePending();
    const interval = setInterval(updatePending, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
        isOnline ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
      }`}
    >
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-600" />
      ) : (
        <WifiOff className="w-4 h-4 text-yellow-600" />
      )}
      <span className="text-sm font-medium">
        {isOnline
          ? `🟢 Conectado${pendingCount > 0 ? ` — ${pendingCount} pendente(s)` : " — Tudo sincronizado"}`
          : `🟡 Offline — ${pendingCount} pendente(s)`}
      </span>
    </div>
  );
};
