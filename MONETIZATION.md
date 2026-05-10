# Monetização do MyOwnLists — sem ADs, sem login

> Princípios não-negociáveis: **sem anúncios**, **sem cadastro obrigatório**, **sem servidor obrigatório**, **funciona offline**, **dados ficam no aparelho**. Tudo o que vier deve preservar isso.

---

## Decisão final: modelo B — Donation + auto-unlock (honor system)

**Como funciona:**
1. App é 100% grátis com tier free completo
2. Tier PRO existe e é destravável a qualquer momento
3. Botão "💝 Apoiar projeto + destravar PRO" abre página de doação (Pix/Ko-fi)
4. Após (ou sem) doar, usuário clica "Destravar PRO" → flag local `pro=1`, recursos liberam
5. **Sem chave de licença, sem validação, sem fingir que é DRM** — quem é honesto doa, quem não é só clica destravar; pra single-file PWA open-source isso é o mais que dá pra fazer com integridade

**Justificativa:**
- Código aberto no GitHub: qualquer DRM é teatro. DevTools destrava em 5 segundos
- Quem paga R$15 num PWA grátis valoriza o projeto, não tá tentando burlar
- Doação opcional com agradecimento concreto (PRO destravado) é mais honesto que paywall furado
- Filosofia coerente: privacidade, offline, sem servidor, sem fricção
- Renda esperada: menor que paywall mas maior que doação pura (incentivo do "destravar"), e com goodwill alto

**Setup pra produção:**
1. Cria página de doação: pode ser Ko-fi (`https://ko-fi.com/seuusuario`) ou página própria com QR Pix
2. Subdomínio `myownlists.app/donate` redireciona pra Ko-fi/Pix
3. Nada mais — sem webhook, sem email, sem chave
4. Atualizar `goDonate()` no JS pro link real

**Branches:** `feat/donation-mode` é a versão final (em cima de toda a stack).

---

## Branches criadas

| Branch | Conteúdo | Como testar |
|---|---|---|
| `feat/usability-v2` | Melhorias gratuitas de UX (todos ganham) | `git checkout feat/usability-v2` e abrir `index.html` |
| `feat/pro-features` | UX-v2 + scaffolding de monetização (PRO) | `git checkout feat/pro-features` e abrir `index.html` |

> Como o app é PWA, depois de visitar uma branch limpe o Service Worker (DevTools → Application → Service Workers → Unregister) ou use uma janela anônima para evitar cache da versão antiga.

---

## Branch 1: `feat/usability-v2` (melhorias para todos)

Fica grátis. Aumenta retenção e dá motivo pra alguém recomendar. Sem isso, a versão paga não se sustenta.

- 🔎 **Busca** dentro da lista (filtro instantâneo por digitação)
- ↩️ **Desfazer** ao apagar item ou lista (toast com botão por ~4s)
- 🪄 **Autocomplete entre listas** — datalist agrega todos os itens já digitados em qualquer lista, evita re-digitar "Arroz" toda semana
- ✏️ **Renomear lista também edita o emoji** (antes só nome)
- 👆 **Tap no nome do item** alterna o status (não precisa acertar o círculo pequeno)
- 📊 **Pílulas de status** (restantes / comprados / talvez / "Tudo pronto! 🎉") logo abaixo da barra de progresso
- 🔁 i18n preservada nos 6 idiomas para todas as strings novas
- 🧹 Service Worker bumpado pra `mylists-v2` (cache invalida sozinho)

Sem mudar nada que já existe — todas as funcionalidades antigas continuam idênticas.

---

## Branch 2: `feat/pro-features` (monetização)

Empilha em cima de `usability-v2`. Adiciona um botão ⚙️ no header, um modal de Configurações, um modal de Desbloqueio e features PRO.

### Como demonstrar localmente

1. Abrir o app, clicar no ⚙️ → "✨ Desbloquear PRO"
2. No campo de licença, **qualquer chave não vazia funciona** (build de teste — está escrito embaixo do input). Ex.: `MOL-DEMO12345678`.
3. Clicar "Ativar" → badge PRO aparece, features destravam.
4. Clicar de novo no ⚙️ → "Desativar PRO" pra voltar ao estado free e comparar.

### Features PRO implementadas e funcionais

| Feature | O que faz | Por que vale pagar |
|---|---|---|
| 📦 **Modelos de lista** | Salvar lista atual como modelo, criar nova lista a partir de qualquer modelo | Usuário de mercado: "lista da semana" instantânea, sem re-digitar 30 itens |
| 📊 **Painel de estatísticas** | Total de listas/itens, % de conclusão geral, top 8 itens mais repetidos entre listas | Valor "hábito" — vira insight pessoal, gera vínculo com o app |
| 🎨 **Cor de destaque personalizada** | 6 paletas (verde/azul/roxo/laranja/rosa/teal) com versão clara e escura | Personalização cosmética — psicologicamente importante para identificação |

### Features PRO marcadas como "em breve"

São promessas explícitas no modal de Settings — gancho pra futuro release sem quebrar nada agora:

- 📲 **Compartilhar via QR code** — codifica a lista num QR, outro celular escaneia e importa. Precisa de uma libzinha (ex: `qrcode-generator`, ~5kb). Sem servidor.
- ☁️ **Sincronização opcional na nuvem** — usuário **traz a própria conta** (Dropbox / Google Drive / WebDAV via OAuth). O app só lê/escreve um JSON na pasta dele. Você não armazena nada.

### O sistema de licença

**Como está agora (build de teste):**
- Qualquer string não vazia ativa o PRO
- Estado salvo em `localStorage.pro = "1"` e `localStorage.license = "<chave>"`

**Como deve ficar em produção (3 caminhos, do mais simples ao mais robusto):**

1. **Honor system + Gumroad** (recomendado para começar)
   - Botão "Comprar PRO" abre `https://gumroad.com/l/myownlists-pro`
   - Cliente compra → Gumroad envia uma chave por email (gerada por você manualmente via tabela ou via webhook)
   - Cliente cola a chave → app valida só formato (regex `^MOL-[A-Z0-9]{12}$`) e ativa
   - **Sem servidor**. Fraude é trivial mas o público-alvo (alguém que paga R$15 num PWA grátis) não vai piratear. Custo zero.

2. **Chaves assinadas por chave pública** (próximo passo)
   - Você gera o par de chaves Ed25519 uma vez
   - A chave pública é embutida no `index.html` (constante)
   - Cliente compra → seu serverless gera um payload `{email, date, exp?}` assinado com a chave privada → cliente recebe a string → app valida assinatura no client (lib WebCrypto, ~0 KB extra)
   - Pirataria fica menos trivial; ainda 100% offline na validação
   - Custo: 1 endpoint serverless (Cloudflare Workers / Vercel free tier)

3. **Validação online (opcional)** — só recomendo se for plano por ano, não pra one-time. Quebra o princípio offline.

### Fluxo de compra recomendado

```
Botão "Comprar PRO"  →  Gumroad / Stripe Payment Link
                        ↓
                    Email automático com chave MOL-XXXX-XXXX
                        ↓
            Usuário cola no campo "Já tenho licença"
                        ↓
                  PRO ativado para sempre nesse navegador
```

Importante: a chave fica **só no navegador do usuário**. Você não tem banco de usuários. Se ele perder o navegador, ele recupera colando a mesma chave de novo (e por isso o email com a chave precisa ser robusto — recomende salvar).

### Preço sugerido

- **R$ 15 / US$ 3** — preço de impulso, abaixo da fricção mental ("uma coxinha")
- **Pague o que quiser, mínimo R$ 5** — alternativa indie. Maior conversão, menor receita por unidade.
- **Não cobre menos que R$ 5** — o custo psicológico de pagar é maior que o valor; melhor manter free.

### O que NÃO fazer

- ❌ **Modelo freemium ruim**: limitar número de listas/itens no free. Quebra a promessa do app ("seu, sem limites").
- ❌ **Cobrar por idioma / por tema escuro / por backup**. Já existem, são mesa.
- ❌ **Subscription**. Quebra o "sem servidor". Ninguém vai pagar mensal pra um PWA local.
- ❌ **Telemetria opcional ativada por padrão**. Mantém zero rastreamento.
- ❌ **Login social / contas**. Pra que? Localstorage + chave de licença resolve.

---

## Outras ideias de monetização (sem ADs, sem login)

Ordem aproximada de retorno-por-esforço:

### 💝 Doação visível (complementar, não substitui)
- Botão "☕ Apoie o projeto" no footer → link Pix/PayPal/Buy Me a Coffee
- Custo: 5min. Receita: pequena mas constante. Bom pra quem ama o app mas não usa PRO.

### 🛒 Comissão de afiliado contextual (delicado)
- Item da lista: "Coca-Cola 2L" → ícone discreto 🛒 ao lado abre busca em mercado online com seu link de afiliado
- Pode parecer "AD-like" — só fazer se for **opt-in explícito** no Settings. Senão fere a marca.
- Receita: depende muito do tráfego. Provavelmente baixa.

### 📦 Templates premium curados (extensão do PRO)
- Pacotes vendidos individualmente: "30 listas de churrasco BR", "Lista de mudança", "Bebê chegando" etc.
- R$ 5 cada. Funciona como DLC. Útil se PRO escalar primeiro.

### 🏷️ White-label / B2B
- Versão personalizada para mercados/cooperativas (logo + paleta + categorias pré-feitas) por R$ 200-500/ano
- Mercado pequeno mas margem alta. Só faz sentido se alguém pedir.

### 🤝 Sponsorship / GitHub Sponsors
- Botão no README. Renda recorrente de devs/empresas que valorizam o open-source. Zero código.

### 🎁 Bundles com outros apps indie
- Vender PRO empacotado com outros apps "no-account" indie. Cross-promo orgânica.

---

## Sugestão de roadmap pós-merge

1. **Merge `feat/usability-v2`** primeiro, sozinho — ganho garantido pra todos os usuários, zero risco.
2. **Coletar feedback** das melhorias 1-2 semanas. Olhar o que pega.
3. **Se sentir que tem demanda**, mergear `feat/pro-features` em paralelo com:
   - Configurar página `/pro` no domínio com Gumroad embed
   - Trocar `goBuy()` apontando pro link real
   - Endurecer validação de licença (regex `MOL-[A-Z0-9]{12}` no mínimo)
   - Adicionar uma seção PRO no README + screenshot do painel
4. **Lançar discreto**: post no Reddit/HN do tipo "I built a no-login no-ads grocery list PWA, here's how I'm trying to monetize it without selling out" — esse tipo de público compra R$15.

---

## Roadmap (ideias mais ousadas)

Itens que mudam a categoria do app — provavelmente PRO ou versão paralela:

### 🤖 Assistente IA pra montar lista
- Usuário digita "festa de aniversário pra 10 pessoas, churrasco" → IA monta lista categorizada (carne, bebida, descartável, sobremesa)
- Implementação: chamada pra LLM via API (Groq/OpenAI/Anthropic). **Quebra o "100% offline"** — precisa internet pra essa feature
- Custo: tokens por uso. Modelos opções:
  - Quota mensal pra PRO (ex: 30 listas geradas/mês)
  - Pay-per-use com créditos (R$ 5 = 50 listas)
  - Bring-your-own-key (usuário cola sua chave OpenAI/Groq, app só usa)
- BYOK é o mais alinhado com a filosofia "sem servidor": você não paga nada, o usuário controla, e o app fica zero-cost pra você
- Custom: "modelos AI fofinhos" presets — "lista vegetariana", "lista de bebê", "viagem 5 dias"

### 🎤 Voice Mode pra falar itens
- Botão de microfone no campo de adicionar item
- Web Speech API (`SpeechRecognition`) — gratuito, sem servidor, funciona offline em alguns browsers (Chrome usa Google Speech online por padrão; Safari iOS usa nativo)
- Hands-free no carro/cozinha: "Adicionar arroz, feijão, óleo, sal" — parser separa por vírgula/pausa
- Pode ser feature free (Web Speech é grátis) ou diferencial PRO se precisar de processamento melhor (ex: Whisper local via WASM)
- Limitação: cobertura desigual entre browsers, especialmente iOS Safari fora do app

### 📈 Histórico de preços + inflação pessoal (PRO)
- Quando user marca item como ✅ comprado, registra `{data, qty, unit, price}` no histórico daquele item
- Storage: `localStorage.priceHistory = { "arroz": [{date, qty, unit, price}, ...] }` — chave normalizada por nome
- **Stats expandidas:**
  - Preço médio do item ao longo do tempo (sparkline no edit modal)
  - % variação semana/mês/ano
  - **Cesta pessoal**: média ponderada das variações de itens marcados como "habituais" → vira IPCA pessoal
  - Top 5 itens com maior alta / maior queda
  - Total gasto por período (semana/mês)
- Exemplo de output: "Sua cesta subiu 4.2% no último mês. Café: +12%, Arroz: -3%"
- Privacidade preservada — nada sai do device
- Exportável no backup JSON
- **Tamanho**: 1000 itens × 50 entradas históricas ≈ 50KB. localStorage aguenta tranquilo
- Implementação: hook em `toggleStatus()` quando vai pra status 1, append entry com timestamp + preço atual do item
- Diferencial **enorme** vs AnyList/Bring! que não fazem isso
- Encaixe: PRO feature natural — "stats avançadas com seu histórico de inflação"

### 🎨 Mais personalização (parcial nesta branch)
- Backgrounds "fofinhos" (já implementado: pontos/grade/patinhas/estrelas/corações/folhas)
- Próximos: reordenar blocos da home (drag-drop dos cards), tipografia (font alternativa), tamanhos
- Tudo PRO — diferencial de "make it your own"

### ☁️ PRO virar app (estudo)
- Hoje: PWA single-file. Limitação: cache no celular, atualizações dependem do user notar.
- Vantagens de virar app real (Capacitor/Tauri/PWA Builder):
  - Push notifications (lembrar de fazer compra)
  - Widgets na home (lista de hoje no widget)
  - Distribuição via App Store / Play Store (legitimidade + descoberta)
- Desvantagens:
  - Quebra simplicidade do "abre no navegador, funciona"
  - Taxas de stores (15-30%)
  - Reviews, certificados, fricção de release
- Sugestão: manter PWA principal e oferecer **build empacotado** apenas pro PRO via PWA Builder ou TWA. PWA continua canônica.

---

## Próximas melhorias de UX (sem custo de monetização)

Não entrei nessa branch pra não inflar o PR, mas vale catalogar:

- ⚡ Atalho de teclado (Enter no campo de novo item adiciona sem clicar botão)
- 🗒️ Quantidade opcional por item (campo "qty" tipo `2 kg`, opcional, exibido como badge)
- 🔁 Listas recorrentes ("toda segunda recriar como novo")
- 🔢 Total estimado por lista (campo preço opcional por item)
- 📤 Compartilhar lista via texto direto pro WhatsApp (intent `wa.me/?text=...`)
- 🎤 Adicionar item por voz (Web Speech API — grátis, mas inconsistente em browsers)
- 📷 Adicionar via câmera + OCR (libzinha tipo `tesseract.js` — pesada, talvez PRO)
- ⌨️ Edição inline do nome do item (sem `prompt`)

Posso pegar qualquer uma dessas em outra branch quando quiser.
