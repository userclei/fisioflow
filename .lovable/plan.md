## 🎯 Objetivo
Criar landing page de venda em `/` (hoje redireciona para `/login`), preservando 100% do app logado. Mobile-first, identidade visual do FisioFlow, animações suaves, captura de leads no banco.

## 🧠 Diagnóstico — Nível 3
- **Impacto arquitetural**: `/` deixa de ser redirect e passa a ser página pública. `/login`, `/cadastro`, `/home` e todo o resto permanecem intactos.
- **Backend novo**: tabela `landing_leads` com RLS (insert público via anon, select só admin) + GRANT.
- **Risco**: nenhum no app logado; landing é rota nova isolada. Header "hamburger" e animações precisam respeitar `prefers-reduced-motion` e não pesar no mobile.

## 🛠️ Execução

### 1. Backend (migration)
Tabela `landing_leads`:
- `id uuid pk`, `name text`, `email text`, `whatsapp text nullable`, `usage_type text check (in 'profissional','clinica')`, `message text nullable`, `source text default 'landing_page'`, `created_at timestamptz`
- RLS on. Policy `INSERT to anon` (captura pública, sanitizada por trigger de tamanho). Policy `SELECT to authenticated` só para `has_role('super_admin')`.
- GRANT `INSERT to anon`, `SELECT to authenticated`, `ALL to service_role`.

### 2. Rota `/`
Substituir `src/routes/index.tsx` (hoje redirect) por página landing renderizando os componentes da seção 3 abaixo. `head()` com SEO completo (title, description, og:*, JSON-LD Product/Organization).

### 3. Componentes (em `src/components/landing/`)
Um arquivo por seção — arquitetura enxuta, tudo mobile-first:
- `LandingHeader.tsx` — fixo, blur, hamburger mobile via Sheet do shadcn
- `HeroSection.tsx` + `AnimatedWords.tsx` — rotação vertical de palavras
- `AppMockup.tsx` — mockup celular com cards flutuantes (CSS, sem imagem externa)
- `TrustBar.tsx`
- `PainSection.tsx` — 6 cards
- `SolutionSection.tsx`
- `FeatureGrid.tsx` — 8 cards
- `HowItWorks.tsx` — 4 passos numerados
- `CasesSection.tsx` — 3 cases demonstrativos (com aviso sutil "exemplos ilustrativos")
- `ScrollCardsSection.tsx`
- `BeforeAfterSection.tsx`
- `PricingSection.tsx` + `PricingToggle.tsx` — 3 planos, toggle mensal/anual, badge "Economize 2 meses"
- `FAQSection.tsx` — accordion shadcn
- `LeadCaptureForm.tsx` — server function grava em `landing_leads`
- `FinalCTA.tsx`
- `LandingFooter.tsx`

### 4. Animações
CSS puro + Framer Motion (`framer-motion` já no bundle da lib motion? verificar; se ausente, instalar `motion` que é o pacote atual, versão para React). Usar `IntersectionObserver` via hook simples para reveal no scroll. Contagem: hook `useCountUp`. Respeitar `@media (prefers-reduced-motion: reduce)`.

### 5. Server function
`src/lib/landing.functions.ts` — `createLandingLead` com validação Zod (name 2-100, email válido, whatsapp opcional, usage_type enum, message ≤ 500), rate-limit soft por email/IP no client (últimos 60s via localStorage) e insert usando client publishable (anon) — não usa admin.

### 6. SEO
- `head()` da rota `/` com title, description, og:title, og:description, og:type=website, canonical `/`, twitter:card=summary_large_image
- JSON-LD SoftwareApplication com nome, descrição, offers
- Editar `__root.tsx` só se necessário (não mexer em og:image root)

## 📍 Onde
```
src/routes/index.tsx                    (substitui redirect)
src/components/landing/*.tsx            (18 componentes)
src/hooks/useReveal.ts                  (scroll reveal)
src/hooks/useCountUp.ts                 (contagem)
src/lib/landing.functions.ts            (server fn)
supabase/migrations/*.sql               (tabela + RLS + GRANT)
```

## 🔍 Validação
- Segurança: RLS restringe SELECT a admin, INSERT anônimo com validação Zod server-side + limite de tamanho
- Performance: sem imagens externas pesadas, mockup em CSS, animações desativam em `reduced-motion`, componentes sem re-render desnecessário
- Mobile: header vira hamburger, grids caem para 1 coluna, mockup escala
- UX: form com loading/erro/sucesso via toast, botões CTA levam para `/cadastro` e `/login`
- App logado: rotas `/home`, `/agenda`, etc. inalteradas — apenas `/` muda

## ⚠️ Riscos
- **Usuários já logados**: hoje redirect leva para login/home. Como não há gate de auth em `/`, quem já está logado verá a landing ao acessar raiz — pode confundir. **Mitigação**: no header da landing, se sessão ativa, botão "Entrar" vira "Abrir app" apontando para `/home`.
- **framer-motion vs motion**: verificar qual está instalado antes de importar. Se nenhum, uso só CSS + IntersectionObserver.
- **Preços**: expostos em `src/config/pricing.ts` como constante editável.

## 💡 Próximos passos sugeridos
- 🚀 **Crescimento**: adicionar UTM tracking nos CTAs (`?utm_source=landing&utm_section=hero`) para medir qual seção converte
- 🛡️ **Robustez**: rate-limit server-side por IP na server function (hoje só client-side) — precisa Redis/Upstash ou tabela de throttle
- 🤖 **IA**: mini-chat na landing que responde dúvidas de fisios usando Lovable AI + contexto do produto
- 📊 **Dados**: painel admin `/admin/leads` para visualizar/exportar leads capturados
- ✨ **Polish**: OG image gerada com hero + mockup

Vou executar tudo isso na sequência: migration → componentes base → seções → hooks/animações → server fn → substituição do `/` → smoke test. Aprova?

— OPENTRICK