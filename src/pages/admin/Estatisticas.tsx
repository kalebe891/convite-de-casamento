import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, CheckCircle, XCircle, UserCheck, Gift, PackageCheck, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWedding } from "@/contexts/WeddingContext";

type PixStat = { id: string; gift_name: string; selections: number };

const Estatisticas = () => {
  const { weddingId } = useWedding();
  const [stats, setStats] = useState({
    totalGuests: 0,
    pending: 0,
    attending: 0,
    notAttending: 0,
    checkedIn: 0,
    giftsReserved: 0,
    giftsTotal: 0,
    giftsReceived: 0,
  });

  useEffect(() => {
    if (!weddingId) return;
    const fetchStats = async () => {
      const [{ data: guests }, { data: gifts }] = await Promise.all([
        supabase.from('guests').select('*').eq('wedding_id', weddingId),
        supabase.from('gift_items').select('id, selected_by_guest_id, is_purchased').eq('wedding_id', weddingId),
      ]);

      const allGuests = guests || [];
      const allGifts = gifts || [];
      const confirmed = allGuests.filter(g => g.status === 'confirmed').length;
      const declined = allGuests.filter(g => g.status === 'declined').length;
      const pending = allGuests.filter(g => g.status === 'pending').length;
      const checkedIn = allGuests.filter(g => g.checked_in_at !== null).length;
      const giftsReserved = allGifts.filter(g => g.selected_by_guest_id !== null).length;
      const giftsReceived = allGifts.filter(g => g.is_purchased === true).length;
      
      setStats({
        totalGuests: allGuests.length,
        pending,
        attending: confirmed,
        notAttending: declined,
        checkedIn,
        giftsReserved,
        giftsTotal: allGifts.length,
        giftsReceived,
      });
    };

    fetchStats();
  }, [weddingId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Estatísticas</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe números e métricas do seu casamento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Convites</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              Convites enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attending}</div>
            <p className="text-xs text-muted-foreground">
              Convidados presentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Confirmados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notAttending}</div>
            <p className="text-xs text-muted-foreground">
              Convidados ausentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Análise de Confirmação</CardTitle>
            <CardDescription>
              Taxa de confirmação dos convidados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Confirmação</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalGuests > 0 
                    ? Math.round((stats.attending / stats.totalGuests) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all" 
                  style={{ 
                    width: stats.totalGuests > 0 
                      ? `${(stats.attending / stats.totalGuests) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Check-in Realizado</CardTitle>
              <CardDescription className="mt-2">
                Convidados que fizeram check-in
              </CardDescription>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.checkedIn}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.attending} confirmados
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ 
                  width: stats.attending > 0 
                    ? `${(stats.checkedIn / stats.attending) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gift Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Presentes Reservados</CardTitle>
              <CardDescription className="mt-2">
                Presentes escolhidos pelos convidados
              </CardDescription>
            </div>
            <Gift className="h-8 w-8 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.giftsReserved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.giftsTotal} presentes na lista
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div 
                className="bg-amber-600 h-2 rounded-full transition-all" 
                style={{ 
                  width: stats.giftsTotal > 0 
                    ? `${(stats.giftsReserved / stats.giftsTotal) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Presentes Recebidos</CardTitle>
              <CardDescription className="mt-2">
                Presentes entregues no check-in
              </CardDescription>
            </div>
            <PackageCheck className="h-8 w-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.giftsReceived}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.giftsReserved} reservados
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all" 
                style={{ 
                  width: stats.giftsReserved > 0 
                    ? `${(stats.giftsReceived / stats.giftsReserved) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Estatisticas;
