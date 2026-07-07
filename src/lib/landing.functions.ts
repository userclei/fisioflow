import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const LeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  usage_type: z.enum(["profissional", "clinica"]),
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof LeadSchema>;

export const createLandingLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LeadSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Backend indisponível.");

    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("landing_leads").insert({
      name: data.name,
      email: data.email.toLowerCase(),
      whatsapp: data.whatsapp || null,
      usage_type: data.usage_type,
      message: data.message || null,
      source: "landing_page",
    });

    if (error) {
      throw new Error("Não foi possível registrar seu interesse agora. Tente novamente em instantes.");
    }
    return { ok: true };
  });
