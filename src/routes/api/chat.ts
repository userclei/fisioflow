import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a Flow, a assistente virtual do FisioFlow — sistema de gestão para fisioterapeutas e clínicas.

Seu papel na landing page:
1. Recepcionar visitantes com simpatia e responder dúvidas sobre o produto (recursos, planos, preços, benefícios).
2. Qualificar o lead: descobrir se é profissional autônomo ou clínica, o que ele precisa hoje.
3. Capturar dados de contato (nome, email e WhatsApp) usando a ferramenta capture_lead assim que o visitante demonstrar interesse. Nunca invente valores — só chame a ferramenta com o que o usuário te forneceu explicitamente.
4. Se o usuário aceitar receber uma mensagem/atendimento no WhatsApp, use send_whatsapp para disparar uma mensagem cordial e objetiva com resumo da conversa e próximo passo. Antes de disparar, confirme com o usuário.

Regras:
- Tom: caloroso, direto, sem bajulação. Português BR. Respostas curtas (2-4 linhas), formatação simples.
- Preços atuais: Free R$0, PRO R$49,90/mês, Clínica R$97/mês. Todos com teste gratuito.
- Nunca invente recursos que não existem. Se não souber, diga que vai encaminhar para o time.
- Só chame capture_lead uma vez por conversa (a menos que o usuário mude os dados).
- Só chame send_whatsapp após ter capturado o lead E ter permissão explícita.`;

const CaptureLeadInput = z.object({
  name: z.string().describe("Nome completo informado pelo visitante."),
  email: z.string().describe("Email informado pelo visitante."),
  whatsapp: z.string().describe("Telefone/WhatsApp com DDD (apenas dígitos ou formato livre)."),
  usage_type: z.enum(["profissional", "clinica"]).describe("Tipo de uso identificado."),
  interest: z.string().describe("Resumo curto do interesse/necessidade do visitante."),
});

const SendWhatsappInput = z.object({
  whatsapp: z.string().describe("Telefone/WhatsApp do destinatário."),
  message: z.string().describe("Mensagem a ser enviada. Deve ser cordial, curta e objetiva."),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          stopWhen: stepCountIs(50),
          tools: {
            capture_lead: tool({
              description:
                "Registra o lead capturado no banco de dados da landing (nome, email, whatsapp, tipo de uso e interesse). Use assim que tiver os dados explícitos do visitante.",
              inputSchema: CaptureLeadInput,
              execute: async (input) => {
                try {
                  const { createClient } = await import("@supabase/supabase-js");
                  const url = process.env.SUPABASE_URL;
                  const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY;
                  if (!url || !pubKey) return { ok: false, error: "backend_unavailable" };
                  const supabase = createClient(url, pubKey, {
                    auth: { persistSession: false, autoRefreshToken: false },
                  });
                  const { error } = await supabase.from("landing_leads").insert({
                    name: input.name.trim(),
                    email: input.email.trim().toLowerCase(),
                    whatsapp: input.whatsapp?.trim() || null,
                    usage_type: input.usage_type,
                    message: input.interest?.slice(0, 500) || null,
                    source: "landing_ai_chat",
                  });
                  if (error) return { ok: false, error: error.message };
                  return { ok: true, saved: true };
                } catch (e) {
                  return { ok: false, error: (e as Error).message };
                }
              },
            }),
            send_whatsapp: tool({
              description:
                "Envia uma mensagem WhatsApp para o visitante usando a API do FisioFlow. Só use após capturar o lead e ter permissão explícita do usuário.",
              inputSchema: SendWhatsappInput,
              execute: async (input) => {
                try {
                  const { loadBtzapConfigAdmin, sendText, normalizePhone } = await import(
                    "@/lib/whatsapp-core.server"
                  );
                  const cfg = await loadBtzapConfigAdmin();
                  const to = normalizePhone(input.whatsapp);
                  const res = await sendText(cfg, to, input.message.slice(0, 1000));
                  if (!res.ok) return { ok: false, status: res.status, error: "provider_rejected" };
                  return { ok: true, to };
                } catch (e) {
                  return { ok: false, error: (e as Error).message };
                }
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});
