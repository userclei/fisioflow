-- ============================================================
-- SISTEMA DE POLÍTICAS LEGAIS
-- ============================================================
CREATE TYPE public.legal_kind AS ENUM ('privacy','terms','cookies');

-- ---------- legal_settings (singleton) ----------
CREATE TABLE public.legal_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'FisioFlow',
  legal_name text,
  cnpj text,
  address text,
  city text,
  state text,
  zip text,
  country text NOT NULL DEFAULT 'Brasil',
  jurisdiction text NOT NULL DEFAULT 'Comarca da Capital do Estado do responsável pelo tratamento',
  dpo_name text,
  dpo_email text,
  contact_email text,
  contact_phone text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_settings TO anon, authenticated;
GRANT ALL ON public.legal_settings TO service_role;
ALTER TABLE public.legal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read legal settings" ON public.legal_settings FOR SELECT USING (true);
CREATE POLICY "super admin manage legal settings" ON public.legal_settings FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_legal_settings_updated BEFORE UPDATE ON public.legal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.legal_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ---------- legal_documents ----------
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.legal_kind NOT NULL,
  version int NOT NULL,
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  effective_date date NOT NULL DEFAULT current_date,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
CREATE INDEX idx_legal_docs_current ON public.legal_documents(kind) WHERE is_current = true;
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Público lê SOMENTE versão atual publicada
CREATE POLICY "public read current legal" ON public.legal_documents FOR SELECT
  USING (is_current = true AND published_at IS NOT NULL);
-- Admin gerencia tudo
CREATE POLICY "super admin manage legal docs" ON public.legal_documents FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_legal_docs_updated BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: garantir 1 is_current por kind
CREATE OR REPLACE FUNCTION public.ensure_single_current_legal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.legal_documents SET is_current = false
      WHERE kind = NEW.kind AND id <> NEW.id AND is_current = true;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_single_current_legal BEFORE INSERT OR UPDATE OF is_current ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_legal();

-- ============================================================
-- SEED: versão inicial de Privacidade e Termos (com placeholders)
-- ============================================================
INSERT INTO public.legal_documents (kind, version, title, summary, content_md, is_current, published_at) VALUES
('privacy', 1, 'Política de Privacidade', 'Como tratamos dados pessoais conforme a LGPD (Lei 13.709/2018).',
$md$# Política de Privacidade

**Última atualização:** {{EFFECTIVE_DATE}}
**Versão:** {{VERSION}}

A **{{COMPANY_NAME}}** ({{LEGAL_NAME}}), inscrita no CNPJ nº **{{CNPJ}}**, com sede em **{{ADDRESS}}**, doravante denominada "FisioFlow", "nós" ou "Controladora", leva a sério a privacidade e a proteção dos dados pessoais de seus usuários. Esta Política descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos as informações pessoais tratadas em nossa plataforma, em conformidade com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)**, o **Marco Civil da Internet (Lei nº 12.965/2014)** e o **Código de Defesa do Consumidor (Lei nº 8.078/1990)**.

## 1. Definições

- **Dado pessoal:** informação relacionada a pessoa natural identificada ou identificável.
- **Dado pessoal sensível:** dado sobre origem racial, convicção religiosa, opinião política, filiação sindical, dado referente à saúde ou à vida sexual, dado genético ou biométrico.
- **Tratamento:** toda operação realizada com dados pessoais (coleta, uso, armazenamento, compartilhamento, eliminação).
- **Titular:** pessoa natural a quem se referem os dados pessoais tratados.
- **Controlador:** a FisioFlow, responsável por decisões sobre o tratamento.
- **Operador:** terceiro que realiza tratamento em nome do Controlador.
- **Encarregado (DPO):** {{DPO_NAME}}, e-mail **{{DPO_EMAIL}}**.

## 2. Dados que coletamos

### 2.1. Fornecidos pelo usuário (fisioterapeuta / clínica)
- Nome completo, e-mail, telefone, CPF/CNPJ, número de CREFITO.
- Dados profissionais (especialidade, endereço da clínica, dados bancários para faturamento).
- Credenciais de acesso.

### 2.2. Dados de pacientes (o fisioterapeuta é Controlador; a FisioFlow é Operadora)
- Nome, data de nascimento, contato, endereço.
- **Dados sensíveis de saúde:** anamnese, prontuário, evolução clínica, prescrição de exercícios, exames, fotos e vídeos anexados.
- Histórico de agendamentos, pagamentos e comunicações.

### 2.3. Coletados automaticamente
- Endereço IP, tipo de dispositivo, navegador, sistema operacional.
- Logs de acesso e ações realizadas no sistema (auditoria).
- Cookies e identificadores para autenticação e prevenção de fraude.

## 3. Base legal e finalidades (art. 7º e 11 da LGPD)

| Finalidade | Base legal |
|---|---|
| Prestação do serviço contratado (gestão de clínica) | Execução de contrato (art. 7º, V) |
| Tratamento de dados de pacientes | Consentimento do titular ou tutela da saúde (art. 11, II, "f") |
| Emissão de cobranças e nota fiscal | Cumprimento de obrigação legal (art. 7º, II) |
| Envio de comunicações operacionais | Legítimo interesse (art. 7º, IX) |
| Envio de marketing | Consentimento (art. 7º, I), revogável a qualquer tempo |
| Prevenção a fraudes e segurança | Legítimo interesse (art. 7º, IX) |
| Cumprimento de decisão judicial | Cumprimento de obrigação legal (art. 7º, II) |

## 4. Compartilhamento

Compartilhamos dados apenas quando estritamente necessário:

- **Operadores contratados:** provedores de hospedagem, gateway de pagamento, envio de mensageria (WhatsApp/SMS/e-mail), autenticação, monitoramento e IA — todos sob contrato com cláusulas de confidencialidade e proteção de dados.
- **Autoridades competentes:** mediante ordem judicial, requisição administrativa fundamentada ou obrigação legal.
- **Sucessão empresarial:** em caso de fusão, cisão ou aquisição, mediante notificação prévia.

**Não vendemos dados pessoais.**

### 4.1. Subprocessadores principais
- Hospedagem em nuvem (infraestrutura da plataforma)
- Envio de mensagens WhatsApp (BTZAP e canais oficiais Meta)
- Processamento de pagamentos e emissão de faturas
- Serviços de IA para geração de textos e suporte

A lista completa e atualizada pode ser solicitada ao DPO.

## 5. Transferência internacional

Alguns operadores podem estar sediados fora do Brasil. Nesses casos, garantimos que a transferência ocorre para país com nível adequado de proteção ou mediante cláusulas contratuais padrão, conforme art. 33 da LGPD.

## 6. Retenção e eliminação

- Dados cadastrais: enquanto durar a relação contratual + prazo prescricional aplicável (até 5 anos após encerramento).
- Prontuários eletrônicos de pacientes: **20 anos após o último atendimento**, conforme Resolução COFFITO nº 415/2012 e Lei nº 13.787/2018.
- Dados financeiros: 5 anos (art. 27 CDC / art. 174 CTN).
- Logs de acesso: 6 meses (art. 15 do Marco Civil da Internet).

Após esses prazos, os dados são anonimizados ou eliminados de forma segura.

## 7. Direitos do titular (art. 18 LGPD)

Você pode, a qualquer momento, solicitar:

1. Confirmação da existência de tratamento
2. Acesso aos dados
3. Correção de dados incompletos, inexatos ou desatualizados
4. Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade
5. Portabilidade a outro fornecedor
6. Eliminação dos dados tratados com consentimento
7. Informação sobre entidades com as quais compartilhamos seus dados
8. Informação sobre a possibilidade de não fornecer consentimento e suas consequências
9. Revogação do consentimento

**Como exercer:** envie e-mail para **{{DPO_EMAIL}}** ou use o formulário no painel do usuário. Responderemos em até **15 dias**.

## 8. Segurança da informação

Adotamos medidas técnicas e organizacionais adequadas, incluindo:

- Criptografia em trânsito (TLS 1.2+) e em repouso
- Controle de acesso baseado em função (RBAC) e Row-Level Security
- Autenticação com senhas fortes, 2FA e verificação de senhas vazadas (HIBP)
- Auditoria e logs de todas as operações sensíveis
- Detecção de anomalias, rate limiting e proteção anti-bot
- Backup criptografado e testes periódicos de recuperação
- Programa contínuo de gestão de vulnerabilidades

## 9. Incidentes de segurança

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos à **ANPD (Autoridade Nacional de Proteção de Dados)** e aos titulares afetados em prazo razoável, na forma do art. 48 da LGPD.

## 10. Cookies

Utilizamos cookies estritamente necessários (autenticação, segurança), de desempenho e analíticos. Detalhes na **Política de Cookies** disponível em nosso site.

## 11. Menores de idade

Não coletamos deliberadamente dados de menores de 18 anos sem consentimento de pais ou responsáveis. Se identificarmos coleta indevida, os dados serão eliminados imediatamente.

## 12. Alterações desta Política

Podemos atualizar esta Política periodicamente. Toda alteração relevante será comunicada por e-mail e/ou aviso na plataforma com antecedência mínima de 30 dias.

## 13. Contato

- **Encarregado (DPO):** {{DPO_NAME}} — **{{DPO_EMAIL}}**
- **Contato geral:** {{CONTACT_EMAIL}}
- **Endereço postal:** {{ADDRESS}}, {{CITY}} — {{STATE}}, {{ZIP}}

---

*Você também pode contatar a ANPD em [www.gov.br/anpd](https://www.gov.br/anpd).*
$md$, true, now()),

('terms', 1, 'Termos de Uso', 'Regras de uso da plataforma FisioFlow.',
$md$# Termos de Uso

**Última atualização:** {{EFFECTIVE_DATE}}
**Versão:** {{VERSION}}

Estes Termos regulam o uso da plataforma **FisioFlow**, disponibilizada pela **{{COMPANY_NAME}}** ({{LEGAL_NAME}}), CNPJ **{{CNPJ}}**, sediada em **{{ADDRESS}}**. Ao criar conta, contratar ou utilizar qualquer funcionalidade, você declara ter lido, compreendido e concordado com estas condições.

## 1. Objeto

A FisioFlow é uma plataforma **Software as a Service (SaaS)** destinada a fisioterapeutas, clínicas de fisioterapia e profissionais autônomos da área, oferecendo funcionalidades de:

- Cadastro e gestão de pacientes
- Agendamento e prontuário eletrônico
- Prescrição de exercícios
- Cobrança e financeiro
- Comunicação via WhatsApp
- Relatórios, CRM e ferramentas administrativas

## 2. Cadastro e conta

2.1. O usuário deve ter capacidade civil plena (18 anos ou mais) e, quando profissional, registro válido no CREFITO.

2.2. As informações fornecidas devem ser verdadeiras, completas e atualizadas.

2.3. A conta é pessoal e intransferível. O usuário é responsável pela guarda das credenciais e por toda atividade realizada em sua conta.

2.4. É obrigatória a habilitação de autenticação em dois fatores (2FA) para contas com perfil administrativo.

## 3. Planos, pagamento e cancelamento

3.1. Os planos vigentes, preços, ciclos de cobrança e recursos incluídos estão descritos na página de preços da plataforma.

3.2. **Período de teste (trial):** quando oferecido, é gratuito por prazo determinado. Ao término, a cobrança inicia automaticamente, salvo cancelamento prévio.

3.3. **Pagamento:** débito automático, PIX, boleto ou cartão de crédito. A confirmação define a manutenção do acesso.

3.4. **Inadimplência:**
- 3 dias após vencimento: notificação
- 7 dias: bloqueio parcial de funcionalidades
- 15 dias: suspensão do acesso
- 30 dias: cancelamento e retenção dos dados por 60 dias para eventual reativação

3.5. **Cancelamento pelo usuário:** disponível a qualquer momento no painel. Não haverá reembolso proporcional em planos mensais; para planos anuais, aplica-se reembolso proporcional dos meses não usufruídos descontada multa de 20%.

3.6. **Reajuste:** anual pelo IPCA ou índice que o substituir, com aviso prévio de 30 dias.

3.7. **Arrependimento:** para contratações à distância, o usuário pode desistir em até 7 dias corridos, com reembolso integral, nos termos do art. 49 do CDC.

## 4. Responsabilidades do usuário

4.1. Cumprir a legislação aplicável, especialmente LGPD, Código de Ética Profissional de Fisioterapia (Resolução COFFITO nº 424/2013), sigilo profissional e normas sanitárias.

4.2. **O usuário é o Controlador dos dados de seus pacientes**; a FisioFlow atua como Operadora. Cabe ao usuário obter o consentimento válido dos titulares quando aplicável e responder pelas finalidades de tratamento que definir.

4.3. Não utilizar a plataforma para:
- Atividades ilícitas, fraudulentas ou contrárias à ordem pública
- Envio de spam, mensagens não solicitadas ou conteúdo ofensivo
- Violar direitos de propriedade intelectual
- Sobrecarregar, invadir, testar ou comprometer a integridade dos sistemas
- Coletar dados de terceiros sem base legal

4.4. Manter equipamento próprio, conexão de internet e software navegador em condições adequadas.

## 5. Responsabilidades da FisioFlow

5.1. Prestar o serviço com padrão razoável de disponibilidade, meta de **99,5% mensal** (SLA), excluídas janelas programadas de manutenção.

5.2. Adotar medidas técnicas e organizacionais de segurança compatíveis com o estado da arte.

5.3. Realizar cópias de segurança periódicas.

5.4. Notificar incidentes de segurança relevantes, na forma da LGPD.

## 6. Limitação de responsabilidade

6.1. A FisioFlow não se responsabiliza por:
- Decisões clínicas tomadas pelo profissional com base em dados da plataforma
- Uso indevido por parte do usuário ou de terceiros com credenciais válidas
- Indisponibilidade decorrente de caso fortuito, força maior, ataques cibernéticos apesar das medidas cabíveis, falha de provedores de terceiros ou ação/omissão do usuário
- Perda de dados quando o usuário não realizar exportação após comunicação de encerramento

6.2. **Limite indenizatório:** salvo dolo comprovado, a responsabilidade da FisioFlow, por qualquer título, fica limitada ao valor efetivamente pago pelo usuário nos **12 (doze) meses** anteriores ao evento.

6.3. Fica excluída indenização por lucros cessantes ou danos indiretos.

## 7. Propriedade intelectual

7.1. Todo o conteúdo da plataforma (código, layout, marcas, textos, materiais, IA, integrações) é de propriedade exclusiva da FisioFlow ou de seus licenciadores.

7.2. O usuário recebe licença **limitada, não exclusiva, intransferível e revogável** para uso conforme estes Termos.

7.3. Os dados inseridos pelo usuário permanecem de sua titularidade. A FisioFlow recebe licença para tratá-los apenas na medida necessária à prestação do serviço.

## 8. Suspensão e rescisão

8.1. A FisioFlow pode suspender ou rescindir imediatamente o acesso em caso de:
- Violação destes Termos ou da Política de Privacidade
- Inadimplência persistente
- Uso que ameace a segurança, disponibilidade ou reputação da plataforma
- Ordem judicial

8.2. Encerrada a conta, o usuário poderá solicitar exportação dos dados por até 60 dias. Após esse prazo, os dados serão eliminados, ressalvadas obrigações legais de retenção.

## 9. Alterações dos Termos

9.1. Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas por e-mail e/ou aviso na plataforma com **30 dias** de antecedência.

9.2. O uso continuado após a vigência da nova versão implica concordância. Havendo discordância, o usuário pode rescindir sem ônus.

## 10. Comunicações

Todas as comunicações formais serão feitas pelo e-mail cadastrado, por notificações no painel ou por WhatsApp registrado. É dever do usuário mantê-los atualizados.

## 11. Anti-corrupção e compliance

As partes se comprometem a cumprir a Lei Anticorrupção (Lei nº 12.846/2013), a Lei de Improbidade Administrativa e demais normas de integridade aplicáveis.

## 12. Disposições gerais

12.1. A nulidade de qualquer cláusula não afeta as demais.

12.2. A tolerância quanto a descumprimento não implica novação ou renúncia.

12.3. É vedada a cessão destes Termos pelo usuário sem consentimento prévio e por escrito da FisioFlow.

## 13. Foro e legislação

Este contrato é regido pelas leis da **República Federativa do Brasil**. Fica eleito o foro da **{{JURISDICTION}}** para dirimir qualquer controvérsia, com renúncia a qualquer outro, por mais privilegiado que seja, exceto quando a legislação consumerista determinar foro diverso em favor do consumidor.

---

**Aceite eletrônico:** o cadastro na plataforma, a marcação de "Li e concordo" e/ou o uso das funcionalidades comprovam manifestação de vontade nos termos do art. 219 do Código Civil e do art. 10, §2º, da MP 2.200-2/2001.

**Dúvidas:** {{CONTACT_EMAIL}}
$md$, true, now());
