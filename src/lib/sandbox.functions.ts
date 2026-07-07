import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Popula o workspace do usuário sandbox recém-criado com dados de exemplo.
 * Roda como o próprio usuário (RLS aplicada) — não precisa de service role.
 */
export const seedSandboxData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("default_workspace_id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    const wsId = profile?.default_workspace_id;
    if (!wsId) throw new Error("Workspace sandbox ainda não foi criado");

    // Evita duplicar seed se o usuário clicar de novo
    const { count } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", wsId);
    if ((count ?? 0) > 0) return { ok: true, alreadySeeded: true };

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    const { data: insertedPatients } = await supabase
      .from("patients")
      .insert([
        { workspace_id: wsId, created_by: userId, full_name: "Ana Souza", phone: "(11) 98888-1111", email: "ana@exemplo.com", treatment_goal: "Reabilitação de joelho", status: "active" },
        { workspace_id: wsId, created_by: userId, full_name: "Carlos Lima", phone: "(11) 97777-2222", email: "carlos@exemplo.com", treatment_goal: "Dor lombar crônica", status: "active" },
        { workspace_id: wsId, created_by: userId, full_name: "Beatriz Rocha", phone: "(11) 96666-3333", email: "bia@exemplo.com", treatment_goal: "Pós-cirúrgico ombro", status: "active" },
      ])
      .select("id, full_name");

    const patientIds = insertedPatients ?? [];

    await supabase.from("appointments").insert([
      { workspace_id: wsId, patient_id: patientIds[0]?.id, professional_id: userId, created_by: userId, title: `Sessão — ${patientIds[0]?.full_name ?? "Paciente"}`, type: "sessao", event_date: iso(today), start_time: "09:00", end_time: "10:00", status: "scheduled" },
      { workspace_id: wsId, patient_id: patientIds[1]?.id, professional_id: userId, created_by: userId, title: `Avaliação — ${patientIds[1]?.full_name ?? "Paciente"}`, type: "avaliacao", event_date: iso(addDays(1)), start_time: "14:00", end_time: "15:00", status: "scheduled" },
      { workspace_id: wsId, patient_id: patientIds[2]?.id, professional_id: userId, created_by: userId, title: `Retorno — ${patientIds[2]?.full_name ?? "Paciente"}`, type: "retorno", event_date: iso(addDays(3)), start_time: "16:30", end_time: "17:15", status: "scheduled" },
    ]);

    await supabase.from("charges").insert([
      { workspace_id: wsId, patient_id: patientIds[0]?.id, description: "Sessão de fisioterapia", amount: 150, due_date: iso(addDays(-2)), status: "pending", created_by: userId },
      { workspace_id: wsId, patient_id: patientIds[1]?.id, description: "Pacote 4 sessões", amount: 560, due_date: iso(addDays(5)), status: "paid", paid_at: new Date().toISOString(), payment_method: "pix", created_by: userId },
    ]);

    await supabase.from("tasks").insert([
      { workspace_id: wsId, title: "Ligar para Ana confirmando sessão", priority: "medium", status: "pending", due_date: iso(today), created_by: userId, assigned_to: userId },
      { workspace_id: wsId, title: "Preparar plano de exercícios para Carlos", priority: "high", status: "pending", due_date: iso(addDays(1)), created_by: userId, assigned_to: userId },
    ]);

    await supabase.from("clinical_notes").insert([
      { workspace_id: wsId, patient_id: patientIds[0]?.id, professional_id: userId, created_by: userId, title: "Avaliação inicial", category: "avaliacao", visibility: "workspace", content: "Paciente apresenta dor moderada em joelho direito, ADM reduzida." },
    ]);

    await supabase.from("exercises").insert([
      { workspace_id: wsId, name: "Ponte", category: "Fortalecimento", sets: "3", repetitions: "12", difficulty: "facil", created_by: userId },
      { workspace_id: wsId, name: "Alongamento posterior de coxa", category: "Alongamento", duration: "30s", sets: "3", difficulty: "facil", created_by: userId },
      { workspace_id: wsId, name: "Prancha frontal", category: "Fortalecimento", duration: "30s", sets: "3", difficulty: "medio", created_by: userId },
      { workspace_id: wsId, name: "Marcha estacionária", category: "Funcional", duration: "60s", sets: "2", difficulty: "facil", created_by: userId },
    ]);

    return { ok: true, alreadySeeded: false };
  });
