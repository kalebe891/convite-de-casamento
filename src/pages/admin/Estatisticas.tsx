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
    totalCompanions: 0,
    totalPeople: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [invitationsRes, rsvpsRes] = await Promise.all([
        supabase.from('invitations').select('*', { count: 'exact', head: true }),
        supabase.from('rsvps').select('*'),
      ]);

      const rsvps = rsvpsRes.data || [];
      const attending = rsvps.filter(r => r.attending).length;
      const totalCompanions = rsvps.filter(r => r.attending && r.plus_one).length;
      const totalPeople = attending + totalCompanions;
      
      setStats({
        totalInvitations: invitationsRes.count || 0,
        totalRsvps: rsvps.length,
        attending,
        notAttending: rsvps.filter(r => !r.attending).length,
        totalCompanions,
        totalPeople,
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Confirmações</CardTitle>
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

        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pessoas</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalPeople}</div>
            <p className="text-xs text-muted-foreground">
              Confirmados + Acompanhantes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <p>
              <strong>Total de Pessoas:</strong> Soma de {stats.attending} convidados confirmados + {stats.totalCompanions} acompanhantes = {stats.totalPeople} pessoas
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
          <CardDescription>
            Taxa de confirmação e outras métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Resposta</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalInvitations > 0 
                    ? Math.round((stats.totalRsvps / stats.totalInvitations) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ 
                    width: stats.totalInvitations > 0 
                      ? `${(stats.totalRsvps / stats.totalInvitations) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estatisticas;
