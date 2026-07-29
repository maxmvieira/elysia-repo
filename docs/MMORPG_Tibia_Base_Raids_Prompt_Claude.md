# PROJETO: MMORPG 2D COM CONSTRUÇÃO DE BASES E RAIDS

## Documento mestre para desenvolvimento com Claude Fable 5

**Nome provisório:** Project Dominion 2D  
**Gênero:** MMORPG 2D top-down, movimentação em grid, combate em tempo real, construção de bases persistentes e raids assíncronos.  
**Inspiração de experiência:** sensação de exploração, câmera, leitura do mapa e movimentação de MMORPGs 2D clássicos como Tibia, sem copiar nomes, mapas, criaturas, artes, sons, interface, código ou propriedade intelectual de terceiros.

---

## 1. INSTRUÇÃO PRINCIPAL AO CLAUDE

Você atuará como arquiteto de software, game designer, programador sênior, QA e technical writer. Sua missão é construir este jogo por etapas pequenas, testáveis e documentadas.

Não tente produzir um MMORPG completo em uma única resposta. Comece por um vertical slice local e evolua para multiplayer autoritativo. Antes de escrever grandes quantidades de código, apresente a arquitetura, a estrutura de pastas e o primeiro milestone. Depois, implemente apenas um milestone por vez.

Regras obrigatórias:

1. Todo código deve ser executável, completo e acompanhado da indicação exata do arquivo em que será salvo.
2. Nunca substitua arquivos inteiros sem explicar o motivo.
3. Não use pseudocódigo quando o milestone exigir implementação.
4. Crie testes automatizados para regras críticas de inventário, dano, persistência, construção e raid.
5. O servidor deve ser autoritativo. O cliente nunca decide dano, loot, posição final, permissões de construção ou resultado de uma raid.
6. Persistência, autenticação e economia devem ser planejadas desde o início, mesmo que inicialmente sejam simuladas localmente.
7. Ao final de cada milestone, entregue: arquivos criados, comandos para executar, testes, checklist manual e limitações conhecidas.
8. Não avance para o milestone seguinte até o atual estar funcional.
9. Use placeholders visuais próprios e simples. Não copie assets, mapas, nomes, interface ou criaturas de Tibia.
10. Priorize um protótipo divertido e funcional antes de escala massiva.

---

## 2. VISÃO DO JOGO

O jogador entra em um mundo 2D persistente, escolhe uma vocação, explora cidades e regiões perigosas, derrota criaturas, coleta recursos, melhora equipamentos e constrói uma casa/base fora das zonas urbanas protegidas.

As bases armazenam recursos e itens, podem receber melhorias estruturais e guardas NPC. Outros jogadores podem iniciar raids contra bases vulneráveis. Uma raid deve ser demorada, barulhenta, arriscada e oferecer tempo para reação. A casa não desaparece com poucos golpes: paredes, portões e núcleo possuem grande durabilidade, redução de dano e progressão por níveis.

O objetivo é combinar:

- exploração e progressão de personagem;
- combate legível em grid;
- economia baseada em recursos e equipamentos;
- construção e personalização de bases;
- conflito entre jogadores com regras que evitem destruição instantânea;
- defesa ativa, guardas e planejamento territorial;
- mundo inicial pequeno, denso e expansível.

---

## 3. PILARES DE DESIGN

### 3.1 Leitura simples, profundidade alta
A movimentação deve ser imediatamente compreensível. O jogador anda por tiles, interage com objetos próximos e reconhece rapidamente perigos, rotas e obstáculos.

### 3.2 Mundo persistente
Personagem, inventário, base, estruturas, baús, guardas, mercado e estado do mundo permanecem salvos.

### 3.3 Risco com contrajogo
Uma raid pode gerar perda, mas deve exigir preparação, tempo e exposição do atacante. O defensor precisa ter mecanismos de proteção e recuperação.

### 3.4 Progressão horizontal e vertical
O personagem aumenta atributos e equipamentos, enquanto desbloqueia opções de build, profissão, construção, defesa e mobilidade.

### 3.5 Servidor autoritativo
Toda regra importante é validada no servidor para reduzir cheats, duplicação de itens, teleporte e manipulação de dano.

---

## 4. ESCOPO DO MVP

O primeiro MVP online deve conter:

- criação e login de conta;
- criação de um personagem;
- mapa com uma cidade e uma pequena área externa;
- movimentação em grid com colisão;
- câmera top-down seguindo o personagem;
- chat local;
- uma vocação inicial funcional;
- ataque básico e quatro habilidades;
- três tipos de criatura;
- vida, mana, experiência, nível e morte;
- inventário, equipamento e loot;
- coleta de madeira e pedra;
- reivindicação de um pequeno lote;
- construção de piso, parede, porta, baú e núcleo da base;
- salvamento persistente;
- dano estrutural controlado;
- raid em ambiente de teste;
- um guarda NPC básico;
- logs de auditoria para itens e raids.

Não incluir no primeiro MVP:

- três cidades completas;
- centenas de jogadores simultâneos;
- guild wars complexas;
- leilão global;
- dezenas de vocações;
- sistema naval;
- mundo procedural infinito;
- aplicativo mobile;
- monetização.

---

## 5. DIREÇÃO TÉCNICA RECOMENDADA

### 5.1 Stack inicial

- **Engine e cliente:** Godot 4.x.
- **Linguagem do cliente:** GDScript tipado para acelerar o protótipo.
- **Servidor:** Godot headless dedicado no primeiro vertical slice; arquitetura preparada para separar serviços depois.
- **Banco de dados:** PostgreSQL.
- **Cache e presença:** Redis apenas quando houver necessidade real.
- **Protocolo:** WebSocket ou ENet para gameplay; HTTPS para autenticação e serviços administrativos.
- **Contêineres:** Docker Compose para servidor, banco e ferramentas locais.
- **Versionamento:** Git com commits pequenos por milestone.
- **Testes:** GUT ou framework equivalente no Godot, além de testes de integração no servidor.

### 5.2 Princípios de arquitetura

- separação clara entre client, server, shared e tools;
- dados de itens, criaturas, habilidades e construções definidos em arquivos de configuração versionados;
- IDs únicos para itens persistentes;
- transações de banco para transferências de itens;
- comandos do cliente tratados como intenções, nunca como fatos;
- snapshots e logs para recuperação;
- rate limiting de ações;
- validação de distância, linha de visão, cooldown e custo no servidor.

### 5.3 Estrutura inicial de pastas

```text
project-dominion/
  README.md
  docker-compose.yml
  docs/
    game-design.md
    architecture.md
    milestones.md
    protocols.md
  client/
    project.godot
    scenes/
    scripts/
    ui/
    assets/placeholders/
    tests/
  server/
    project.godot
    scenes/
    scripts/
    systems/
    persistence/
    tests/
  shared/
    data/
      items/
      abilities/
      creatures/
      structures/
    schemas/
    constants/
  database/
    migrations/
    seeds/
  tools/
    map-editor/
    admin/
```

---

## 6. MOVIMENTAÇÃO E CÂMERA

### 6.1 Movimento

- mapa composto por tiles;
- movimento cardinal: cima, baixo, esquerda e direita;
- suporte opcional a diagonais apenas se não prejudicar combate e colisão;
- clique no mapa para pathfinding e teclado para movimento direto;
- fila curta de comandos para sensação responsiva;
- servidor valida velocidade, colisão e posição;
- interpolação visual no cliente, sem permitir que a interpolação altere o estado real;
- personagens e criaturas não atravessam paredes, portas fechadas ou tiles bloqueados;
- escadas, buracos e portais mudam o andar ou a região.

### 6.2 Câmera

- top-down/ortográfica;
- acompanha o personagem com suavização discreta;
- zoom limitado e configurável;
- sem rotação livre;
- o jogador enxerga apenas o entorno permitido pelo sistema de visão;
- paredes e telhados podem ficar transparentes quando bloquearem o personagem local.

### 6.3 Tick e sincronização

- servidor com tick fixo inicialmente entre 10 e 20 Hz;
- cliente renderiza em taxa independente;
- inputs possuem número sequencial;
- servidor envia snapshots e confirma inputs processados;
- correção gradual para pequenos desvios e snap apenas em divergências graves.

---

## 7. PERSONAGEM, VOCAÇÕES E ATRIBUTOS

### 7.1 Vocações iniciais planejadas

1. **Vanguard:** combate corpo a corpo, defesa alta e controle de inimigos.
2. **Ranger:** ataques à distância, armadilhas e mobilidade.
3. **Arcanist:** dano mágico, área e controle, com defesa menor.
4. **Warden:** suporte, cura, proteção e invocação defensiva.

No primeiro vertical slice, implementar apenas Vanguard.

### 7.2 Atributos

- level;
- experience;
- health e max_health;
- mana e max_mana;
- strength;
- defense;
- magic_power;
- movement_speed;
- attack_speed;
- carry_capacity;
- resistance por tipo de dano.

### 7.3 Habilidades do Vanguard no MVP

- ataque básico;
- golpe pesado;
- provocação;
- investida curta;
- postura defensiva.

Toda habilidade deve possuir:

- ID;
- nome;
- custo;
- cooldown;
- alcance;
- área de efeito;
- fórmula de dano ou efeito;
- regras de linha de visão;
- animação placeholder;
- validação no servidor.

---

## 8. COMBATE

- combate em tempo real sobre grid;
- seleção de alvo por clique e ciclo de alvo por tecla;
- ataques possuem alcance em tiles;
- servidor calcula acerto, dano, redução, crítico e morte;
- criaturas usam máquina de estados: idle, patrol, chase, attack, retreat e dead;
- zonas seguras impedem PvP e dano estrutural;
- fora de zonas seguras, regras de PvP dependem do tipo de região;
- habilidades em área exibem preview visual, mas o servidor decide os tiles atingidos;
- morte de jogador aplica penalidade moderada no MVP, sem destruir toda a progressão.

---

## 9. INVENTÁRIO, ITENS E LOOT

### 9.1 Inventário

- slots e capacidade por peso;
- equipamentos por categoria;
- stack para recursos consumíveis;
- itens persistentes importantes com unique_instance_id;
- arrastar e soltar apenas como interface; toda mudança é confirmada pelo servidor;
- operações atômicas para mover item entre inventário, chão, baú, mercado e loot.

### 9.2 Categorias iniciais

- armas;
- armaduras;
- consumíveis;
- ferramentas;
- recursos;
- materiais de construção;
- itens de missão;
- moeda.

### 9.3 Segurança econômica

- registrar criação e destruição de itens valiosos;
- impedir quantidade negativa;
- impedir duas operações simultâneas sobre o mesmo item;
- usar transação em saques de baús e loot de raids;
- incluir idempotency key em comandos econômicos sensíveis.

---

## 10. CONSTRUÇÃO DE BASES

### 10.1 Lotes

- bases só podem ser construídas em regiões permitidas;
- cada jogador começa com um lote pequeno;
- o lote é definido por coordenadas e owner_id;
- fundações não podem sobrepor estruturas, estradas, zonas seguras ou outro lote;
- permissões: owner, co-owner, builder, visitor e banned;
- guildas poderão possuir lotes maiores em versão futura.

### 10.2 Peças do MVP

- fundação/piso;
- parede;
- porta;
- portão reforçado;
- baú;
- cama/ponto de respawn;
- núcleo da base;
- torre ou posto de guarda.

### 10.3 Núcleo da base

O núcleo representa a propriedade e o nível geral da base. Ele controla:

- dono e permissões;
- área máxima de construção;
- limite de estruturas;
- nível da base;
- limite de guardas;
- bônus defensivos;
- janela de vulnerabilidade;
- histórico de invasões.

O núcleo não deve armazenar diretamente todos os itens. Itens ficam em contêineres específicos.

### 10.4 Níveis da base

| Nível | Tema | Estrutura | Guardas | Requisito resumido |
|---|---|---:|---:|---|
| 1 | Acampamento | baixa | 0-1 | madeira e pedra |
| 2 | Cabana fortificada | média | 1-2 | materiais refinados |
| 3 | Casa de pedra | alta | 2-3 | recursos raros e moeda |
| 4 | Fortaleza | muito alta | 3-5 | conteúdo de grupo |
| 5 | Cidadela | extrema | 5+ | progressão avançada/guilda |

Cada nível aumenta durabilidade, redução de dano estrutural, limites de peças e opções de defesa. O custo de manutenção deve existir, mas não pode apagar a base imediatamente por ausência curta.

---

## 11. SISTEMA DE RAID

### 11.1 Objetivo

Raids devem gerar tensão e conflito sem permitir que um atacante destrua meses de progresso em poucos minutos. A invasão precisa exigir recursos, tempo, presença e risco.

### 11.2 Estados da base

- **Protegida:** não pode receber dano de raid.
- **Vulnerável:** pode ser atacada dentro da janela configurada.
- **Sob ataque:** recebeu dano válido recentemente.
- **Breached:** uma entrada foi rompida.
- **Lootable:** contêineres autorizados pelas regras podem ser saqueados.
- **Recovery:** período após raid com proteção temporária e possibilidade de reparo.

### 11.3 Janela de vulnerabilidade

- proprietário escolhe uma janela diária ou em dias específicos, dentro das regras do servidor;
- a janela deve ter duração suficiente para conflito, mas evitar ataque permanente enquanto o dono dorme;
- alterações de janela possuem atraso de ativação para impedir abuso;
- bases iniciantes recebem proteção prolongada;
- bases sem atividade por longo período entram em regras próprias de decadência, não em vulnerabilidade instantânea.

### 11.4 Início da raid

Para iniciar uma raid, o atacante precisa:

- estar fora da zona segura;
- ter nível mínimo;
- usar um item ou ritual de declaração de cerco;
- pagar um custo não reembolsável;
- respeitar cooldown por atacante e por alvo;
- permanecer próximo durante a ativação;
- não pertencer ao grupo autorizado da base.

A declaração envia alerta ao proprietário e defensores conectados. Futuramente, pode enviar notificação externa opcional.

### 11.5 Dano estrutural

- armas comuns causam dano estrutural mínimo ou zero;
- ferramentas de cerco causam dano significativo;
- cada estrutura possui hit points, armor, resistências e repair_state;
- o dano por segundo deve ser limitado;
- múltiplos atacantes sofrem diminishing returns para evitar derretimento instantâneo;
- atacar gera ruído, efeitos visuais e aggro de guardas;
- interrupções longas fazem a estrutura recuperar uma pequena parte do dano recente, nunca todo o dano acumulado;
- paredes de nível alto exigem vários minutos de dano coordenado;
- portões são pontos de entrada mais viáveis que paredes, criando decisões defensivas.

### 11.6 Exemplo inicial de balanceamento

Valores abaixo são placeholders para testes, não números finais:

| Estrutura | HP base | Redução | Tempo-alvo solo com ferramenta adequada |
|---|---:|---:|---:|
| Parede de madeira N1 | 12.000 | 10% | 4-6 min |
| Portão de madeira N1 | 9.000 | 5% | 3-5 min |
| Parede de pedra N3 | 60.000 | 35% | 15-25 min |
| Portão reforçado N3 | 42.000 | 25% | 10-18 min |
| Muralha N5 | 180.000 | 55% | conteúdo de grupo |

O teste deve medir tempo real, custo, ruído, exposição e resposta de guardas. Não balancear apenas por HP.

### 11.7 Regras de loot

- nem todo item armazenado pode ser roubado;
- um cofre pessoal protegido preserva uma quantidade limitada;
- baús comuns podem ser saqueados após breach;
- itens vinculados, itens de missão e recompensas especiais não são saqueáveis;
- cada contêiner possui limite de saque por raid;
- parte dos recursos pode cair como pacote de espólio com peso alto, obrigando transporte;
- o atacante precisa escapar e depositar o espólio para consolidar a recompensa;
- logout durante fuga não protege automaticamente o espólio;
- logs mostram o que foi roubado, por quem e quando.

### 11.8 Fim e recuperação

A raid termina quando:

- o temporizador expira;
- atacantes abandonam a área por tempo suficiente;
- o objetivo de saque é atingido;
- defensores repelem os atacantes;
- o servidor encerra por regra administrativa.

Após a raid:

- base recebe proteção de recuperação;
- estruturas podem ser reparadas com custo reduzido por período limitado;
- o núcleo e o lote não trocam de dono no MVP;
- estruturas destruídas deixam ruínas reparáveis;
- o defensor recebe relatório completo;
- sucessivas raids contra o mesmo alvo sofrem cooldown crescente.

---

## 12. GUARDAS E DEFESAS

### 12.1 Guardas NPC

- contratados e mantidos pelo proprietário;
- vinculados a um posto de guarda;
- patrulham pontos definidos;
- reconhecem owner, aliados, visitantes e hostis;
- entram em alerta quando estruturas recebem dano;
- possuem leash para não perseguirem indefinidamente;
- podem ser derrotados, mas retornam após tempo e custo;
- não dropam o equipamento completo do proprietário;
- upgrades melhoram vida, dano, percepção e habilidades.

### 12.2 Tipos futuros

- sentinela corpo a corpo;
- arqueiro de torre;
- curandeiro;
- mago de controle;
- animal de guarda;
- construtor que repara lentamente fora de combate.

### 12.3 Defesas passivas

- portas com permissões;
- armadilhas sinalizadas e limitadas;
- sinos de alerta;
- barricadas;
- torres;
- reforço de paredes;
- layout com corredores e pontos de defesa.

---

## 13. MAPA INICIAL

O mundo completo começa com três cidades inspiradas apenas em funções de gameplay, não em layouts ou nomes existentes.

### 13.1 Cidade 1 - Valoria

- capital equilibrada;
- centro comercial;
- templo, banco, mercado, treinadores e guildas;
- campos e florestas de nível baixo ao redor;
- principal ponto inicial para novos jogadores.

### 13.2 Cidade 2 - Mirehaven

- cidade pantanosa e portuária;
- alquimia, pesca e recursos venenosos;
- criaturas de pântano e ruínas;
- rotas estreitas e perigos ambientais.

### 13.3 Cidade 3 - Frostmere

- cidade fria e fortificada;
- mineração e metalurgia;
- montanhas, cavernas e criaturas resistentes;
- recursos importantes para bases de nível alto.

### 13.4 Ordem de implementação

1. Valoria e arredores no vertical slice.
2. Estrada, floresta, mina e primeira área de construção.
3. Mirehaven após o loop principal estar estável.
4. Frostmere após economia e raids terem telemetria suficiente.

### 13.5 Regiões e PvP

- cidade: safe zone;
- estrada principal: proteção parcial;
- wilderness: PvP condicionado;
- área de construção: PvP e raid conforme janela;
- dungeon: regras específicas;
- evento: regras temporárias.

---

## 14. PERSISTÊNCIA E MODELO DE DADOS

Entidades mínimas:

- accounts;
- characters;
- character_stats;
- character_positions;
- item_definitions;
- item_instances;
- inventories;
- inventory_slots;
- equipment_slots;
- world_regions;
- structures;
- structure_permissions;
- base_cores;
- containers;
- container_slots;
- guards;
- abilities;
- cooldowns;
- creatures;
- raid_sessions;
- raid_participants;
- raid_damage_events;
- loot_transfers;
- audit_logs.

Requisitos:

- migrations versionadas;
- chaves estrangeiras;
- timestamps em UTC;
- soft delete quando necessário;
- índices para owner, region, position e active raid;
- unique constraints para impedir duplicação;
- transações em operações econômicas;
- backups automatizáveis.

---

## 15. SEGURANÇA E ANTICHEAT

- autenticação com senha armazenada por hash seguro;
- tokens de sessão com expiração;
- nunca confiar em preço, dano, quantidade, cooldown ou coordenada enviada pelo cliente;
- limitar frequência de movimento e habilidades;
- validar caminho possível entre posição anterior e nova;
- validar alcance e linha de visão;
- detectar velocidade anormal;
- registrar transações de itens raros;
- proteção contra replay de comandos;
- ferramentas administrativas com permissões separadas;
- nenhum comando administrativo embutido no cliente público;
- logs de raid imutáveis para investigação.

---

## 16. UX E INTERFACE DO MVP

- viewport central do mundo;
- barras de vida e mana;
- hotbar de habilidades;
- inventário em painel;
- janela de equipamento;
- minimapa simples;
- chat;
- painel de construção;
- painel do núcleo da base;
- indicador de estado: protegida, vulnerável, sob ataque ou recovery;
- feedback claro quando uma ação é negada pelo servidor;
- modo de construção com preview verde/vermelho;
- barra de HP estrutural visível durante raid.

---

## 17. MILESTONES OBRIGATÓRIOS

### Milestone 0 - Fundação do repositório

Entregáveis:

- estrutura de pastas;
- README;
- Godot client e server iniciando;
- Docker Compose com PostgreSQL;
- convenções de código;
- pipeline de testes;
- documentação de execução local.

Critério de aceite: uma pessoa consegue clonar, executar um comando documentado e abrir cliente e servidor vazios sem erro.

### Milestone 1 - Movimento local

- mapa de teste em tiles;
- colisão;
- personagem placeholder;
- movimento por teclado;
- clique para andar;
- câmera;
- troca de andar simples.

Critério: movimento consistente sem atravessar obstáculos.

### Milestone 2 - Multiplayer autoritativo

- conexão de dois clientes;
- spawn;
- movimento validado no servidor;
- snapshots;
- interpolação;
- reconexão básica.

Critério: dois jogadores se veem e não conseguem teleportar alterando o cliente.

### Milestone 3 - Combate PvE

- Vanguard;
- criatura básica;
- ataque e habilidades;
- morte, XP e respawn;
- loot no chão.

### Milestone 4 - Inventário persistente

- inventário;
- equipamento;
- baú;
- banco de dados;
- testes de duplicação e concorrência.

### Milestone 5 - Coleta e construção

- madeira e pedra;
- reivindicação de lote;
- núcleo;
- piso, parede, porta e baú;
- permissões;
- persistência das estruturas.

### Milestone 6 - Raid de laboratório

- janela de vulnerabilidade de teste;
- declaração de raid;
- dano estrutural;
- breach;
- saque limitado;
- fim da raid;
- recovery;
- relatório e logs.

### Milestone 7 - Guarda NPC

- posto de guarda;
- patrulha;
- detecção de invasores;
- combate;
- respawn e manutenção.

### Milestone 8 - Vertical slice público fechado

- Valoria;
- área externa;
- dungeon curta;
- progressão inicial;
- base nível 1 e 2;
- raid balanceada;
- telemetria;
- ferramentas administrativas básicas.

---

## 18. DEFINIÇÃO DE PRONTO

Uma feature só está pronta quando:

- funciona em build limpa;
- possui tratamento de erro;
- possui logs úteis;
- regras críticas têm testes;
- o servidor valida a ação;
- dados persistem corretamente;
- documentação foi atualizada;
- existe checklist manual;
- não introduz duplicação de item ou inconsistência de posição;
- limitações estão registradas.

---

## 19. PRIMEIRA TAREFA PARA O CLAUDE

Execute apenas o Milestone 0.

Antes de criar código, responda com:

1. resumo da arquitetura escolhida;
2. decisões e trade-offs;
3. árvore de diretórios;
4. dependências necessárias;
5. sequência exata de implementação;
6. riscos técnicos;
7. critérios de aceite.

Em seguida, gere os arquivos completos do Milestone 0, um por vez, sempre usando este formato:

```text
ARQUIVO: caminho/do/arquivo.ext
OBJETIVO: descrição curta
CONTEÚDO:
[código completo]
COMO VALIDAR:
[comandos e resultado esperado]
```

Ao terminar, apresente:

- lista de arquivos criados;
- comandos para iniciar banco, servidor e cliente;
- comandos de teste;
- checklist de validação;
- problemas conhecidos;
- pergunta final única: “Posso iniciar o Milestone 1?”

Não implemente o Milestone 1 nesta etapa.

---

## 20. PROMPT CURTO PARA RETOMAR O PROJETO

Use este texto nas sessões seguintes:

> Continue o projeto Project Dominion 2D usando o documento mestre como fonte de verdade. Leia primeiro o estado atual do repositório, o README, docs/milestones.md e os testes. Identifique o último milestone concluído, execute os testes existentes e não reescreva funcionalidades funcionais sem justificativa. Implemente somente o próximo milestone pendente. Mantenha o servidor autoritativo, a persistência transacional e os logs de auditoria. Ao finalizar, atualize a documentação, apresente os arquivos alterados, os comandos de teste, o checklist manual e as limitações conhecidas.

---

## 21. DECISÕES QUE DEVEM PERMANECER CONFIGURÁVEIS

Não fixar permanentemente no código:

- tamanho do tile;
- tick rate;
- velocidade de movimento;
- fórmulas de dano;
- cooldowns;
- HP e armor de estruturas;
- duração de raids;
- janela de vulnerabilidade;
- limites de saque;
- capacidade de inventário;
- custo de upgrades;
- quantidade de guardas;
- taxas de respawn;
- penalidades de morte.

Esses valores devem vir de configurações versionadas e ser ajustáveis sem alterar sistemas centrais.

---

## 22. PRINCIPAIS RISCOS DO PROJETO

1. Escopo excessivo: combater com milestones e MVP restrito.
2. Networking inconsistente: servidor autoritativo desde cedo.
3. Duplicação de itens: transações, IDs únicos, locking e testes.
4. Raids frustrantes: janelas, recovery, cofres protegidos, cooldown e telemetria.
5. Bases bloqueando o mapa: lotes e regras de posicionamento.
6. Pathfinding caro: limitar área, cache e hierarquia de navegação.
7. Banco sobrecarregado: separar estado efêmero de persistência durável.
8. Cheats de velocidade e alcance: validação de input e posição.
9. Conteúdo insuficiente: ferramentas de dados e mapas antes de produzir volume.
10. Dependência de IA sem controle: testes, documentação e revisão humana por milestone.

---

## 23. FONTES E OBSERVAÇÃO SOBRE A FERRAMENTA

Claude Fable 5 é apresentado pela Anthropic como um modelo voltado a projetos ambiciosos de programação, capaz de implementar sistemas complexos, criar testes e trabalhar em sessões prolongadas. Mesmo assim, o projeto deve ser dividido em milestones e validado localmente. Uma IA pode acelerar a produção, mas não substitui testes de rede, segurança, balanceamento, arte, conteúdo e operação de um MMORPG.

Fontes oficiais consultadas em julho de 2026:

- Anthropic - Claude Fable: https://www.anthropic.com/claude/fable
- Anthropic - Introducing Claude Fable 5 and Claude Mythos 5: https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5
- Anthropic - Prompting Claude Fable 5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5
