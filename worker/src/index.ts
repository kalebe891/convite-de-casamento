/**
 * Edge SEO Renderer — Etapa 1.25.9
 *
 * Module Worker. Delega para `handleRequest`, que faz o roteamento
 * completo (health check, rotas elegíveis a SEO, pass-through).
 */
import { handleRequest, type HandlerEnv } from "./handleRequest";

export type Env = HandlerEnv;

export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
};
