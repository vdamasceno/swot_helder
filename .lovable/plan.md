
## Objetivo

Adequar o SWOT-PPG ao processo descrito no documento: 3 perfis de participantes, formulários segmentados, 2 rodadas de coleta (Brainstorm + Validação Likert) e Matriz Diagnóstica → Plano de Ação.

## Mudanças de modelo

**Categorias separadas**
- Forças (PF) e Fraquezas (FR): por item da ficha CAPES (Quesitos 1–5, conforme perfil).
- Ameaças (AM) e Oportunidades (OP): seção geral única, sem vínculo a indicador.
- Limite de até 5 entradas por categoria/seção, conforme o doc.

**Perfis de participante**
- `docente` — todos os indicadores CAPES + AM/OP.
- `discente` — Proposta, Corpo Docente, Corpo Discente, Inserção Social + AM/OP.
- `tecnico` — Proposta, Infraestrutura, Apoio Técnico-Administrativo + AM/OP.
- Cadastro pede o perfil; gestor aprova como hoje.

**Rodadas do ciclo**
Cada `evaluation_period` ganha um campo `phase`:
- `rodada1` (Brainstorm) — formulário atual (PF/FR por indicador + AM/OP geral).
- `consolidacao` — fase interna da Comissão (depuração, numeração PF001/FR001/AM001/OP001).
- `rodada2` (Validação Likert) — cada participante marca C/D/N para cada item consolidado e, se C, prioridade temporal (curto/médio/longo) — exceto AM/OP, que não têm prioridade.
- `encerrado` — leitura.

## Estrutura técnica (resumo)

- Novas colunas: `profiles.profile_type` (docente/discente/tecnico), `evaluation_periods.phase`.
- Nova tabela `consolidated_items` (item_code PF001…, category, indicator, content, period_id) — gerada na consolidação.
- Nova tabela `validation_responses` (user_id, item_id, vote C/D/N, priority curto/médio/longo nullable).
- Nova tabela `action_plan_items` (item_id, ação, meta, prazo, responsável) — saída da Etapa 3.
- RLS: leitura própria; gestor lê tudo; escrita só do dono e quando a fase correspondente está ativa.

## Telas

- **Cadastro/perfil:** seleção do tipo de participante.
- **Formulário Rodada 1:** seções dinâmicas conforme perfil; AM/OP em seção final separada; limite de 5.
- **Painel do Gestor:** abrir/fechar rodada, avançar fase, ferramenta de consolidação (importa respostas brutas, permite editar/numerar/eliminar duplicatas, publicar lista da Rodada 2).
- **Formulário Rodada 2:** lista numerada com C/D/N + select de prioridade quando C (PF/FR).
- **Matriz Diagnóstica:** itens aprovados (≥ corte definido pelo gestor), agrupados por categoria/indicador/prioridade; export PDF.
- **Plano de Ação (Etapa 3):** edição de ação/meta/prazo/responsável a partir dos itens aprovados; export PDF consolidado.

## Entregas faseadas (sugestão de ordem)

1. **Fase A — Modelo de dados + Rodada 1 reformulada**
   - Migração: `profile_type`, `phase`, separação AM/OP, limite de 5.
   - UI do formulário ajustada por perfil; cadastro com perfil.
2. **Fase B — Consolidação + Rodada 2**
   - Tabela e telas de consolidação (gestor) e formulário de validação (participante).
3. **Fase C — Matriz Diagnóstica + Plano de Ação**
   - Cálculo de % concordância e prioridade modal; telas e PDFs finais.

## Pontos a confirmar antes de codar

- Posso aplicar as três fases em sequência (vários commits) ou prefere validar Fase A antes da B?
- Os perfis Discente/Técnico devem se autocadastrar livremente (com aprovação do gestor) ou só docentes se cadastram e os outros são convidados pelo gestor?
- Critérios numéricos (% de concordância para aprovação na Rodada 2 e prazo de resposta) — o documento usa placeholders (`?0%`, `??` dias). Podem ser parâmetros configuráveis pelo gestor ao abrir o ciclo?
