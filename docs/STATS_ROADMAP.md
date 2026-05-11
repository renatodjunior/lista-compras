# Stats Roadmap — MyOwnLists Analytics ("modo nerd")

Brainstorm pra evoluir o painel de estatísticas de "lista de top items" pra **analytics pessoal de mercado**, com visualizações, comparações temporais e insights.

Filosofia mantém: 100% local, sem servidor, dados crus do `priceHistory` + `lists` + `templates`.

---

## Estado atual (já implementado)

- 4 cards: total listas, total itens, comprados, % conclusão
- Top 8 itens mais repetidos
- Painel "inflação pessoal" com média % de variação
- Top 5 alta + top 5 queda
- Histórico individual por item (modal com tabela + Δ + delete por linha)
- **Cards de gasto**: gasto total all-time + gasto do mês corrente (Σ price × qty)
- **Top spending items**: top 5 itens por gasto acumulado em R$
- **Inflação por lista**: média de pct das tendências dos itens de cada lista
- **Maiores ofensores**: top 5 por `|delta R$| × frequência` (impacto real)
- **Página "Gerenciar preços"**: lista todos itens com histórico, marca órfãos (sem item vivo), permite apagar histórico inteiro por item ou bulk-clean dos órfãos
- **Prompt ao deletar item com histórico**: pergunta se quer apagar histórico junto (undo restaura ambos)

---

## Roadmap proposto

### Fase 1 — Gráficos básicos (free, ~1 semana de dev)

**1.1 Gráfico de gastos mensais** 📊

- Line chart simples: eixo X = meses (últimos 12), eixo Y = gasto total
- Calcular: somar `entry.price * entry.qty` por mês de `priceHistory`
- SVG inline (~50 linhas, sem dependência)
- Mostra trend de gasto

**1.2 Gastos por lista (bar chart)** 📊

- Top 10 listas que mais gastei (somando `item.price` de cada)
- Bar chart horizontal
- Útil pra "qual lista é minha maior boca"

**1.3 Gastos por categoria** 🥧

- Pie/donut chart das categorias mais caras
- Frutas vs Carnes vs Limpeza etc
- Ajuda priorizar onde economizar

**1.4 Sazonalidade simples** 📅

- Heatmap 12 meses × 4 anos (se tem dados)
- Quanto gastou em cada mês — pega padrões natalinos, festa junina, etc

### Fase 2 — Trend analysis (PRO, ~1 semana)

**2.1 IPCA pessoal mensal** 📈

- Line chart da inflação calculada mês a mês
- "Sua cesta subiu 4.2% em maio, 1.8% em junho..."
- Comparar com IPCA oficial do IBGE (talvez fetch endpoint público)?

**2.2 Inflação por categoria**

- Mesma análise mas separada por categoria
- "Frutas +12% no semestre, Carnes -3%"
- Identifica onde está sangrando

**2.3 Itens estáveis vs voláteis**

- Variance/desvio padrão dos preços
- Top 5 mais estáveis (compra confiante) e top 5 mais voláteis (esperar promoção)

**2.4 Forecasting simples**

- "Próxima compra de mercado deve custar ~R$ 230 (média últimas 4)"
- Linear regression dos totais por mês
- Confidence interval

### Fase 3 — Insights acionáveis (PRO, ~2 semanas)

**3.1 Alertas de preço**

- Background check em cada save: "Café subiu 18% nos últimos 30 dias!"
- Toast informativo na próxima abertura
- localStorage flag `alertSeen=<itemKey>` pra não spamar

**3.2 Comparação YoY (year-over-year)**

- "Você gasta 8% a mais este ano que ano passado no mesmo período"
- Útil pra notar se está perdendo controle

**3.3 Itens "esquecidos"**

- Itens que estão em frequents mas faz tempo que não compra
- "Você não compra arroz há 45 dias — quer adicionar à próxima lista?"
- Lembrete inteligente

**3.4 Sugestão de orçamento**

- Baseado em médias, sugere: "Aloque R$ 280/mês pra mercado"
- User pode setar meta e ver progresso vs realizado

### Fase 4 — Reports & exports (PRO, ~1 semana)

**4.1 Relatório PDF mensal**

- "Resumo de Maio 2026" — gasto total, top categorias, top itens, inflação
- jsPDF (200KB, lazy-load) gera PDF localmente
- Botão "📄 Baixar relatório do mês"
- Pode virar feature **PRO+** (tier extra) — diferencial real

**4.2 Export CSV**

- Toda data: lists + items + priceHistory exportado em CSV
- Pra importar no Excel/Google Sheets
- User-controlled, não passa por servidor

**4.3 Print-friendly stats**

- @media print já existente, mas voltado pra stats
- Imprime o painel inteiro como relatório de geladeira

---

## Implementação técnica

### Sem dependências obrigatórias

- **Charts**: SVG inline manual (~50-100 linhas por tipo)
  - Line: 1 viewport SVG, 1 polyline, axis labels
  - Bar: rects empilhados
  - Pie: arcs com `Math.cos/sin`
- **PDF**: jsPDF lazy-loaded só quando user clica "Gerar PDF"

### Performance

- Compute on-demand quando abrir stats panel
- Memoize por timestamp do último save
- Loop 365 dias × 1000 items = 365k ops — instantâneo

### Schema (já temos quase tudo)

```js
priceHistory[name] = [
  { ts: 1715789012345, qty: "1", unit: "kg", price: "12,50" },
  ...
]
```

Adicionar: `category` na entry pra agrupar por categoria sem cruzar com lists.

---

## Monetização possível

### "Analytics PRO+" — tier extra opcional

- Free: tier atual
- PRO (donation): cor custom, fundos, modelos, QR, sync, **stats básicas Fase 1**
- **PRO+ Analytics** (donation maior?): Fase 2 + 3 + 4
  - Inflação detalhada
  - Alertas
  - Forecasting
  - PDF reports
  - YoY analysis

### Não recomendo

- ❌ "Compare seus gastos com vizinhos" — quebra privacidade-first
- ❌ Subscription mensal — quebra "no subscription"
- ❌ Server analytics dashboard — quebra "no server"

### Sim recomendo

- ✅ "Doação maior destrava Analytics PRO+" — mantém honor system
- ✅ Open Food Facts integration pra enriquecer dados (já temos via barcode)
- ✅ Link "📊 Análise completa em PDF" no email pós-doação como brinde

---

## Priorização sugerida

| Prioridade | Feature | Custo dev | Valor user | Tier |
|---|---|---|---|---|
| 🔥 Alta | Gastos mensais (line chart) | Baixo | Alto | Free |
| 🔥 Alta | Gastos por lista (bar) | Baixo | Alto | Free |
| 🔥 Alta | Gastos por categoria (pie) | Médio | Alto | Free |
| 🟡 Média | IPCA mensal | Médio | Médio | PRO |
| 🟡 Média | YoY comparativo | Médio | Médio | PRO |
| 🟡 Média | Forecasting | Médio | Alto | PRO+ |
| 🟢 Baixa | Alertas inteligentes | Alto | Médio | PRO+ |
| 🟢 Baixa | PDF reports | Alto | Médio | PRO+ |

---

## Próximos passos

1. **Validar com user**: quais dessas features ele realmente quer
2. **Decidir se cria tier PRO+** ou mantém tudo PRO
3. **Implementar Fase 1** (gráficos básicos) — entrega rápida com alto impacto
4. **Iterar** baseado em uso real

---

*Doc vivo. Atualizar conforme features forem implementadas/descartadas.*
