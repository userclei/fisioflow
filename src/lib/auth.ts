import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, ready };
}

export function useRequireAuth() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !session) navigate({ to: "/login" });
  }, [ready, session, navigate]);
  return { session, user: session?.user ?? null, ready };
}

export type WorkspaceCtx = {
  workspaceId: string;
  workspaceName: string;
  role: "super_admin" | "admin" | "physiotherapist" | "assistant";
  plan: "free" | "pro_monthly" | "pro_yearly";
  workspaceType: "individual" | "clinic" | "sandbox";
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
  };
};

export function useWorkspace(user: User | null | undefined) {
  return useQuery({
    queryKey: ["workspace", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceCtx | null> => {
      if (!user) return null;
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, auth_user_id, full_name, email, avatar_url, default_workspace_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.default_workspace_id) return null;
      const wsId = profile.default_workspace_id;
      const [{ data: ws }, { data: mem }] = await Promise.all([
        supabase.from("workspaces").select("id, name, type, plan").eq("id", wsId).maybeSingle(),
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", wsId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!ws) return null;
      return {
        workspaceId: ws.id,
        workspaceName: ws.name,
        workspaceType: ws.type,
        plan: ws.plan,
        role: (mem?.role ?? "physiotherapist") as WorkspaceCtx["role"],
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        },
      };
    },
  });
}
