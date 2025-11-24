import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, CheckCircle, XCircle, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Estatisticas = () => {
  const [stats, setStats] = useState({
    totalGuests: 0,
    pending: 0,
    attending: 0,
    notAttending: 0,
    checkedIn: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: guests } = await supabase
        .from('guests')
        .select('*');

      const allGuests = guests || [];
      const confirmed = allGuests.filter(g => g.status === 'confirmed').length;
      const declined = allGuests.filter(g => g.status === 'declined').length;
      const pending = allGuests.filter(g => g.status === 'pending').length;
      const checkedIn = allGuests.filter(g => g.checked_in_at !== null).length;
      
      setStats({
        totalGuests: allGuests.length,
        pending,
        attending: confirmed,
        notAttending: declined,
        checkedIn,
      });
    };

    fetchStats();
  }, []);

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
    </div>
  );
};

export default Estatisticas;
