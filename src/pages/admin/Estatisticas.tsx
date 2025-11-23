import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Estatisticas = () => {
  const [stats, setStats] = useState({
    totalInvitations: 0,
    totalRsvps: 0,
    attending: 0,
    notAttending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: invitations } = await supabase
        .from('invitations')
        .select('*');

      const allInvitations = invitations || [];
      const respondedInvitations = allInvitations.filter(inv => inv.responded_at !== null);
      const attending = respondedInvitations.filter(inv => inv.attending === true).length;
      const notAttending = respondedInvitations.filter(inv => inv.attending === false).length;
      
      setStats({
        totalInvitations: allInvitations.length,
        totalRsvps: respondedInvitations.length,
        attending,
        notAttending,
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
            <div className="text-2xl font-bold">{stats.totalInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Convites enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRsvps}</div>
            <p className="text-xs text-muted-foreground">
              Respostas recebidas
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

      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
          <CardDescription>
            Taxa de confirmação dos convidados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Confirmação</span>
              <span className="text-sm text-muted-foreground">
                {stats.totalRsvps > 0 
                  ? Math.round((stats.attending / stats.totalRsvps) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all" 
                style={{ 
                  width: stats.totalRsvps > 0 
                    ? `${(stats.attending / stats.totalRsvps) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estatisticas;
