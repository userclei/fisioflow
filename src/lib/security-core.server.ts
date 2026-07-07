// Server-only. Prompt injection detector + helpers.
// Chame via server function ou route de webhook — nunca do client.
import { createHash } from "crypto";

export type PIRule = {
  id: string;
  name: string;
  pattern: string;
  category: "system_prompt" | "data_exfiltration" | "tool_abuse" | "credential_theft" | "bypass" | "other";
  severity: "low" | "medium" | "high" | "critical";
  action: "log" | "quarantine" | "block_ai" | "block_number";
  is_active: boolean;
};

export type DetectionResult = {
  risk_score: number;
  level: "safe" | "low" | "medium" | "high" | "critical";
  action: "allow" | "log" | "quarantine" | "block_ai" | "block_number";
  matched: Array<{ rule_id: string; name: string; category: string; severity: string }>;
  sanitized_text: string;
};

// Normaliza texto: minúsculas, remove acentos, colapsa espaços, remove chars invisíveis.
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const SEVERITY_SCORE = { low: 15, medium: 35, high: 65, critical: 90 } as const;

export function detectPromptInjection(text: string, rules: PIRule[]): DetectionResult {
  const norm = normalize(text);
  const matched: DetectionResult["matched"] = [];
  let score = 0;

  for (const r of rules) {
    if (!r.is_active) continue;
    let re: RegExp;
    try { re = new RegExp(r.pattern, "i"); } catch { continue; }
    if (re.test(norm) || re.test(text)) {
      matched.push({ rule_id: r.id, name: r.name, category: r.category, severity: r.severity });
      score += SEVERITY_SCORE[r.severity];
    }
  }
  score = Math.min(100, score);

  let level: DetectionResult["level"] = "safe";
  let action: DetectionResult["action"] = "allow";
  if (score >= 86) { level = "critical"; action = "block_number"; }
  else if (score >= 61) { level = "high"; action = "block_ai"; }
  else if (score >= 31) { level = "medium"; action = "quarantine"; }
  else if (score > 0)  { level = "low"; action = "log"; }

  // Ação mais restritiva vence
  const maxAction = matched.reduce<DetectionResult["action"]>((acc, m) => {
    const rank = { allow: 0, log: 1, quarantine: 2, block_ai: 3, block_number: 4 } as const;
    const rule = rules.find(r => r.id === m.rule_id);
    if (!rule) return acc;
    return rank[rule.action] > rank[acc] ? rule.action : acc;
  }, action);

  return {
    risk_score: score,
    level,
    action: maxAction,
    matched,
    sanitized_text: text.slice(0, 500),
  };
}

export function hashValue(v: string): string {
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

export function maskPhone(p: string): string {
  const clean = p.replace(/\D/g, "");
  if (clean.length < 6) return "***";
  return `${clean.slice(0, 4)}****${clean.slice(-2)}`;
}

export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}

export function maskIP(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  return ip.slice(0, 6) + "***";
}
