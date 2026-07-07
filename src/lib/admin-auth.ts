import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export function useIsSuperAdmin() {
  const { session, ready } = useSession();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ["is-super-admin", userId],
    enabled: ready && !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}

export function useRequireSuperAdmin() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const { data: isSuper, isLoading } = useIsSuperAdmin();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (!isLoading && isSuper === false) {
      navigate({ to: "/home" });
    }
  }, [ready, session, isSuper, isLoading, navigate]);

  return { ready: ready && !isLoading, isSuper: !!isSuper, session };
}

export async function recordEvent(eventType: string, workspaceId: string | null, metadata: Record<string, unknown> = {}) {
  try {
    const payload: { _event_type: string; _metadata: never; _source: string; _workspace_id?: string } = {
      _event_type: eventType,
      _metadata: metadata as never,
      _source: "admin",
    };
    if (workspaceId) payload._workspace_id = workspaceId;
    await supabase.rpc("record_event", payload);
  } catch (e) {
    console.error("recordEvent failed", e);
  }
}

export async function recordAudit(params: {
  workspaceId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    workspace_id: params.workspaceId,
    user_id: user?.id ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    old_data: (params.oldData ?? null) as never,
    new_data: (params.newData ?? null) as never,
  });
}
