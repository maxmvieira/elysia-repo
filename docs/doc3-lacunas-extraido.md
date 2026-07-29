# Doc 3 — Atualizações de Lacunas (texto extraído)

> ⚠️ **Arquivo gerado automaticamente.** O original é
> [`ELYSIA ONLINE ATUALIZAÇOES DE LACUNAS.docx`](./ELYSIA%20ONLINE%20ATUALIZACOES%20DE%20LACUNAS.docx),
> que é a fonte de verdade. Este `.md` existe só para o conteúdo ser
> **pesquisável** por ferramenta de busca e legível sem abrir o Word — nenhum
> editor deve alterá-lo à mão: se o `.docx` mudar, regere.
>
> Formatação, tabelas e imagens do original **não** sobrevivem à extração.
>
> Triagem do que dá para implementar: [`DOC3-TRIAGEM.md`](./DOC3-TRIAGEM.md)

---
BLOCO 01 — CRAFTING (VERSÃO CONSOLIDADA)
1. Fragmentos de Equipamentos (novo sistema oficial)
Os monstros não derrubam equipamentos completos com frequência.
A principal forma de obtenção de equipamentos através do crafting será por Fragmentos de Equipamento.
Exemplos:
Fragmento Comum
Fragmento Incomum
Fragmento Raro
Fragmento Épico
Fragmento Lendário
Os fragmentos representam partes aproveitáveis de armas e armaduras destruídas ou materiais especiais reaproveitados pelo artesão.
Além dos fragmentos, a receita exigirá outros materiais (minérios, madeira, couro, tecidos, essências etc.).

2. A raridade do item é definida pelos fragmentos
Para fabricar um item, o jogador deverá reunir uma quantidade fixa de fragmentos (exemplo: 100).
A probabilidade da raridade final será proporcional aos fragmentos utilizados.
Exemplo:
50 Fragmentos Comuns
50 Fragmentos Incomuns
Resultado:
50% Common
50% Uncommon
Outro exemplo:
30 Raros
30 Épicos
40 Lendários
Resultado:
30% Rare
30% Epic
40% Legendary
Isso permite que o jogador escolha entre arriscar ou esperar até reunir materiais melhores.

3. O nível da profissão influencia o resultado
Mesmo utilizando os mesmos materiais, dois Ferreiros podem obter resultados diferentes.
O nível profissional influencia:
chance de sucesso;
qualidade final dentro da raridade;
chance de atributos naturais melhores;
pequena chance de elevar a raridade em um nível (ex.: de Épico para Lendário, respeitando um limite baixo).
Assim, investir na profissão sempre vale a pena.

4. O crafting nunca gera um item inútil
O RNG nunca deve transformar materiais extremamente valiosos em lixo.
Se os materiais utilizados permitirem apenas Rare, Epic e Legendary, o resultado nunca poderá ser Common ou Uncommon.
Isso protege o investimento do jogador.

5. Receitas
Receitas passam a ser uma forma importante de progressão.
Podem ser obtidas por:
NPCs;
quests;
dungeons;
chefes;
MVPs;
eventos;
exploração.
Receitas raras tornam-se itens valiosos e negociáveis.

6. O item fabricado nunca é idêntico
Mesmo usando a mesma receita:
"Armadura do Guardião"
cada fabricação pode gerar combinações diferentes de:
atributos;
passivos;
afinidades;
foco para determinadas classes.
Exemplo:
Uma Armadura do Guardião pode nascer excelente para Warrior.
Outra excelente para Sorcerer.
Outra focada em Assassin.
Outra equilibrada para PvP.
Isso incentiva o comércio entre jogadores.

7. O melhor equipamento pode nascer do crafting
O objetivo do sistema não é apenas fabricar equipamentos intermediários.
Um artesão extremamente dedicado pode fabricar equipamentos entre os melhores do servidor.
Isso cria uma economia onde determinados artesãos se tornam conhecidos pela qualidade de seu trabalho.

8. Progressão da profissão
Toda fabricação concede experiência profissional.
Entretanto, para evitar spam de itens baratos:
fabricar receitas muito abaixo do nível do artesão concede XP reduzida;
fabricar itens próximos ao nível recomendado concede XP normal;
fabricar receitas difíceis concede bônus de XP.
Assim, o progresso acompanha a complexidade do trabalho, e não a repetição infinita do mesmo item.

9. Relação entre PvE e Craft
O PvE abastece o Craft.
O Craft abastece os jogadores.
Os jogadores movimentam o Marketplace.
O Marketplace financia novas expedições.
O sistema forma um ciclo econômico contínuo.

Um ajuste que eu faria
Só mudaria um detalhe da sua ideia para evitar um comportamento pouco intuitivo.
Em vez de um jogador poder usar qualquer mistura (por exemplo, 90 Lendários + 10 Comuns), eu criaria uma regra de "qualidade mínima garantida".
Exemplo:
Fragmentos Comuns nunca reduzem a qualidade de Fragmentos Lendários.
Eles apenas deixam de contribuir para a chance de Lendário.
Assim:
90 Lendários + 10 Comuns = 90% Lendário e 10% Comum (como você sugeriu).
Mas eu impediria algo como:
1 Lendário + 99 Comuns
ser usado para tentar obter um Lendário de forma economicamente vantajosa. Poderíamos exigir um mínimo de fragmentos da raridade desejada (por exemplo, pelo menos 20 ou 30) para que ela entre na tabela de probabilidades. Isso evita exploits sem tirar a flexibilidade do sistema.
Na minha opinião, esse é um dos sistemas mais interessantes que definimos até agora para o Elysia. Ele conecta PvE, profissões, economia e Marketplace em um único ciclo e cria valor tanto para quem gosta de explorar quanto para quem prefere viver do comércio.
DD-PROF-021 — Fragmentos de Equipamentos (NOVO)
Equipamentos craftados utilizam Fragmentos de Equipamento como um dos principais componentes de fabricação.
Existem cinco categorias de fragmentos:
Fragmento Comum
Fragmento Incomum
Fragmento Raro
Fragmento Épico
Fragmento Lendário
Os fragmentos são obtidos principalmente através da exploração, monstros, dungeons, chefes e MVPs.

DD-PROF-022 — Sistema de Probabilidade por Fragmentos (NOVO)
A raridade do equipamento fabricado é determinada pela proporção dos fragmentos utilizados.
Exemplo:
50 Comuns + 50 Incomuns → 50% Common → 50% Uncommon
30 Raros + 30 Épicos + 40 Lendários → 30% Rare → 30% Epic → 40% Legendary
Cada raridade só entra na tabela caso exista uma quantidade mínima de fragmentos daquela categoria, evitando abusos.

DD-PROF-023 — Nível Profissional (NOVO)
O nível da profissão influencia:
qualidade da fabricação;
atributos naturais do item;
qualidade dos passivos;
pequena chance de elevar a raridade em um nível (dentro dos limites do sistema).

DD-PROF-024 — Progressão Profissional (NOVO)
Toda fabricação concede experiência profissional.
Receitas muito abaixo do nível do artesão concedem experiência reduzida.
Receitas compatíveis ou superiores ao nível do artesão concedem experiência normal ou bônus.
O sistema evita evolução baseada na repetição infinita de itens baratos.

DD-PROF-025 — Receitas (NOVO)
Receitas podem ser obtidas através de:
NPCs;
missões;
exploração;
dungeons;
chefes;
MVPs;
eventos.
Receitas raras são negociáveis entre jogadores.

DD-PROF-026 — Variabilidade dos Itens (NOVO)
A mesma receita pode produzir equipamentos com diferentes distribuições de atributos, passivos e afinidades, respeitando a identidade do item.
Isso incentiva o comércio entre jogadores e impede que duas peças sejam necessariamente idênticas.

DD-PROF-027 — Economia Circular (NOVO)
O Crafting integra permanentemente PvE e economia.
Exploração → Fragmentos → Craft → Marketplace → Novas Expedições.
Esse ciclo constitui um dos pilares da economia de Elysia Online.

Eu faria apenas uma pequena alteração de nomenclatura para ficar mais natural dentro do universo do jogo. Em vez de "Pedaço de Espada" ou "Pedaço de Armadura", usaria Fragmentos de Equipamento. Isso permite justificar qualquer tipo de fabricação sem criar dezenas de itens diferentes ("fragmento de espada", "fragmento de machado", "fragmento de elmo"...). O jogador entende rapidamente que são materiais reaproveitáveis usados pelos artesãos.
Esse bloco pode ser considerado 100% fechado. A partir de agora, só restará balanceamento numérico (chances, quantidades de fragmentos, custos etc.), que é algo para a fase final do desenvolvimento.
CAPÍTULO 78 — ATUALIZAÇÃO OFICIAL DO SISTEMA DE CRAFTING
DD-PROF-021 — Fragmentos de Equipamentos
Os equipamentos craftados utilizam Fragmentos de Equipamento como um dos principais materiais de fabricação.
Existem sete categorias de fragmentos:
Fragmento Comum
Fragmento Incomum
Fragmento Raro
Fragmento Épico
Fragmento Lendário
Fragmento Mítico
Fragmento de Relíquia
Os fragmentos são obtidos principalmente através de monstros, Bosses, MVPs, dungeons e outras atividades de exploração.

DD-PROF-022 — Probabilidade por Fragmentos
A raridade do equipamento fabricado é determinada pela proporção dos fragmentos utilizados.
Exemplo:
50 Fragmentos Comuns
50 Fragmentos Incomuns
Resultado:
50% Common
50% Uncommon
Outro exemplo:
20 Raros
30 Épicos
50 Lendários
Resultado:
20% Rare
30% Epic
50% Legendary
O jogador pode combinar fragmentos de diferentes raridades para definir a probabilidade do resultado final.

DD-PROF-023 — Evolução da Profissão
Toda fabricação concede experiência profissional.
Quanto maior a dificuldade da receita, maior será o ganho de experiência.
Receitas muito abaixo do nível do artesão concedem experiência reduzida.
O nível da profissão influencia:
qualidade dos atributos;
qualidade dos passivos;
chance de sucesso;
pequena melhoria na qualidade final do equipamento.

DD-PROF-024 — Receitas como Consumíveis
As receitas não são aprendidas permanentemente.
Cada fabricação consome uma receita.
Assim, toda produção exige:
Receita;
Fragmentos;
Materiais complementares;
Gold.
Isso garante demanda permanente por receitas e mantém o mercado ativo durante toda a vida do servidor.

DD-PROF-025 — Categorias de Receitas
As receitas seguem a mesma classificação das raridades dos equipamentos.
Existem:
Receita Comum
Receita Incomum
Receita Rara
Receita Épica
Receita Lendária
Receita Mítica
Receita de Relíquia
A receita determina apenas a categoria da fabricação, e não o tipo exato de equipamento.

DD-PROF-026 — Escolha do Equipamento
Ao iniciar a fabricação, o jogador escolhe qual equipamento deseja produzir.
Exemplos:
Receita Mítica + Fragmentos Míticos
O jogador pode fabricar:
Espada Mítica
Machado Mítico
Lança Mítica
Arco Mítico
Escudo Mítico
Armadura Mítica
A escolha é feita no momento da fabricação.

DD-PROF-027 — Distribuição das Receitas
As receitas são distribuídas conforme a dificuldade do conteúdo.
NPCs
Comuns
Incomuns
Parte das Raras
Monstros comuns e Elites
Raras
Bosses
Raras
Épicas
pequena chance de Lendárias
MVPs intermediários
Épicas
Lendárias
MVPs de alto nível e conteúdo Endgame
Lendárias
Míticas
Relíquias
Quanto maior a dificuldade do conteúdo, maior o acesso às receitas mais raras.

DD-PROF-028 — Mestres Ferreiros
A maioria das cidades possui Ferreiros comuns.
Esses NPCs podem fabricar equipamentos de até a categoria Lendária.
Existem apenas dois Mestres Ferreiros em todo o mundo de Elysia.
Somente eles possuem conhecimento para fabricar equipamentos:
Míticos
Relíquias
Esses dois NPCs tornam-se centros econômicos importantes para todo o servidor.

DD-PROF-029 — Economia Permanente
O sistema de Crafting foi desenvolvido para manter o comércio ativo durante toda a vida do servidor.
Os principais recursos negociados entre jogadores serão:
Fragmentos;
Receitas;
Materiais de fabricação;
Equipamentos produzidos.
Nenhum desses recursos perde completamente o valor com o passar do tempo, garantindo uma economia dinâmica e sustentável.

Eu só faria uma pequena mudança em relação às receitas: em vez de chamá-las apenas de "Receita Mítica" ou "Receita Lendária", eu chamaria de Projeto Mítico, Projeto de Relíquia, etc. Isso combina melhor com a ideia de um documento técnico consumível. Mas é apenas uma questão de nomenclatura; mecanicamente, o sistema fica exatamente como você descreveu.
Para mim, esse capítulo está fechado e bem consistente. Ele conecta PvE, profissões, economia e marketplace de uma forma simples de entender e com potencial para permanecer relevante durante toda a vida do jogo.

ATUALIZAÇÃO OFICIAL — LORE
DD-LOR-070 — Destino do Primeiro Arcanjo Rebelde
Status: DEFINITIVO.
O Primeiro Arcanjo Rebelde não foi destruído ao final da Primeira Rebelião.
Após sua derrota, foi aprisionado em um local desconhecido, inacessível às civilizações mortais.
Sua prisão permanece como um dos maiores segredos da história de Elysia.

DD-LOR-071 — Influência na Era Atual
Status: DEFINITIVO.
Mesmo aprisionado, sua influência ainda pode alcançar o mundo através da Corrupção.
Cultos, seguidores e entidades ligadas ao Inferno podem tentar:
encontrar sua prisão;
enfraquecer seus selos;
libertá-lo.
Essas ações ocorrem sem que a maioria da população sequer saiba da existência dessa ameaça.

DD-LOR-072 — Conteúdo Futuro
Status: DEFINITIVO.
O Primeiro Arcanjo Rebelde não faz parte do conteúdo inicial de Elysia Online.
Sua existência permanece como um elemento da Lore destinado a futuras expansões, eventos ou capítulos da história.
Isso preserva a continuidade narrativa sem exigir que toda a cosmologia seja resolvida na versão inicial do jogo.

DD-LOR-073 — Mistério Histórico
Status: DEFINITIVO.
Nenhuma civilização contemporânea conhece toda a verdade sobre o destino do Primeiro Arcanjo Rebelde.
Cada povo preserva apenas fragmentos da história, frequentemente contraditórios entre si.
A verdadeira história permanece registrada apenas na Lore Bible.

DD-LOR-074 — Quests Principais
Status: DEFINITIVO.
As quatro quests principais do jogo revelarão gradualmente a existência da Primeira Rebelião e do Primeiro Arcanjo Rebelde.
O arco narrativo inicial termina impedindo mais um avanço das forças da Corrupção, mas não encerra definitivamente essa ameaça, permitindo que a história continue em conteúdos futuros.

Na minha opinião, essa é uma decisão muito boa por outro motivo: ela resolve um erro comum em MMORPGs. Muitos jogos colocam o "grande vilão" logo na versão inicial, e depois precisam inventar inimigos cada vez mais poderosos sem preparação.
Em Elysia, você já estabelece desde o começo que existe uma ameaça muito maior do que tudo que o jogador enfrenta na versão de lançamento. Assim, futuras expansões podem explorar o Primeiro Arcanjo Rebelde, outros Arcanjos, Senhores do Inferno ou novas regiões sem precisar reescrever a cosmologia do mundo. Tudo isso já estará previsto desde a primeira versão da Lore.
Os Primeiros Guardiões
Antes da criação dos povos mortais, Deus criou um pequeno grupo de Arcanjos Primordiais.
Eles ficaram conhecidos posteriormente como:
Os Primeiros Guardiões.
Sua missão era exatamente a que já está na Lore:
proteger o Heart;
ensinar os povos;
preservar a Criação.

Quantidade
Eu definiria apenas sete Primeiros Guardiões.
Sete é um número recorrente em diversas tradições, fácil de memorizar e suficiente para criar histórias sem inflar o elenco.

Os Sete Primeiros Guardiões
Aethor
Guardião da Ordem
Líder dos Primeiros Guardiões após a Rebelião.
Representa disciplina, estabilidade e proteção.

Seraphiel
Guardião da Luz
Ligado à sabedoria, esperança e preservação do conhecimento.

Kaelion
Guardião da Justiça
Responsável pelo equilíbrio entre liberdade e responsabilidade.

Elyon
Guardião da Vida
Associado à proteção das primeiras civilizações.

Thariel
Guardião da Fortaleza
Comandante dos exércitos celestiais durante a Primeira Rebelião.

Lyriel
Guardiã da Harmonia
Relacionada à cura, compaixão e união entre os povos.

Noxar
O Primeiro Arcanjo Rebelde
O único entre os Sete que acreditou ser capaz de criar uma realidade superior à do Criador.
Foi ele quem iniciou a Primeira Rebelião.
Após sua derrota, foi aprisionado, permanecendo vivo e podendo retornar no futuro.

Por que gostei de "Noxar"?
Ele não significa explicitamente "mal".
É um nome que pode ser lembrado como alguém que fez uma escolha errada, e não como um ser criado para ser maligno.
Isso conversa diretamente com uma regra que já definimos:
A Corrupção começou com uma escolha, não com uma espécie.

Serafins
Eu faria uma distinção simples:
Arcanjos são os líderes e Primeiros Guardiões.
Serafins são a mais alta ordem celestial abaixo dos Arcanjos.
Eles não governam.
Eles servem.
Assim você pode ter inúmeros Serafins, enquanto apenas os Sete Arcanjos Primordiais permanecem figuras únicas.

Nova decisão oficial
DD-LOR-075 — Os Sete Primeiros Guardiões
Status: DEFINITIVO.
Antes da criação das civilizações mortais, Deus criou sete Arcanjos Primordiais, conhecidos como os Primeiros Guardiões.
Eles receberam a missão de proteger o Heart, preservar a Criação e orientar os primeiros povos.
Um deles, Noxar, iniciou a Primeira Rebelião ao acreditar que poderia construir uma realidade superior à criada por Deus.
Após sua derrota, Noxar foi aprisionado, permanecendo vivo e representando uma ameaça potencial para futuras eras.

A única coisa que eu deixaria em aberto é uma decisão de nomenclatura: "Noxar". Eu gostei do som e acho que combina com a identidade do personagem, mas, por ser um dos nomes mais importantes de toda a Lore, vale a pena escolher algo que você realmente goste. Esse nome aparecerá em livros, diálogos, quests e expansões, então é melhor acertá-lo agora do que trocá-lo depois.

BLOCO 03 — A Hierarquia Celestial
Hoje sabemos que existem:
Espíritos de Luz;
Guardiões Celestiais;
Arqueiras Celestiais;
Sacerdotisas Celestiais;
Anjos;
Anjos Guardiões;
Arcanjos;
Serafins.
Mas a relação entre eles ainda não foi documentada.
Minha proposta
Eu faria uma estrutura simples.
Nada de quinze patentes militares.
Algo fácil de entender.

Hierarquia
1. Espíritos de Luz
São as entidades celestiais mais simples.
Sua função é servir, proteger locais sagrados e auxiliar outros Celestiais.
Não comandam ninguém.

2. Celestiais
Incluem:
Guardião Celestial
Arqueira Celestial
Sacerdotisa Celestial
São soldados, patrulheiros, curadores e defensores.
São a "base" do exército celestial.

3. Anjos
Acima dos Celestiais comuns.
Recebem missões importantes.
Podem liderar pequenos grupos.

4. Serafins
São os maiores comandantes militares.
Extremamente poderosos.
Poucos existem.
Cada Serafim pode liderar centenas ou milhares de Celestiais.

5. Arcanjos
Os Primeiros Guardiões.
Não são apenas generais.
São responsáveis por preservar a própria Criação.
Existem apenas sete.
Acima deles não existe nenhuma criatura.
Apenas o Criador.

Onde vivem?
Essa também é uma pendência importante.
Eu criaria um único reino.
Aetherion
A Cidade Celestial.
Não é um planeta.
Não é um continente.
É um domínio criado diretamente por Deus.
Foi dali que partiram os Primeiros Guardiões para proteger o Heart e ensinar os povos.
Isso preserva a ideia de que os Celestiais possuem uma origem comum, sem precisar criar dezenas de cidades.

Relação atual com os mortais
Eu faria algo diferente do padrão.
Após a Primeira Rebelião, os Celestiais deixaram de viver entre os povos.
Hoje eles aparecem apenas em situações excepcionais.
A maioria das pessoas passa a vida inteira sem ver um Anjo.
Alguns sequer acreditam que eles ainda existam.
Isso conversa diretamente com outro princípio da Lore:
A fé existe. A certeza, não.

Por que isso melhora o mundo?
Porque um Anjo deixa de ser um "NPC com asas".
Se um jogador encontrar um Celestial, aquilo vira um acontecimento.
A presença dele já conta uma história.

Atualizações da Lore
DD-LOR-076 — Hierarquia Celestial
Status: DEFINITIVO.
A estrutura dos Celestiais é organizada da seguinte forma:
Espíritos de Luz
Celestiais
Anjos
Serafins
Arcanjos (Primeiros Guardiões)
Cada nível representa maior responsabilidade e poder dentro da organização celestial.

DD-LOR-077 — Reino Celestial
Status: DEFINITIVO.
Os Celestiais têm origem em Aetherion, o Domínio Celestial.
Criado pelo Criador antes das civilizações mortais, Aetherion é a morada dos Primeiros Guardiões e o centro da ordem celestial.

DD-LOR-078 — Relação com os Mortais
Status: DEFINITIVO.
Após a Primeira Rebelião, os Celestiais deixaram de conviver regularmente com os povos mortais.
Na era atual, suas aparições são extremamente raras e normalmente ligadas a acontecimentos de grande importância para o equilíbrio da Criação.

Eu faria apenas uma alteração em relação ao nome Aetherion: como o universo de Elysia já usa Aether como a energia primordial, talvez seja interessante que a capital celestial tenha uma identidade própria para não gerar confusão.
Por exemplo:
Luminaris
Elysion
Caelum
Sanctum
Astraeus
Eu manteria Aether exclusivamente para a energia que sustenta a Criação e daria à cidade um nome distinto. Isso ajuda a diferenciar conceitos quando o jogador estiver lendo livros, fazendo quests ou explorando a história.
BLOCO 04 — Os Seis Arcanjos Fiéis
Nós já definimos que existem sete.
Um caiu.
Restam seis.
A minha sugestão é que nenhum deles represente um elemento (fogo, gelo etc.).
Eles devem representar princípios da Criação.
Isso conversa muito melhor com a filosofia que construímos.

Aethor
O Guardião da Ordem
É quem assume a liderança dos Primeiros Guardiões após a Rebelião.
Sua missão não é governar.
É impedir que outro desastre semelhante aconteça.

Seraphiel
A Guardiã da Sabedoria
Responsável por preservar o conhecimento verdadeiro.
Foi ela quem iniciou a preservação das Memórias do Aether.
Grande parte da história só sobreviveu por causa dela.

Kaelion
O Guardião da Justiça
Não representa vingança.
Representa julgamento.
É ele quem mais se opôs ao Arcanjo Rebelde durante a Primeira Rebelião.

Elyon
O Guardião da Vida
Responsável por orientar os primeiros povos.
Sempre acreditou que as civilizações deveriam evoluir por suas próprias escolhas.

Thariel
O Guardião da Fortaleza
Comandante dos exércitos celestiais.
Foi quem liderou a resistência militar durante a Rebelião.

Lyriel
A Guardiã da Esperança
Ela representa aquilo que continua existindo mesmo após a Grande Fratura.
É a Arcanja ligada à reconstrução do mundo.

Noxar
O Primeiro Rebelde
Já definimos.
Permanece aprisionado.
Ainda pode retornar.

Um detalhe que eu adicionaria
Os seis sobreviventes não permaneceram unidos para sempre.
Eles continuam leais ao Criador.
Mas cada um passou a proteger uma parte diferente da Criação.
Isso explica por que quase nunca aparecem juntos.
Por exemplo:
um protege Aetherion;
outro observa o Heart;
outro combate o avanço da Corrupção;
outro acompanha as civilizações;
outro preserva o conhecimento;
outro permanece desaparecido há séculos.
Assim, você evita a pergunta clássica:
"Se existem seis Arcanjos bons... por que eles não resolvem tudo?"
A resposta é:
Porque cada um possui uma missão impossível de abandonar.

Expansões
Essa decisão abre uma possibilidade muito boa.
Uma expansão inteira pode girar em torno de apenas um Arcanjo.
Exemplo:
Expansão: O Legado de Seraphiel
Toda a história gira em torno da Biblioteca Celestial perdida.
Outra:
Expansão: A Fortaleza de Thariel
Uma região militar antiga é descoberta.
Outra:
Expansão: O Retorno de Noxar
A primeira grande expansão de fim de saga.
Você não precisa criar novos deuses nem novos Arcanjos.
Você apenas revela partes daquilo que já existia.

Novas decisões
DD-LOR-079 — Os Seis Guardiões
Após a Primeira Rebelião, os seis Arcanjos que permaneceram fiéis continuaram cumprindo suas missões originais, preservando a Criação e impedindo o avanço da Corrupção.

DD-LOR-080 — Missões Individuais
Cada Arcanjo recebeu responsabilidades diferentes após a Grande Fratura.
Por esse motivo, raramente atuam em conjunto, tornando sua presença extremamente rara na Era Atual.

DD-LOR-081 — Estrutura para Expansões
Cada um dos Sete Arcanjos constitui um núcleo narrativo independente.
Suas histórias poderão ser exploradas gradualmente em futuras expansões, regiões, dungeons, artefatos e quests, sem necessidade de alterar a cosmologia já estabelecida.

Um último detalhe que considero importante
Eu faria uma pequena mudança em relação ao que propus antes: em vez de Lyriel representar a Harmonia, faria dela a Esperança.
"Harmonia" e "Ordem" acabam ficando conceitualmente próximos.
Já Esperança dá um contraste muito interessante com Noxar. Enquanto ele acredita que a Criação precisa ser substituída, Lyriel representa a convicção de que a Criação ainda pode ser restaurada. Isso cria um contraponto filosófico forte sem transformar os Arcanjos em caricaturas de "bem contra mal". Essa ideia também se alinha ao livre-arbítrio e à reconstrução do mundo que já são pilares da Lore.
BLOCO 05 — Os Sete Senhores da Corrupção
Eu não faria os Sete Senhores da Corrupção como "sete demônios criados por Deus".
Isso quebraria toda a cosmologia que construímos.
Eles devem seguir exatamente a mesma lógica dos demônios:
Todos surgiram da Corrupção.
Nenhum existia originalmente.

Eles também não devem nascer prontos.
Assim como Noxar não caiu de um dia para o outro...
...os Sete Senhores também não.
Foram criaturas que, durante eras, se tornaram completamente consumidas pela Corrupção.
Cada uma representa uma maneira diferente de rejeitar a Ordem da Criação.

Aqui eu mudaria uma coisa importante.
Eu não usaria os sete pecados capitais.
É um conceito muito conhecido e deixaria a Lore parecida com várias outras obras.
Em vez disso, eu criaria sete distorções da Criação.
Por exemplo:

Noxar
Representa:
Orgulho
Já está praticamente consolidado na própria Lore.
Ele acreditava poder aperfeiçoar a Criação.

Senhor da Dominação
Acredita que liberdade gera caos.
Tudo deve ser controlado.

Senhora da Deformação
Toda criatura deve ser "aperfeiçoada".
A Corrupção é vista como evolução.

Senhor do Vazio
Não deseja governar.
Deseja apagar toda a existência.

Senhora da Fome
Nunca está satisfeita.
Consome Aether, criaturas e até regiões inteiras.

Senhor da Mentira
Corrompe conhecimento.
Reescreve história.
Manipula religiões.
Espalha falsas memórias.

Senhora da Ruína
Não cria nada.
Apenas destrói aquilo que já existe.

O que isso gera?
Agora cada Senhor representa um tipo diferente de ameaça.
Não são sete chefões iguais.
Cada expansão pode explorar uma filosofia diferente.

Melhor ainda...
Nenhum deles precisa aparecer no lançamento.
Eles podem existir apenas como:
mitos;
livros;
cultos;
ruínas;
símbolos.
O jogador talvez nem descubra todos na primeira versão do jogo.

Relação com os Arcanjos
Também não faria:
Arcanjo A luta contra Senhor A.
Arcanjo B luta contra Senhor B.
Isso fica mecânico demais.
Prefiro que todos sejam inimigos da Corrupção, mas cada conflito histórico seja diferente.
Alguns Arcanjos podem ter enfrentado vários Senhores.
Outros talvez nunca tenham encontrado determinado Senhor.
Isso deixa a história mais orgânica.

Outro detalhe que gostei
A Lore diz várias vezes que:
"Os habitantes conhecem fragmentos. A Lore Bible conhece a verdade."
Então imagine isso.
Em uma região...
Os habitantes acreditam que existe apenas um Senhor da Corrupção.
Em outra...
Dizem que existem doze.
Outra religião fala em três.
Outra acha que Noxar e um Senhor da Corrupção são a mesma pessoa.
Todas essas interpretações podem coexistir.
Mas a Lore Bible registra:
Existem exatamente sete Senhores da Corrupção.

Novas decisões
DD-LOR-082 — Os Sete Senhores da Corrupção
Status: DEFINITIVO.
Existem sete grandes Senhores da Corrupção.
Nenhum deles foi criado originalmente nessa condição.
Todos surgiram através da ação prolongada da Corrupção sobre criaturas que escolheram afastar-se da Ordem da Criação.

DD-LOR-083 — Natureza Filosófica
Status: DEFINITIVO.
Cada Senhor representa uma forma distinta de distorcer a Criação.
Eles não se diferenciam apenas pelo poder, mas também pelos ideais e pela forma como corrompem o mundo.

DD-LOR-084 — Conhecimento Fragmentado
Status: DEFINITIVO.
A existência dos Sete Senhores não é conhecida com precisão pelas civilizações atuais.
Cada cultura preserva apenas parte dessa história, frequentemente misturada com mitos, lendas e interpretações religiosas.

Uma observação que considero importante
Eu não daria nomes aos Sete Senhores agora.
Fizemos isso com os Arcanjos porque eles são fundadores da cosmologia e aparecem desde a origem da Criação. Os Senhores da Corrupção, por outro lado, ainda dependem de decisões futuras sobre sua aparência, poderes, regiões, dungeons e participação nas expansões. Se dermos nomes agora, existe um risco maior de precisarmos alterá-los depois.
Minha sugestão é deixar este bloco fechado conceitualmente e criar os Sete Senhores individualmente quando começarmos a desenvolver o conteúdo de endgame e as futuras expansões. Isso mantém a Lore consistente e dá liberdade para que cada um tenha uma identidade própria quando chegar a sua vez.
BLOCO 06 — As Religiões de Elysia
Aqui eu faria algo que poucos MMORPGs fazem.
Nenhuma religião estaria completamente certa.
Mas...
Nenhuma estaria completamente errada.
Isso conversa perfeitamente com outra regra que já aprovamos:
A Fé existe.
A Certeza não.

Eu criaria quatro grandes tradições.
Não centenas.
Quatro já permitem conflitos interessantes.

1 — A Ordem da Criação
É a religião mais próxima da verdade.
Ela acredita:
existe um Criador;
existe uma Ordem;
existe o Heart;
existe a Corrupção.
Mas...
Ela também perdeu milhares de informações durante os séculos.
Nem ela conhece toda a verdade.

2 — Igreja da Luz Eterna
Essa religião acredita que:
A Luz vencerá completamente a Corrupção.
Ela coloca enorme importância nos Arcanjos.
Alguns fiéis quase os tratam como santos.
Outros acabam os tratando como deuses...
...mesmo isso sendo incorreto segundo a Lore.

3 — Os Guardiões do Heart
Essa religião acredita que:
O Heart é a própria divindade.
Eles não negam o Criador.
Mas acreditam que:
O Heart é sua manifestação perfeita.
Sabemos que isso não é verdade absoluta.
Mas é perfeitamente plausível que um povo tenha chegado a essa conclusão.

4 — Os Filhos da Liberdade
Esse grupo nasce de uma interpretação completamente diferente da Rebelião.
Eles acreditam:
O Primeiro Arcanjo Rebelde tentou libertar a Criação.
Não destruí-la.
São vistos como hereges.
Mas nem todos são necessariamente maus.
Alguns realmente acreditam estar preservando a verdadeira história.
Isso cria uma facção muito interessante.

Nenhuma delas domina o mundo.
Isso é importante.
Cada reino pode possuir uma maioria diferente.
Os anões podem seguir mais uma tradição.
Os elfos outra.
Os humanos várias.
Os orcs praticamente nenhuma.

Melhor ainda...
Dentro da própria Ordem da Criação...
...podem existir divisões.
Como acontece na história real.
Sem precisar criar novas religiões.

Outra decisão que eu tomaria
Os sacerdotes não fazem milagres porque Deus responde diretamente.
Eles manipulam o Aether.
Mas interpretam isso como bênção.
Um mago interpreta exatamente o mesmo fenômeno como magia.
Isso resolve elegantemente outra pendência da Lore:
relação entre fé e magia.

Símbolos
Também deixaria extremamente simples.
Ordem da Criação
→ um círculo envolvendo o Heart.
Luz Eterna
→ um sol estilizado.
Guardiões do Heart
→ o Heart envolto por raízes da Grande Árvore.
Filhos da Liberdade
→ uma asa quebrada.
Nenhum símbolo exagerado.
Eles precisam parecer ter milhares de anos.

Novas decisões
DD-LOR-085 — Diversidade Religiosa
Status: DEFINITIVO.
A Era Atual possui diversas tradições religiosas.
Nenhuma delas preserva integralmente a Verdade Absoluta registrada na Lore Bible.
Cada religião mantém fragmentos corretos e interpretações próprias sobre a origem da Criação, da Corrupção e dos Arcanjos.

DD-LOR-086 — Quatro Grandes Tradições
Status: DEFINITIVO.
As principais correntes religiosas conhecidas são:
Ordem da Criação;
Igreja da Luz Eterna;
Guardiões do Heart;
Filhos da Liberdade.
Outras crenças locais podem existir, mas possuem alcance regional.

DD-LOR-087 — Fé e Magia
Status: DEFINITIVO.
Os praticantes de magia e os líderes religiosos interagem com o mesmo universo sustentado pelo Aether.
A diferença está principalmente na forma como interpretam essa realidade, e não na existência de uma fonte exclusiva de poder concedida diretamente pelo Criador.

Um detalhe que eu faria questão de adicionar
Eu não transformaria os Filhos da Liberdade em uma facção automaticamente maligna.
Alguns podem, de fato, servir à Corrupção.
Outros podem apenas acreditar que a história oficial foi manipulada.
Isso cria NPCs muito mais interessantes. Um estudioso dessa tradição pode fornecer documentos importantes ao jogador, enquanto um líder fanático pode tentar libertar Noxar. Ambos pertencem à mesma corrente religiosa, mas fizeram escolhas diferentes.
Essa abordagem mantém coerência com um dos pilares centrais que já estabelecemos para Elysia: o livre-arbítrio molda os indivíduos mais do que a espécie ou a organização à qual pertencem.

BLOCO 07 — As Sete Eras da Reconstrução
Após a Primeira Rebelião...
...ninguém venceu.
Todo mundo perdeu.
A Corrupção já existia.
Impérios haviam caído.
Os Arcanjos desapareceram.
O mundo entrou numa longa reconstrução.

Primeira Era
A Era do Silêncio
Pouquíssimos sobreviventes.
As pessoas nem compreendiam o que havia acontecido.
Muitos acreditavam que os deuses haviam morrido.
Outros diziam que tudo era punição.
Foi uma época de medo.

Segunda Era
A Era das Cinzas
As primeiras cidades surgem.
Ainda pequenas.
Muros simples.
Pouca tecnologia.
As pessoas apenas tentavam sobreviver.

Terceira Era
A Era dos Reinos
Começam a surgir:
reis;
exércitos;
comércio;
estradas;
fortalezas.
Os povos deixam de apenas sobreviver.
Começam a construir civilizações.

Quarta Era
A Era dos Descobridores
Grandes expedições.
Novos continentes.
Ruínas antigas.
Primeiras guildas de aventureiros.
A exploração se torna parte da cultura.

Quinta Era
A Era das Grandes Guerras
Não contra a Corrupção.
Contra outros povos.
Isso torna o mundo mais real.
Nem toda guerra precisa envolver o fim do mundo.

Sexta Era
A Era da Reconstrução
Depois de inúmeras guerras...
Surge um longo período de prosperidade.
A maioria das grandes cidades nasce aqui.

Sétima Era
A Era Atual
É onde começa o MMORPG.
As pessoas conhecem apenas fragmentos da verdadeira história.
A Corrupção continua existindo.
Os Arcanjos são considerados lendas.
Noxar é praticamente desconhecido.

Por que isso funciona?
Porque agora você consegue colocar qualquer ruína no mapa.
Exemplo.
Uma fortaleza destruída.
O jogador pergunta:
"Quem construiu isso?"
Resposta:
Era da Reconstrução.
Outra ruína.
É muito mais antiga.
Pertence à Era das Cinzas.
Outra.
É anterior à Primeira Rebelião.
Pronto.
O mundo ganha milhares de anos de profundidade.

Heróis
Eu também faria uma mudança importante.
Em vez de cinco heróis que salvaram tudo...
Criaria centenas de heróis esquecidos.
Alguns conhecidos apenas em uma cidade.
Outros apenas em livros.
Outros tiveram suas histórias completamente distorcidas.
Isso deixa o universo muito mais crível.

Os reis
Mesmo princípio.
Não existe:
"O Grande Imperador."
Existem dezenas.
Cada reino possui seus próprios heróis.
Isso faz cada região parecer um país de verdade.

Outra ideia que gostei muito
Imagine uma missão.
Você encontra uma espada.
O NPC diz:
"Pertenceu ao Rei Aldren."
Outro NPC responde:
"Aldren nunca existiu."
Depois você encontra uma biblioteca.
Descobre que Aldren existiu...
...mas nunca foi rei.
A história foi alterada.
Isso conversa diretamente com outro princípio da Lore:
A verdade absoluta existe.
Os habitantes conhecem apenas fragmentos.

Novas decisões
DD-LOR-088 — As Eras da Reconstrução
Status: DEFINITIVO.
Após a Primeira Rebelião, a história de Elysia é marcada por sucessivas eras de reconstrução, expansão, conflitos entre reinos e redescoberta do passado.
Cada período deixa marcas permanentes na geografia, na cultura e nas civilizações da Era Atual.

DD-LOR-089 — Heróis Históricos
Status: DEFINITIVO.
A história de Elysia registra inúmeros heróis, líderes, estudiosos, exploradores e governantes.
Nenhum deles é apresentado como o único responsável pelo destino do mundo.
Cada cultura preserva seus próprios personagens históricos, frequentemente com versões conflitantes dos acontecimentos.

DD-LOR-090 — História Regional
Status: DEFINITIVO.
Cada reino desenvolve sua própria identidade histórica, incluindo guerras, dinastias, tratados, heróis e tragédias.
A história global de Elysia é formada pela soma dessas narrativas regionais, e não pela perspectiva de uma única civilização.

Uma sugestão para fortalecer ainda mais a narrativa
Eu faria uma pequena alteração na ideia das "sete eras". Em vez de tratá-las como um calendário oficial conhecido por todos os povos, elas seriam uma classificação usada apenas pela Lore Bible e por alguns grandes estudiosos.
Na prática, um anão pode dividir a história de um jeito, os elfos de outro, e os humanos terem calendários diferentes. Isso preserva a decisão já registrada de não fixar datas absolutas enquanto os calendários das raças não forem definidos e evita que todas as culturas contem o tempo exatamente da mesma forma.
Na Lore Bible, essas eras funcionam como uma ferramenta para organizar os acontecimentos históricos. Dentro do mundo, porém, elas aparecem apenas de forma fragmentada e com nomes diferentes conforme a cultura, reforçando a sensação de um mundo antigo, vasto e cheio de interpretações distintas.
BLOCO 08 — A Queda das Grandes Civilizações
Uma coisa sempre me incomodou em MMORPGs.
Você entra no jogo...
...e todas as cidades parecem ter existido desde sempre.
Não existe explicação.
Em Elysia podemos fazer diferente.

A proposta
Asteria...
não é a primeira grande cidade.
Nem a segunda.
Ela é apenas a mais recente.
Antes dela existiram dezenas.
Talvez centenas.

O Primeiro Grande Império
Logo após a reconstrução...
Surge a primeira civilização realmente poderosa.
Ela domina grande parte do continente.
Constrói:
estradas;
aquedutos;
muralhas;
fortalezas;
bibliotecas;
templos.
Durante séculos...
Parece invencível.
Até que...
desaparece.

O motivo?
Não.
Não foi "o demônio destruiu tudo".
Muito melhor.
Ela caiu pela soma de vários fatores.
guerras civis;
corrupção política;
fome;
peste;
avanço da Corrupção;
conflitos internos.
Isso faz o império parecer real.

Depois dele...
Outros impérios surgem.
Também caem.
E cada um deixa:
ruínas;
moedas;
livros;
armas;
fortalezas;
idiomas;
lendas.
É exatamente isso que alimenta um MMORPG de exploração.

Exemplo
Imagine um jogador entrando numa dungeon.
Ele encontra uma espada.
Descrição:
"Forjada durante o Segundo Império Solar."
Ele nunca ouviu falar desse império.
Anos depois...
Sai uma expansão.
O jogador finalmente visita as ruínas desse império.
Tudo já fazia sentido desde o lançamento.
Isso cria continuidade.

Asteria
Eu faria exatamente isso.
Asteria não é "a cidade mais antiga".
Muito pelo contrário.
É um símbolo da reconstrução.
Foi construída sobre as ruínas de uma cidade muito mais antiga.
Os próprios habitantes talvez nem saibam disso.

Melhor ainda...
A cidade continua crescendo.
Ela não é um cenário parado.
Conforme novas expansões surgem...
Novos bairros aparecem.
Novos distritos.
Novas muralhas.
Novos portos.
O mundo continua vivo.

Outra ideia
Eu criaria uma regra histórica.
Nenhuma grande cidade foi construída por acaso.
Toda cidade importante existe porque havia algum recurso importante.
Por exemplo.
Uma nasce perto de minas.
Outra perto de rios.
Outra protege uma passagem de montanha.
Outra controla uma rota comercial.
Isso faz o mapa inteiro parecer natural.

As ruínas
Eu também dividiria as ruínas por idade.
Ruínas Antigas
Pré-Rebelião.
Arquitetura quase impossível de reproduzir.
Cheias de Aether.
Muito perigosas.

Ruínas Imperiais
Grandes impérios humanos.
Castelos.
Templos.
Bibliotecas.

Ruínas Recentes
Fortalezas destruídas em guerras modernas.
Muito mais comuns.

O jogador começa diferenciando uma da outra apenas pela arquitetura.
Sem precisar ler um único livro.

Novas decisões
DD-LOR-091 — Civilizações Perdidas
Status: DEFINITIVO.
Antes dos reinos atuais, inúmeras civilizações floresceram e desapareceram.
Cada uma deixou contribuições próprias para a arquitetura, tecnologia, cultura e conhecimento do mundo.
Suas ruínas permanecem espalhadas por Elysia e constituem parte importante da exploração.

DD-LOR-092 — Ciclos Históricos
Status: DEFINITIVO.
A história de Elysia não é marcada por um único império dominante.
Ao longo das eras, diferentes reinos surgiram, prosperaram e entraram em declínio por razões diversas, incluindo conflitos internos, disputas políticas, desastres naturais e o avanço da Corrupção.

DD-LOR-093 — Fundação dos Reinos Atuais
Status: DEFINITIVO.
Os reinos da Era Atual foram construídos sobre os vestígios de civilizações anteriores.
A maior parte da população desconhece a verdadeira extensão desse passado, preservado apenas em ruínas, artefatos e registros fragmentados.

Uma ideia que acho que pode se tornar uma das marcas registradas de Elysia
Criar um conceito chamado "As Camadas da História".
A filosofia seria simples:
Nenhuma região do mapa existe apenas por causa do presente.
Cada floresta.
Cada castelo.
Cada montanha.
Cada caverna.
Cada cidade.
Tem pelo menos uma história anterior.
Por exemplo:
Uma igreja construída sobre um antigo templo élfico.
Um castelo erguido usando pedras de uma fortaleza anã abandonada.
Uma cidade portuária fundada sobre as ruínas de um observatório da Primeira Era.
Uma mina que, ao atingir certa profundidade, revela corredores muito mais antigos do que qualquer reino conhecido.
Isso cria um mundo em que a exploração sempre recompensa a curiosidade. Mesmo um jogador de nível alto pode voltar a uma área inicial e descobrir que ela guarda um pedaço importante da história de Elysia, porque o mapa inteiro foi construído em camadas, e não apenas como um conjunto de mapas independentes. Essa abordagem também combina perfeitamente com a diretriz da Lore Bible de que a história é reconstruída por fragmentos e de que ruínas e artefatos devem possuir posição coerente dentro da cronologia.
DD-LOR-098 — Fragmentos da Memória
Status: DEFINITIVO.
Os acontecimentos históricos de Elysia podem ser registrados em Fragmentos da Memória, ecos preservados pelo Aether que podem ser encontrados durante a exploração do mundo.
Esses fragmentos são obtidos em locais como ruínas, dungeons, bibliotecas antigas, missões, eventos, chefes e áreas secretas.
Ao serem encontrados, passam a integrar permanentemente o registro do personagem.

DD-LOR-099 — Crônicas de Elysia
Status: DEFINITIVO.
Todos os Fragmentos da Memória coletados ficam organizados em uma seção do jogo chamada Crônicas de Elysia.
As Crônicas funcionam como uma enciclopédia do universo do jogo, organizada por temas, permitindo ao jogador consultar livremente todo o conhecimento já descoberto.
Exemplos de categorias:
A Criação
O Heart
O Aether
A Corrupção
Os Arcanjos
A Primeira Rebelião
As Raças
Os Reinos
As Grandes Guerras
Relíquias
Civilizações Perdidas

DD-LOR-100 — Progressão da História
Status: DEFINITIVO.
Cada capítulo das Crônicas é composto por diversos Fragmentos da Memória.
Cada novo fragmento desbloqueia uma pequena parte da narrativa correspondente.
A história completa é construída gradualmente conforme o jogador encontra todos os fragmentos relacionados ao mesmo tema.

DD-LOR-101 — Exploração Narrativa
Status: DEFINITIVO.
A principal forma de descobrir a história de Elysia é através da exploração do mundo.
Não existem cutscenes obrigatórias ou longas exposições narrativas para apresentar os acontecimentos históricos.
O jogador monta sua compreensão da história reunindo Fragmentos da Memória ao longo de sua jornada.

DD-LOR-102 — Expansão Contínua
Status: DEFINITIVO.
Novos Fragmentos da Memória podem ser adicionados em futuras atualizações e expansões.
Isso permite aprofundar acontecimentos já conhecidos ou revelar novos aspectos da história sem alterar os registros anteriormente estabelecidos.

DD-LOR-103 — Natureza dos Registros
Status: DEFINITIVO.
Os textos presentes nas Crônicas de Elysia representam registros preservados pelo Aether e organizados pelos estudiosos do mundo.
Eles constituem a reconstrução mais completa disponível sobre determinado acontecimento, preservando o conceito de que o conhecimento histórico em Elysia é descoberto gradualmente através da exploração e da pesquisa, e não entregue integralmente ao jogador desde o início.
DD-LOR-104 — História Progressiva
Status: DEFINITIVO.
No lançamento de Elysia, apenas o início e parte da história do mundo estarão disponíveis aos jogadores.
Novos acontecimentos, personagens, civilizações e registros históricos serão revelados gradualmente através de atualizações e expansões, acompanhando a evolução do conteúdo do jogo.

DD-LOR-105 — Expansão da Lore
Status: DEFINITIVO.
A Lore de Elysia foi concebida para crescer continuamente.
Novos Fragmentos da Memória, documentos, personagens históricos e eventos poderão ser adicionados ao longo dos anos sem alterar a base da história já estabelecida.

DD-LOR-106 — Descoberta Gradual
Status: DEFINITIVO.
Os jogadores descobrirão a história do mundo aos poucos, conforme exploram novas regiões, enfrentam novos desafios e alcançam conteúdos de níveis mais elevados.
A narrativa evoluirá junto com o próprio mundo de Elysia, mantendo espaço para novas histórias e futuras expansões.
DD-LOR-107 — Cronologia Interna
Status: DEFINITIVO.
A Lore Bible mantém uma cronologia completa para uso exclusivo do desenvolvimento.
Os jogadores não terão acesso à cronologia completa no lançamento.

DD-LOR-108 — Cronologia Descoberta
Status: DEFINITIVO.
A história conhecida pelos jogadores será revelada gradualmente através da exploração, missões, livros e Fragmentos da Memória.

DD-LOR-109 — Calendário
Status: PENDENTE.
O calendário oficial de Elysia será definido futuramente.
Até essa definição, todos os acontecimentos serão organizados apenas por Eras e ordem cronológica relativa.

Acho que essa é a melhor abordagem neste momento. Ela fecha a estrutura da cronologia sem obrigar você a decidir agora detalhes como:
Ano da Criação.
Ano da Primeira Rebelião.
Ano da fundação de Asteria.
Quantos mil anos se passaram entre cada evento.
Esses números podem ser definidos mais tarde, quando o mapa, os reinos e a linha do tempo estiverem completos, evitando retrabalho. Isso também está alinhado com o próprio documento, que indica que essas datas ainda permanecem pendentes.
DD-LOR-109 — Calendário Oficial de Elysia
Status: DEFINITIVO.
O calendário oficial de Elysia é dividido em grandes Eras Históricas.
Cada Era representa uma mudança significativa na história do mundo.
Os anos absolutos serão definidos futuramente e utilizados apenas como referência interna da Lore Bible.

As Eras de Elysia
I — Antes do Tempo
Período anterior à Criação.
Somente Deus existia.

II — Era da Criação
Nascimento do Heart.
Origem do Aether.
Criação dos Arcanjos.
Formação do mundo.
Nascimento das primeiras formas de vida.

III — Era do Florescimento
Expansão da vida.
Nascimento das primeiras espécies inteligentes.
Criação da Grande Árvore da Vida.
Primeiras civilizações.

IV — Era da Prosperidade
Grande desenvolvimento das civilizações.
Expansão do conhecimento.
Ascensão dos primeiros impérios.
Longo período de equilíbrio.

V — A Primeira Rebelião
Noxar lidera a rebelião.
Tentativa de controlar o Heart.
Nascimento da Corrupção.
Queda dos rebeldes.

VI — Era da Corrupção
A Corrupção começa a se espalhar.
Nascimento dos primeiros Demônios.
Regiões inteiras são transformadas.
As primeiras grandes guerras contra a Corrupção acontecem.

VII — Era das Grandes Quedas
Diversos impérios entram em colapso.
Conhecimento é perdido.
Grandes cidades desaparecem.
Relíquias ficam soterradas.

VIII — Era da Reconstrução
Novos povos ocupam o mundo.
Surgem novos reinos.
A exploração recomeça.
As antigas ruínas voltam a ser descobertas.

IX — Era dos Reinos
Os reinos modernos são fundados.
Asteria torna-se uma das maiores cidades conhecidas.
O comércio cresce.
As grandes rotas são estabelecidas.

X — Era Atual
Período em que começa Elysia Online.
Os jogadores entram em um mundo já consolidado, marcado por séculos de história, ruínas e mistérios ainda não desvendados.

DD-LOR-110 — Contagem dos Anos
Status: DEFINITIVO.
Os anos absolutos não serão apresentados aos jogadores no lançamento.
A cronologia oficial utilizará apenas as Eras Históricas.
Caso seja necessário no futuro, um calendário detalhado poderá ser criado sem alterar a ordem dos acontecimentos já estabelecida.

Eu também faria uma observação para a própria equipe de desenvolvimento:
As Eras são um recurso de organização da Lore Bible, não uma obrigação para todas as civilizações do jogo. Cada reino, raça ou religião pode possuir seu próprio calendário, enquanto a equipe utiliza essa cronologia mestra para manter todos os eventos, NPCs, ruínas e expansões consistentes.
DD-LOR-111 — Origem dos Humanos
Status: DEFINITIVO.
Os Humanos surgiram durante a Era do Florescimento e espalharam-se gradualmente pelo continente.
Sua origem exata pertence à história antiga e será aprofundada em futuras expansões da Lore.

DD-LOR-112 — Civilizações Humanas
Status: DEFINITIVO.
Diversas civilizações humanas existiram antes dos reinos atuais.
Muitas desapareceram ao longo das Eras, deixando apenas ruínas, artefatos e registros incompletos.

DD-LOR-113 — Reinos Atuais
Status: DEFINITIVO.
No início de Elysia Online, os Humanos já vivem organizados em reinos estabelecidos.
Esses reinos possuem culturas, interesses e conflitos próprios, mas compartilham uma longa herança histórica.

DD-LOR-114 — Asteria
Status: DEFINITIVO.
Asteria é uma das cidades humanas mais importantes da Era Atual.
Embora seja um grande centro político, econômico e cultural, não é a cidade mais antiga do mundo nem o berço da humanidade.

Essas decisões resolvem várias pendências do capítulo sem obrigar você a definir agora:
o primeiro rei;
a primeira capital;
todos os impérios humanos;
todas as guerras;
toda a política dos reinos.
Esses detalhes podem ser desenvolvidos quando cada reino ganhar seu próprio documento, mantendo a Lore Bible consistente com a decisão de expandir a história gradualmente.
DD-LOR-115 — Organização dos Reinos Humanos
Status: DEFINITIVO.
Os Humanos estão organizados em diversos reinos independentes.
Cada reino possui sua própria cultura, governo, tradições, forças militares e instituições.
Esses detalhes serão documentados individualmente quando cada reino receber seu próprio capítulo na Lore Bible.

Essa decisão elimina várias pendências de uma vez sem obrigar a inventar nomes, reis, bandeiras ou capitais antes da etapa de criação do mundo. Quando começarmos o documento World Bible, poderemos desenvolver cada reino com muito mais consistência.
DD-LOR-116 — Instituições Humanas
Status: DEFINITIVO.
Todos os grandes reinos humanos possuem instituições responsáveis pela formação e organização de seus cidadãos, como exércitos, academias, templos e guildas.
Cada instituição será documentada individualmente quando seu reino for desenvolvido.

DD-LOR-117 — Diversidade Cultural
Status: DEFINITIVO.
Os reinos humanos não compartilham uma única cultura.
Cada reino desenvolveu seus próprios costumes, arquitetura, tradiões, organização militar e forma de governo ao longo da história.

DD-LOR-118 — Religião nos Reinos
Status: DEFINITIVO.
Nenhuma religião domina todo o mundo humano.
Cada reino pode favorecer determinadas tradições religiosas, mantendo a diversidade de crenças já estabelecida na Lore.

DD-LOR-119 — Organizações das Classes
Status: DEFINITIVO.
Knights, Sorcerers, Archers e Assassins podem pertencer a diferentes organizações conforme o reino em que vivem.
Não existe uma única ordem mundial para cada classe.

DD-LOR-120 — Conflitos Humanos
Status: DEFINITIVO.
Os reinos humanos podem cooperar ou entrar em conflito por motivos políticos, econômicos, territoriais ou religiosos.
Esses conflitos fazem parte da história do mundo e independem da existência da Corrupção.

Essas decisões eliminam praticamente todas as pendências do capítulo dos Humanos sem prender o projeto a nomes ou eventos específicos.
Próximo grande bloco
Depois disso, o documento passa a depender principalmente da criação do World Bible. As pendências restantes deixam de ser regras e passam a ser conteúdo, por exemplo:
Nome dos reinos.
Capitais.
Cidades.
Vilas.
Castelos.
Geografia.
Línguas.
Personagens históricos.
Grandes guerras.
Na minha avaliação, depois de fecharmos essas decisões gerais, a Lore Bible estará praticamente concluída em termos de estrutura. O restante será preencher o mundo com conteúdo seguindo essas regras, em vez de continuar definindo novos sistemas.
DD-LOR-121 — Povos Livres
Status: DEFINITIVO.
Os Povos Livres compartilham uma origem comum na Criação, mas desenvolveram culturas, tradições e histórias independentes ao longo das Eras.
A história individual de cada povo será documentada em capítulos próprios.

DD-LOR-122 — Reinos Antigos
Status: DEFINITIVO.
Antes dos reinos atuais existiram diversos reinos e impérios que desapareceram.
Esses reinos antigos são responsáveis pela maior parte das ruínas, artefatos e conhecimentos perdidos encontrados pelos jogadores.

DD-LOR-123 — Conhecimento Perdido
Status: DEFINITIVO.
Grande parte da história antiga foi perdida durante as Grandes Quedas.
Nenhuma civilização moderna possui registros completos sobre a origem do mundo.

DD-LOR-124 — Ruínas
Status: DEFINITIVO.
Cada grande ruína existente em Elysia pertence a uma civilização, reino ou império antigo.
Nenhuma dungeon importante existirá sem uma justificativa histórica dentro da Lore.

DD-LOR-125 — Artefatos
Status: DEFINITIVO.
Artefatos antigos são fragmentos da história do mundo.
Além de seu valor material, podem revelar informações sobre civilizações desaparecidas, guerras antigas e personagens históricos.

DD-LOR-126 — Expansões
Status: DEFINITIVO.
Toda expansão oficial deverá respeitar a cronologia já estabelecida pela Lore Bible.
Novos continentes, povos, reinos e personagens poderão ser adicionados, desde que ampliem a história sem contradizer os acontecimentos já definidos.

Situação da Lore
Depois dessas decisões, considero que a estrutura da Lore Bible está praticamente encerrada.
Restam apenas documentos de desenvolvimento de conteúdo, como:
História dos Humanos.
História dos Elfos.
História dos Anões.
História dos Orcs.
História de cada Reino.
Grandes Guerras.
Biografia de personagens importantes.
Livros encontrados no mundo.
Relíquias famosas.
Esses documentos não criam novas regras; apenas preenchem o universo seguindo a base já definida.
Na minha opinião, a próxima etapa mais produtiva é iniciar a World Bible. Ela será responsável por transformar toda essa lore em um mundo jogável: continentes, mapa, reinos, cidades, vilas, estradas, biomas, rios, montanhas, castelos e dungeons. A partir desse ponto, praticamente todo o restante do conteúdo do jogo passa a ter um lugar físico dentro de Elysia.
DD-LOR-127 — Reputação entre Povos
Status: DEFINITIVO.
A relação entre Humanos, Elfos, Anões e Orcs será determinada por um Sistema de Reputação.
Nenhum povo será automaticamente aliado ou inimigo de outro.
As relações poderão variar conforme o reino, cidade, facção ou período histórico.

DD-LOR-128 — Profissões
Status: DEFINITIVO.
Profissões pertencem ao personagem e não à raça.
Qualquer Humano poderá exercer qualquer profissão disponível, desde que cumpra seus requisitos.

DD-LOR-129 — Guildas
Status: DEFINITIVO.
Guildas são organizações criadas pelos jogadores e existem independentemente da raça.
As regras completas serão definidas na Guild Bible.

DD-LOR-130 — Habitação
Status: DEFINITIVO.
Casas, fortalezas e construções pertencem ao sistema de Habitação.
A raça humana não recebe vantagens específicas relacionadas à propriedade.

DD-LOR-131 — Aparência
Status: DEFINITIVO.
A personalização visual dos Humanos será documentada na Character Creation Bible.
A Lore não estabelece limites técnicos de aparência, altura, cabelos, rostos ou tatuagens.

DD-LOR-132 — Identidade do Personagem
Status: DEFINITIVO.
Classe, raça e sexo não determinam personalidade.
A identidade do personagem é construída pelas escolhas do jogador ao longo da jornada.

DD-LOR-133 — Papel do Jogador
Status: DEFINITIVO.
O jogador inicia sua história como um habitante comum de Elysia.
Sua importância no mundo será consequência de suas ações, e não de uma profecia, linhagem especial ou destino predeterminado.

Resultado
Com essas decisões, praticamente todas as pendências listadas no Capítulo 12 ficam resolvidas ou corretamente transferidas para documentos específicos (World Bible, Character Creation Bible, Guild Bible e afins).
DD-LOR-127 — Idioma Comum
Status: DEFINITIVO.
Todos os Povos Livres utilizam um único idioma comum para comunicação.
Esse idioma é utilizado em conversas, livros, documentos, comércio, diplomacia e interações entre os diferentes povos.

DD-LOR-128 — Variações Culturais
Status: DEFINITIVO.
Embora todos utilizem o mesmo idioma, cada povo e cada reino desenvolveu seus próprios costumes, tradições, arquitetura, vestimentas e expressões culturais.
A identidade cultural não depende da existência de idiomas diferentes.

DD-LOR-129 — Relações entre Povos
Status: DEFINITIVO.
Humanos, Elfos, Anões e Orcs não são aliados nem inimigos por definição.
As relações entre eles dependem da história, da política, da reputação e dos acontecimentos de cada região.

DD-LOR-130 — Profissões
Status: DEFINITIVO.
Profissões pertencem ao personagem, não à raça.
Qualquer membro dos Povos Livres pode exercer qualquer profissão, desde que cumpra seus requisitos.

DD-LOR-131 — Guildas
Status: DEFINITIVO.
Guildas são organizações independentes da raça.
Podem aceitar membros de diferentes povos conforme suas próprias regras.

DD-LOR-132 — Habitação
Status: DEFINITIVO.
Casas, fortalezas e propriedades pertencem aos sistemas de Habitação e Mundo.
Nenhuma raça possui privilégios naturais sobre esse sistema.

DD-LOR-133 — Identidade do Personagem
Status: DEFINITIVO.
Raça, classe e sexo não determinam personalidade, alinhamento moral ou papel na sociedade.
Cada personagem constrói sua própria história através de suas escolhas.

Essa versão também elimina a pendência "Idiomas e dialetos" do capítulo dos Humanos. Em vez de criar quatro idiomas, dezenas de traduções e problemas para quests, NPCs e livros, todo o mundo compartilha um Idioma Comum, enquanto a diversidade é representada pela cultura de cada povo. Isso simplifica bastante o desenvolvimento e mantém o foco nas diferenças realmente importantes entre as civilizações.

DD-LOR-134 — Convivência entre os Povos Livres
Status: DEFINITIVO.
Humanos, Elfos, Anões e Orcs coexistem no mundo de Elysia.
A convivência pode ser pacífica, neutra ou hostil, dependendo da região, da política local e dos acontecimentos históricos.
Não existe uma relação universal válida para todo o mundo.

DD-LOR-135 — Fronteiras
Status: DEFINITIVO.
Os reinos mantêm fronteiras reconhecidas, mas elas podem mudar ao longo da história devido a guerras, tratados, exploração ou expansão territorial.

DD-LOR-136 — Cultura Regional
Status: DEFINITIVO.
A identidade dos habitantes é determinada principalmente pela região onde vivem.
Dois Humanos de reinos diferentes podem possuir costumes mais distintos entre si do que um Humano e um Anão que viveram durante gerações na mesma região.

DD-LOR-137 — Conhecimento Compartilhado
Status: DEFINITIVO.
O conhecimento circula entre os povos por meio de viajantes, comerciantes, estudiosos, exploradores e livros.
Nenhum povo detém exclusividade sobre o conhecimento comum do mundo.

DD-LOR-138 — Leis
Status: DEFINITIVO.
Cada reino estabelece suas próprias leis.
Crimes, punições, impostos, comércio e direitos podem variar conforme a autoridade local.

DD-LOR-139 — Neutralidade da Lore
Status: DEFINITIVO.
A Lore Bible descreve os acontecimentos históricos de forma neutra.
Os julgamentos morais pertencem aos personagens, religiões, povos e facções do mundo, e não à documentação oficial.
DD-LOR-140 — Mundo Independente
Status: DEFINITIVO.
O mundo de Elysia existe independentemente da presença dos jogadores.
Civilizações, povos, conflitos e acontecimentos seguem seu curso mesmo sem a participação do personagem.

DD-LOR-141 — O Jogador Não Altera a História Antiga
Status: DEFINITIVO.
Os acontecimentos históricos registrados na Lore Bible são imutáveis.
Os jogadores influenciam apenas os eventos do presente e do futuro.

DD-LOR-142 — Continuidade Narrativa
Status: DEFINITIVO.
Nenhuma atualização oficial apagará ou substituirá eventos já estabelecidos.
Expansões ampliam a história existente sem reescrever acontecimentos anteriores.

DD-LOR-143 — Mundo Coerente
Status: DEFINITIVO.
Todo elemento importante do jogo deve possuir justificativa dentro do universo.
Isso inclui:
cidades;
castelos;
dungeons;
ruínas;
facções;
monstros;
bosses;
artefatos;
magias.
Nada relevante será inserido apenas por conveniência de gameplay.

DD-LOR-144 — Expansão Contínua
Status: DEFINITIVO.
A Lore foi projetada para crescer continuamente.
Novos continentes, povos, personagens, conflitos e regiões podem ser adicionados futuramente sem romper a consistência do universo.

DD-LOR-145 — Documento Canônico
Status: DEFINITIVO.
A Lore Bible é a fonte oficial da história de Elysia.
Em caso de conflito entre documentos, a Lore Bible prevalece para todos os aspectos narrativos.

Primeira lacuna encontrada
Capítulo 22
PENDENTE 02 — Multiplicador de dano contra fraqueza.
Proposta
DD-ELEM-004 — Multiplicador de Fraqueza
Status: PROPOSTA
Quando um ataque atingir a fraqueza elemental de uma criatura, o dano recebe um multiplicador fixo de:
+25% de dano (1,25x).
Justificativa
É suficiente para recompensar quem conhece o bestiário.
Não torna obrigatório usar sempre o elemento correto.
Mantém builds físicas competitivas.
Facilita o balanceamento de PvE e PvP.
Próxima lacuna
Capítulo 22
PENDENTE 03 — Escala exata D1–D6.
Hoje já existe o conceito D1–D6 aprovado, mas falta definir exatamente o que representa cada nível.
Proposta
DD-WORLD-007 — Escala Oficial de Dificuldade D1–D6
Status: PROPOSTA
A classificação D1–D6 representa a dificuldade ambiental de cada região.
Escala
Descrição
D1
Região muito segura. Criaturas pouco agressivas e baixo risco.
D2
Região de baixo risco. Ideal para aventureiros iniciantes.
D3
Região de risco moderado. Exige equipamentos e preparo adequados.
D4
Região perigosa. Monstros fortes e possibilidade de morte elevada.
D5
Região extremamente perigosa. Recomendada apenas para jogadores experientes ou grupos.
D6
Região letal. Conteúdo de maior dificuldade do jogo, com bosses, criaturas excepcionais ou áreas profundamente corrompidas.
Observações
A classificação mede o risco da região, não o nível do jogador.
Um mesmo bioma pode possuir áreas D2 e áreas D5.
A dificuldade é determinada pelo conjunto da região (criaturas, ambiente, chefes e perigos), e não apenas pelo HP dos monstros.

Essa proposta mantém compatibilidade com as decisões já aprovadas de que bioma não determina nível e que a dificuldade é definida pela população e profundidade da região, não por barreiras artificiais.
Capítulo 22
PENDENTE 04 — Critérios numéricos para classificar uma região em cada dificuldade.
Hoje sabemos o que significa D1–D6, mas ainda não existe uma regra objetiva para que um designer classifique uma nova região.
DD-WORLD-008 — Critérios de Classificação D1–D6
Status: PROPOSTA
A classificação de uma região deve considerar o conjunto dos fatores abaixo, e não apenas o nível dos monstros.
Critérios
1. Poder médio das criaturas
Dano.
Resistência.
Habilidades especiais.
2. Densidade de monstros
Quantidade de criaturas por área.
Frequência de patrulhas.
Tempo de respawn.
3. Agressividade
Distância de perseguição.
Quantidade de criaturas que atacam em conjunto.
Comportamentos sociais.
4. Complexidade mecânica
Controle de grupo.
Veneno.
Sangramento.
Atordoamento.
Invocações.
Cura.
Fuga.
Buffs.
5. Ambiente
Armadilhas naturais.
Terreno difícil.
Baixa visibilidade.
Riscos ambientais.
6. Chefes locais
Existência de Mini Bosses.
MVPs.
Bosses Globais.
Bosses Míticos.

Regras
Nenhum fator isolado determina a dificuldade.
Exemplos:
Uma floresta com monstros fracos, porém extremamente numerosos, pode ser D3.
Uma caverna com poucas criaturas, mas extremamente letais, pode ser D5.
Um pântano com monstros médios, veneno constante e terreno difícil pode ser D4.

Objetivo
Garantir que a classificação D1–D6 seja consistente durante todo o desenvolvimento.
Qualquer designer que criar uma nova região deverá utilizar esses critérios antes de definir sua dificuldade.

Na minha opinião, essa decisão é importante porque transforma o D1–D6 em uma ferramenta de design, e não apenas em uma descrição subjetiva. Ela reduz inconsistências quando novas regiões forem criadas no futuro.
Próxima lacuna
Capítulo 22
PENDENTE 05 — Relação final entre D1–D6 e os Tiers posteriormente usados no Bestiário.
Esta é uma decisão importante porque conecta o World Bible ao Monster Bible.
DD-BEST-008 — Independência entre Dificuldade da Região e Tier da Criatura
Status: PROPOSTA
A classificação D1–D6 e o Tier da criatura representam conceitos diferentes e não possuem correspondência obrigatória.
Definições
D1–D6
Mede a dificuldade geral de uma região.
Tier
Mede a força relativa de uma espécie dentro do Bestiário.

Regras
Uma região pode conter criaturas de diferentes Tiers.
Exemplos:
Uma floresta D2 pode possuir:
Slimes (Tier I)
Lobos (Tier II)
Um Lobo Alfa MVP (Tier V)
Uma masmorra D5 pode conter:
Criaturas Tier III
Criaturas Tier IV
Criaturas Tier V
Um Boss Global Tier VII
Da mesma forma, uma criatura Tier III pode aparecer em regiões D3 ou D4, dependendo da composição da região e do papel que exerce naquele ecossistema.

Objetivo
Separar dois sistemas que possuem finalidades distintas:
Dificuldade da região orienta exploração e progressão do mundo.
Tier da criatura orienta balanceamento, IA, loot, atributos e evolução do Bestiário.
Essa separação evita problemas comuns em MMORPGs, onde a força de um monstro fica rigidamente presa ao mapa em que ele aparece.

Benefícios
Permite reutilizar espécies em diferentes regiões de forma coerente.
Facilita a criação de variantes, elites e eventos.
Dá mais liberdade para o design de dungeons e bosses.
Mantém o World Bible e o Monster Bible desacoplados, reduzindo retrabalho quando novos Tiers forem adicionados.
Na minha opinião, essa é a arquitetura mais robusta, porque impede que uma mudança no sistema de Tiers obrigue a reclassificar todo o mapa do jogo.

Próxima lacuna
Capítulo 22
PENDENTE 06 — Casos específicos de imunidade.
Já foi aprovado que resistência ≠ imunidade e que imunidades devem ser raras. Falta definir quando elas são permitidas.
DD-ELEM-005 — Critérios para Imunidade
Status: PROPOSTA
Uma criatura só pode possuir imunidade quando existir justificativa biológica, mágica ou narrativa clara.
Casos permitidos
Criaturas totalmente constituídas pelo elemento.
Ex.: Elemental de Fogo imune a Fogo.
Entidades incorpóreas ou espirituais.
Ex.: Fantasmas imunes a Sangramento.
Criaturas cuja anatomia torna determinado efeito impossível.
Ex.: Esqueletos imunes a Veneno.
Bosses com imunidades temporárias durante fases específicas do combate.
Casos proibidos
Imunidade apenas para aumentar artificialmente a dificuldade.
Imunidade sem explicação na Lore ou na biologia da criatura.
Criaturas comuns acumulando diversas imunidades.
Regra Geral
Sempre que possível, utilizar alta resistência em vez de imunidade total.
A imunidade é uma exceção de design, não uma ferramenta de balanceamento.

Essa decisão complementa diretamente os DD-ELEM-002 e DD-ELEM-003 já aprovados e estabelece um critério objetivo para todas as futuras famílias do Bestiário, evitando que imunidades sejam distribuídas de forma arbitrária.
Próxima lacuna
Capítulo 22
PENDENTE 07 — Afinidades de cada espécie.
Em vez de definir afinidade criatura por criatura (o que pertence ao Bestiário), acho importante fechar primeiro uma regra global.

DD-ELEM-006 — Afinidade Elemental das Espécies
Status: PROPOSTA
Toda espécie do Bestiário possui uma afinidade elemental principal.
Essa afinidade representa sua natureza mágica ou biológica predominante e influencia seus atributos, habilidades, resistências e fraquezas.
Regras
Uma espécie possui apenas uma afinidade principal.
Afinidades secundárias são exceções e devem existir apenas quando houver justificativa clara de gameplay e lore.
A afinidade de uma espécie permanece constante em todas as suas variantes naturais.
Exemplos
Slime Vermelho → Fogo.
Slime Azul → Água.
Elemental de Terra → Terra.
Fantasma → Sombrio.
Espírito de Luz → Luz.
Já um Lobo Cinzento continua sendo Físico, mesmo que viva em uma região congelada.
Da mesma forma, um Javali não se torna Terra apenas por viver em uma montanha.

Objetivo
Separar a natureza da criatura do ambiente onde ela vive.
Isso evita inconsistências como:
Lobos de fogo surgindo apenas porque vivem em um vulcão.
Ursos de gelo existindo apenas porque vivem em regiões frias.
Monstros mudando de elemento conforme o mapa.
Mudanças de afinidade devem ocorrer apenas quando houver uma transformação real, como:
Corrupção.
Evolução.
Mutação.
Magia permanente.
Criação artificial.

Benefícios
O Bestiário fica muito mais consistente.
Facilita o balanceamento de elementos.
Evita criar dezenas de variantes artificiais da mesma espécie.
Fortalece a identidade visual e mecânica de cada criatura.

Na minha opinião, essa decisão é uma das mais importantes do sistema elemental, porque define que o elemento pertence à espécie, e não ao mapa, evitando uma explosão desnecessária de variantes e mantendo a coerência do Bestiário.
Próxima lacuna
Capítulo 22
PENDENTE 08 — Fraquezas individuais de cada espécie.
Assim como fizemos com as afinidades, acho melhor definir primeiro uma regra estrutural antes de preencher o Bestiário.

DD-ELEM-007 — Fraquezas Elementais
Status: PROPOSTA
Toda espécie pode possuir zero ou uma fraqueza elemental principal.
A fraqueza representa o elemento ao qual a criatura é naturalmente mais vulnerável.
Regras
A fraqueza deve possuir justificativa lógica, biológica ou mágica.
A fraqueza normalmente decorre da afinidade principal da criatura, mas não precisa seguir uma tabela rígida.
Nem todas as criaturas precisam possuir uma fraqueza.
Exemplos
Um Elemental de Fogo pode ser fraco contra Água.
Um Espírito Sombrio pode ser fraco contra Luz.
Um Slime Verde (Físico) pode não possuir fraqueza elemental definida.
Um Dragão Ancestral pode não possuir qualquer fraqueza natural.

Casos especiais
Algumas criaturas podem ter sua fraqueza descoberta apenas após estudo no Bestiário ou por observação do jogador.
Isso permite criar encontros em que descobrir a vulnerabilidade faz parte da progressão, sem depender apenas de números.

Regra de Balanceamento
Fraquezas existem para criar oportunidades táticas, e não para tornar uma criatura obrigatoriamente fácil.
Mesmo explorando a fraqueza correta, o jogador ainda deve respeitar a mecânica do combate.

Objetivo
Evitar que todas as criaturas sejam obrigadas a entrar em uma "roda de elementos" fixa.
Cada espécie pode ser construída de forma independente, desde que permaneça coerente com sua identidade, lore e função dentro do Bestiário.

Na minha opinião, essa decisão dá bastante liberdade para o design. Em vez de forçar uma tabela universal onde todo elemento sempre tem um oposto, você pode definir vulnerabilidades caso a caso, tornando o Bestiário mais variado e menos previsível.
Próxima lacuna
Capítulo 22
PENDENTE 09 — Resistências individuais de cada espécie.
Assim como nas afinidades e fraquezas, vale a pena definir uma regra geral antes de preencher o Bestiário.

DD-ELEM-008 — Resistências Elementais das Espécies
Status: PROPOSTA
Toda espécie pode possuir zero, uma ou mais resistências elementais, desde que cada resistência tenha justificativa biológica, mágica ou narrativa.
Regras
Resistência representa uma redução de dano, não imunidade.
Uma espécie pode possuir múltiplas resistências quando sua natureza justificar.
Resistências devem refletir a identidade da criatura, e não apenas o bioma onde ela vive.
Quanto maior o número de resistências de uma espécie, maior deve ser a preocupação com seu balanceamento.
Exemplos
Elemental de Fogo → alta resistência a Fogo.
Esqueleto → resistência a Veneno.
Golem de Pedra → resistência a Terra e dano físico.
Espírito de Luz → resistência a Luz.
Dragão Ancestral → várias resistências, mas não necessariamente imunidades.

Casos especiais
Criaturas únicas, Bosses, Bosses Globais e Bosses Míticos podem possuir um conjunto mais amplo de resistências para reforçar sua identidade e tornar o combate mais estratégico.

Regra de Balanceamento
As resistências devem incentivar o jogador a adaptar sua estratégia, mas nunca tornar uma criatura obrigatoriamente inviável para determinadas builds.
Sempre que possível, o desafio deve surgir da combinação entre mecânicas, posicionamento e atributos, e não apenas de reduções extremas de dano.

Objetivo
Padronizar a criação das espécies do Bestiário e manter coerência entre lore, identidade visual e mecânica de combate.

Na minha avaliação, essa decisão fecha o tripé do sistema elemental:
DD-ELEM-006 → Afinidade.
DD-ELEM-007 → Fraqueza.
DD-ELEM-008 → Resistências.
Com essas três regras aprovadas, o preenchimento das fichas individuais do Bestiário passa a seguir um padrão consistente, em vez de ser decidido caso a caso.
Próxima lacuna
Capítulo 22
PENDENTE 10 — Progressão definitiva do Bestiário de MVP.
Já foi aprovado que MVPs possuem uma progressão própria e que o primeiro abate revela aproximadamente 50% das informações, mas ainda não foi definido como essa progressão funciona.

DD-BEST-009 — Progressão do Bestiário de MVP
Status: PROPOSTA
O Bestiário dos MVPs evolui em múltiplos marcos de conhecimento, refletindo o estudo contínuo da criatura.
Estrutura
1º Abate
Identificação da criatura.
Descrição básica.
Aproximadamente 50% das informações disponíveis.
Registro da primeira vitória.
Abates Intermediários
Expansão gradual do conhecimento.
Comportamentos adicionais.
Habilidades observadas.
Resistências e fraquezas confirmadas.
Informações ecológicas e históricas.
Conclusão do Bestiário
Todas as informações liberadas.
Lore completa disponível.
Estatísticas totalmente registradas.
Registro permanente da conclusão da pesquisa.

Regras
Encontrar um MVP não registra automaticamente seu Bestiário.
Apenas derrotas válidas contribuem para a progressão.
O progresso é permanente e vinculado ao personagem.

Objetivo
Transformar o Bestiário dos MVPs em um sistema de pesquisa de longo prazo, incentivando múltiplos confrontos em vez de concentrar todo o conhecimento em uma única vitória.

Essa decisão complementa diretamente os DD-BEST-005, DD-BEST-006 e DD-BEST-007, definindo a estrutura de evolução do Bestiário sem fixar, por enquanto, a quantidade exata de abates necessária para cada marco. Essa quantidade pode ser balanceada posteriormente conforme os testes de jogo.
Próxima lacuna
Capítulo 22
PENDENTE 11 — Progressão específica de Boss Global.
Os Bosses Globais são muito mais raros que MVPs. Por isso, sua progressão no Bestiário não pode depender de dezenas de derrotas.

DD-BEST-010 — Progressão do Bestiário de Boss Global
Status: PROPOSTA
O Bestiário dos Bosses Globais utiliza uma progressão reduzida, baseada na raridade desses encontros.
Estrutura
Primeiro Encontro
Nome da criatura.
Silhueta revelada.
Pequena descrição.
Registro da descoberta.
Primeira Derrota
Grande parte das informações é desbloqueada.
Habilidades observadas.
Resistências e fraquezas conhecidas.
Registro da primeira vitória.
Derrotas Posteriores
Complementam informações de lore.
Curiosidades.
Ecologia.
Histórico de aparições.
Estatísticas completas.

Regras
Apenas participar do combate não completa automaticamente o registro.
A derrota do Boss é o principal marco de progressão.
Como Bosses Globais aparecem com pouca frequência, o número de etapas deve ser reduzido em comparação aos MVPs.

Objetivo
Garantir que o Bestiário continue sendo recompensador sem exigir um número irreal de derrotas de criaturas extremamente raras.

Essa proposta mantém a filosofia já adotada no restante do Bestiário: quanto mais rara a criatura, menos repetição é exigida para completar seu registro, preservando o valor da descoberta e evitando progressões excessivamente longas.
Próxima lacuna
Capítulo 22
PENDENTE 12 — Progressão específica de Boss Mítico.
Os Bosses Míticos representam o conteúdo mais raro e importante do jogo. Por isso, o Bestiário deve valorizar a descoberta, sem exigir repetidas derrotas de encontros extremamente escassos.

DD-BEST-011 — Progressão do Bestiário de Boss Mítico
Status: PROPOSTA
O Bestiário dos Bosses Míticos é baseado principalmente na descoberta e na primeira vitória, não na repetição.
Estrutura
Descoberta
Ao encontrar um Boss Mítico pela primeira vez, o jogador desbloqueia:
Nome.
Silhueta.
Pequena descrição.
Registro da descoberta.
Primeira Derrota
Ao derrotá-lo pela primeira vez, o Bestiário é praticamente concluído, liberando:
Aparência completa.
História.
Ecologia.
Habilidades conhecidas.
Resistências e fraquezas.
Curiosidades.
Registro da primeira vitória.
Derrotas Futuras
Derrotas adicionais não desbloqueiam novas informações obrigatórias do Bestiário.
Podem apenas atualizar estatísticas pessoais, como:
Número de derrotas.
Data da primeira vitória.
Melhor tempo.
Outros registros opcionais.

Regras
Cada Boss Mítico possui apenas uma entrada no Bestiário.
O progresso é permanente e vinculado ao personagem.
A raridade do encontro substitui a necessidade de repetição.

Objetivo
Preservar o impacto narrativo e a exclusividade dos Bosses Míticos, evitando que o jogador precise derrotar diversas vezes uma criatura concebida para ser um evento excepcional.

Benefícios
Valoriza a primeira conquista.
Evita grind artificial em conteúdo extremamente raro.
Mantém a coerência entre a raridade do encontro e a progressão do Bestiário.
Diferencia claramente o tratamento de criaturas comuns, MVPs, Bosses Globais e Bosses Míticos.

Com essa decisão, todas as pendências do Capítulo 22 ficam resolvidas. O documento pode ser considerado completamente consolidado, e a sequência natural do GDD segue para o Capítulo 23 — Bestiário V1: Catálogo, Famílias e Organização das Criaturas, onde começam as definições estruturais das 27 famílias de monstros e, posteriormente, o balanceamento numérico
Início do Capítulo 23
PENDENTE 01 — Distribuir as criaturas pelos Tiers.
Antes de distribuir as 27 famílias, falta uma regra de organização que o documento ainda não define.

DD-MON-015 — Distribuição de Espécies entre os Tiers
Status: PROPOSTA
Os Tiers representam a força relativa de cada criatura, e não sua importância narrativa, raridade ou localização.
Regras
Uma mesma família pode ocupar diferentes Tiers através de espécies distintas.
Exemplo
Família Slimes:
Slime Verde → Tier I
Slime Azul → Tier II
Slime Vermelho → Tier III
Slime Ancião → Tier V
Família Lobos:
Lobo Cinzento → Tier II
Lobo Negro → Tier III
Lobo Alfa → Tier V (MVP)

Regras adicionais
Nem toda família precisa possuir representantes em todos os Tiers.
Famílias pequenas podem existir apenas em um ou dois Tiers.
Famílias importantes podem abranger quase toda a progressão do jogo.
A distribuição deve respeitar a identidade da família, evitando criar evoluções artificiais apenas para preencher lacunas.

Objetivo
Criar uma progressão natural do Bestiário, permitindo que famílias cresçam organicamente sem obrigar todas a seguirem a mesma estrutura.

Benefícios
Evita inflação de espécies desnecessárias.
Mantém a identidade de cada família.
Facilita futuras expansões.
Preserva a liberdade de balanceamento aprovada nos DD anteriores.

Essa decisão serve como base para a próxima etapa, em que cada uma das 27 famílias será posicionada dentro da régua de Tiers de forma consistente, sem exigir que todas tenham exatamente a mesma quantidade de representantes.
Próxima lacuna
Capítulo 23
PENDENTE 02 — Definir criatura-base do Tier I.
Embora o Capítulo 24 utilize o Slime Verde como referência de balanceamento, ainda falta consolidá-lo oficialmente como a criatura-base de todo o sistema de Tiers.

DD-MON-016 — Criatura-Base do Tier I
Status: PROPOSTA
O Slime Verde será a criatura-base oficial do Tier I.
Todas as demais criaturas do Bestiário serão balanceadas tomando o Slime Verde como referência inicial.

Funções da criatura-base
O Slime Verde define a referência para:
HP.
Dano.
Defesa.
Velocidade.
XP.
Tempo médio de combate.
Relação risco × recompensa.

Regras
O Slime Verde não precisa ser o monstro mais fraco do jogo, apenas a principal referência de balanceamento do Tier I.
Outras criaturas Tier I podem ser mais rápidas, mais resistentes ou causar mais dano, desde que apresentem compensações equivalentes.
O balanceamento não será feito copiando atributos, mas utilizando o Slime Verde como ponto inicial da curva.

Objetivo
Estabelecer uma única referência para o balanceamento de todas as criaturas do jogo.
Ao criar uma nova espécie, o designer primeiro compara seu desempenho com o Slime Verde e, a partir dessa base, ajusta seus atributos conforme sua identidade.

Benefícios
Padroniza o processo de criação de monstros.
Evita inconsistências entre diferentes famílias.
Facilita o escalonamento dos Tiers superiores.
Permite rebalancear todo o Bestiário alterando apenas a curva-base, sem recriar cada espécie individualmente.

Essa decisão formaliza o papel que o Slime Verde já exerce no Capítulo 24, transformando-o oficialmente na âncora de balanceamento de todo o Bestiário.
Próxima lacuna
Capítulo 23
PENDENTE 03 — Criar curva de HP.
Antes de definir valores exatos para cada criatura, é importante estabelecer uma regra de crescimento para evitar inflação de atributos.

DD-BAL-013 — Curva Base de HP dos Tiers
Status: PROPOSTA
O HP das criaturas deve crescer de forma progressiva e controlada entre os Tiers, evitando saltos excessivos.
Regras
Cada Tier possui uma faixa de HP de referência.
As faixas podem se sobrepor parcialmente para permitir criaturas com identidades diferentes.
O HP nunca será o único fator que define a dificuldade de um monstro.
Exemplo
Um monstro com pouco HP pode compensar com:
Alto dano.
Grande mobilidade.
Alta esquiva.
Controle de grupo.
Habilidades especiais.
Da mesma forma, uma criatura com muito HP pode causar pouco dano e servir como "tanque".

Balanceamento
A curva de HP deve permanecer relativamente estável nos primeiros Tiers e crescer de forma mais perceptível nos Tiers superiores.
Isso evita que monstros de níveis intermediários se tornem esponjas de dano ("bullet sponge") e preserva um ritmo de combate consistente.

Objetivo
Criar uma base matemática que permita escalar todo o Bestiário sem perder coerência entre famílias e identidades.
Os valores absolutos de HP serão definidos posteriormente durante o balanceamento numérico, utilizando essa curva como referência.

Benefícios
Evita inflação de HP.
Mantém o combate dinâmico.
Facilita o rebalanceamento futuro.
Permite que a identidade da criatura tenha mais peso do que apenas sua quantidade de vida.

Essa decisão prepara o terreno para a próxima pendência, que tratará da curva de dano, permitindo construir uma progressão numérica consistente para todo o Bestiário.
Próxima lacuna
Capítulo 23
PENDENTE 04 — Criar curva de dano físico/mágico.
Assim como o HP, o dano precisa seguir uma progressão consistente, sem crescer de forma desproporcional.

DD-BAL-014 — Curva Base de Dano
Status: PROPOSTA
O dano das criaturas deve crescer de forma progressiva entre os Tiers, preservando a identidade de cada espécie e evitando picos artificiais de dificuldade.
Regras
Cada Tier possui uma faixa de dano de referência.
As faixas podem se sobrepor parcialmente entre Tiers consecutivos.
O dano é sempre balanceado em conjunto com HP, Defesa, Velocidade e habilidades especiais.

Especialização das Criaturas
Nem todas as criaturas de um mesmo Tier devem causar o mesmo dano.
Exemplos:
Assaltante (Glass Cannon):
HP baixo.
Defesa baixa.
Dano elevado.
Tanque:
HP elevado.
Defesa elevada.
Dano reduzido.
Equilibrado:
Atributos distribuídos de forma homogênea.
Suporte/Controle:
Dano moderado.
Maior foco em condições de combate, buffs, debuffs ou invocações.

Balanceamento
O aumento de dano entre Tiers deve acompanhar a evolução esperada dos atributos defensivos dos jogadores.
O objetivo é manter o tempo de reação, uso de consumíveis e decisões táticas relevantes durante toda a progressão, sem que combates se tornem injustos por explosões repentinas de dano.

Objetivo
Criar uma curva de dano previsível para os desenvolvedores, permitindo que novas criaturas sejam inseridas no jogo mantendo consistência com o restante do Bestiário.

Benefícios
Evita "power spikes" entre Tiers.
Facilita o balanceamento de novas famílias.
Permite criar criaturas com funções distintas sem depender apenas de números maiores.
Mantém a progressão do combate estável ao longo do jogo.

Essa decisão complementa a curva de HP aprovada anteriormente. Juntas, elas estabelecem os dois pilares principais do balanceamento numérico do Bestiário antes da definição dos valores absolutos de cada criatura.
Próxima lacuna
Capítulo 23
PENDENTE 05 — Criar curva de defesa física/mágica.
Após definir HP e dano, falta consolidar como a defesa evolui ao longo dos Tiers.

DD-BAL-015 — Curva Base de Defesa
Status: PROPOSTA
A Defesa Física e a Defesa Mágica das criaturas devem crescer de forma progressiva entre os Tiers, acompanhando a evolução do HP e do dano, sem tornar os combates excessivamente longos.
Regras
Cada Tier possui uma faixa de defesa de referência.
As faixas podem se sobrepor entre Tiers consecutivos.
Defesa Física e Defesa Mágica são atributos independentes e podem evoluir de forma diferente conforme a identidade da criatura.

Especialização das Criaturas
Nem todas as criaturas possuem o mesmo perfil defensivo.
Exemplos:
Golem
Defesa Física muito alta.
Defesa Mágica moderada.
Fantasma
Defesa Física baixa.
Defesa Mágica elevada.
Dragão
Alta defesa em ambos os atributos.
Mago Corrompido
Defesa Física baixa.
Defesa Mágica alta.

Balanceamento
A defesa deve reduzir o dano recebido, mas nunca tornar uma criatura praticamente invulnerável apenas por possuir números elevados.
Criaturas extremamente resistentes devem compensar essa característica com limitações em outros atributos, como mobilidade, dano ou comportamento.

Objetivo
Estabelecer uma progressão defensiva consistente para todas as espécies do Bestiário, preservando a identidade de cada família e evitando inflação de atributos.

Benefícios
Evita combates excessivamente demorados.
Permite maior diversidade entre criaturas do mesmo Tier.
Facilita o balanceamento de novas espécies.
Mantém HP, dano e defesa evoluindo de forma harmoniosa.

Essa decisão completa a tríade principal do balanceamento numérico (HP, Dano e Defesa). A partir dela, as próximas pendências passam a tratar da recompensa pela derrota das criaturas, iniciando pela curva de XP
Próxima lacuna
Capítulo 23
PENDENTE 06 — Criar curva de XP.
Após definir a progressão de HP, dano e defesa, falta estabelecer como evolui a recompensa pela derrota das criaturas.

DD-BAL-016 — Curva Base de Experiência (XP)
Status: PROPOSTA
A experiência concedida pelas criaturas deve crescer de forma progressiva entre os Tiers, acompanhando o aumento do risco e da dificuldade de enfrentamento.
Regras
Cada Tier possui uma faixa de XP de referência.
A XP é definida pelo conjunto da criatura, e não apenas por seu HP ou dano.
Criaturas do mesmo Tier podem conceder quantidades diferentes de XP, desde que isso reflita sua dificuldade real.

Fatores que influenciam a XP
A recompensa pode ser ajustada considerando:
HP.
Dano.
Defesa.
Mobilidade.
Inteligência da IA.
Habilidades especiais.
Condições de combate aplicadas.
Raridade do encontro.
Complexidade mecânica.

Balanceamento
A XP deve representar o risco assumido pelo jogador.
Assim:
Criaturas fáceis não devem conceder XP elevada apenas por possuírem muito HP.
Criaturas perigosas podem conceder uma recompensa maior mesmo sem serem as mais resistentes.

Objetivo
Garantir que a progressão de nível incentive o jogador a enfrentar desafios proporcionais ao seu desenvolvimento, evitando rotas de farm desbalanceadas baseadas apenas em uma estatística.

Benefícios
Recompensa o desafio real do combate.
Reduz estratégias de farm baseadas em monstros desbalanceados.
Facilita ajustes futuros sem alterar toda a curva de progressão.
Mantém coerência entre risco, tempo de combate e recompensa.

Essa decisão completa os quatro pilares do balanceamento base do Bestiário (HP, Dano, Defesa e XP). As próximas pendências passam a tratar dos parâmetros complementares das criaturas, começando pela velocidade-base.

Próxima lacuna
Capítulo 23
PENDENTE 07 — Definir velocidade-base.
A velocidade influencia diretamente a dificuldade de um combate e não deve ser tratada apenas como um atributo secundário.

DD-BAL-017 — Velocidade Base das Criaturas
Status: PROPOSTA
A velocidade é um atributo independente de HP, Dano e Defesa, sendo utilizada para definir o comportamento e a identidade de cada criatura.
Regras
A velocidade determina:
Deslocamento.
Perseguição.
Posicionamento.
Capacidade de alcançar ou escapar do jogador.
Ritmo geral do combate.
Ela não determina, por si só:
Velocidade de ataque.
Tempo de conjuração.
Tempo de recarga de habilidades.
Esses parâmetros são balanceados separadamente.

Especialização
A velocidade deve refletir a natureza da criatura.
Exemplos:
Slimes → lentos.
Lobos → rápidos.
Aranhas → muito rápidas.
Golems → muito lentos.
Fantasmas → velocidade média, podendo ignorar obstáculos específicos.
Dragões → velocidade variável conforme o comportamento e a fase do combate.

Balanceamento
Criaturas muito rápidas devem compensar essa vantagem com limitações em outros atributos, como HP, Defesa ou alcance.
Da mesma forma, criaturas lentas podem possuir maior resistência, dano ou controle de área.
A velocidade não deve ser utilizada para criar inimigos inevitáveis ou impossíveis de escapar sem justificativa mecânica.

Objetivo
Garantir que a movimentação seja um elemento de identidade das criaturas e uma ferramenta de balanceamento, e não apenas um número que cresce junto com os Tiers.

Benefícios
Torna cada família mais distinta.
Enriquece o posicionamento durante os combates.
Evita que a dificuldade seja baseada apenas em atributos numéricos.
Permite maior variedade de comportamentos entre criaturas do mesmo Tier.

Essa decisão fecha os cinco atributos fundamentais do balanceamento das criaturas (HP, Dano, Defesa, XP e Velocidade). As próximas pendências entram nos sistemas de variantes (Comum, Incomum e Raro), começando pela definição dos multiplicadores oficiais.
Próxima lacuna
Capítulo 23
PENDENTE 08 — Definir multiplicadores Comum/Incomum/Raro.
Até aqui já foi aprovado que existem três variantes e que elas pertencem à mesma espécie. Também ficou pendente definir seus multiplicadores oficiais.

DD-VAR-006 — Multiplicadores Oficiais das Variantes
Status: PROPOSTA
As variantes Comum, Incomum e Raro utilizam multiplicadores sobre a criatura-base, preservando sua identidade e comportamento.
Regras
A variante Comum é sempre a referência (100%).
As variantes Incomum e Raro modificam apenas parâmetros de balanceamento, sem criar uma nova espécie.
Os parâmetros afetados podem incluir:
HP.
Dano.
Defesa.
XP concedida.
Loot.
Resistências (quando aplicável).
A IA, o modelo, a história e a entrada do Bestiário permanecem os mesmos, salvo exceções previamente documentadas.

Filosofia de Balanceamento
Os multiplicadores devem seguir três princípios:
Comum: referência do ecossistema.
Incomum: desafio perceptivelmente maior, porém ainda frequente.
Raro: encontro excepcional, claramente superior à variante comum.
Os valores exatos de cada multiplicador (HP, dano, XP e loot) serão definidos em pendências específicas dos capítulos seguintes, evitando duplicação de decisões.

Objetivo
Padronizar o funcionamento das variantes antes da definição dos números finais, garantindo que todas as famílias utilizem a mesma lógica de progressão.

Benefícios
Evita que cada família tenha regras próprias para variantes.
Facilita o rebalanceamento global.
Mantém a consistência entre todas as espécies.
Permite alterar multiplicadores futuramente sem modificar o Bestiário.

Essa proposta funciona como uma decisão estrutural. Os percentuais numéricos continuam pendentes e serão definidos nas próximas lacunas do documento (HP, dano, XP, loot e chance de surgimento das variantes), exatamente como previsto na auditoria.
Próxima lacuna
Capítulo 23
PENDENTE 09 — Balancear MVPs separadamente.
Já aprovamos que MVPs possuem progressão própria no Bestiário. Agora falta definir sua filosofia de balanceamento.

DD-MVP-001 — Balanceamento Independente dos MVPs
Status: PROPOSTA
Os MVPs constituem uma categoria própria de balanceamento e não devem ser tratados apenas como versões com atributos aumentados de criaturas comuns.
Regras
Cada MVP é balanceado individualmente considerando:
Mecânicas exclusivas.
Padrões próprios de IA.
Habilidades especiais.
Fases de combate (quando aplicável).
Mobilidade.
Invocações.
Controle de área.
Recompensas.

Progressão
O Tier da criatura-base serve apenas como referência inicial.
O verdadeiro desafio de um MVP deve resultar da combinação entre:
Mecânicas.
Posicionamento.
Gerenciamento de recursos.
Coordenação dos jogadores.
E não apenas de HP e dano elevados.

Identidade
Cada MVP deve possuir identidade própria.
Dois MVPs do mesmo Tier podem apresentar dificuldades completamente diferentes devido às suas mecânicas.
Exemplos:
Um MVP pode focar em mobilidade extrema.
Outro pode utilizar invocações constantes.
Outro pode alternar entre fases ofensivas e defensivas.
Outro pode controlar o terreno durante a luta.

Balanceamento
O combate contra um MVP deve ser memorável.
O jogador deve lembrar como derrotou o MVP, e não apenas quanto tempo levou para reduzir sua barra de HP.

Objetivo
Garantir que os MVPs representem encontros únicos dentro do Bestiário, diferenciando-os claramente das criaturas comuns e das variantes Comum/Incomum/Raro.

Benefícios
Evita "esponjas de HP".
Valoriza mecânicas de combate.
Permite maior variedade entre chefes.
Facilita a criação de conteúdos memoráveis.
Mantém cada MVP com identidade própria.

Essa decisão estabelece a filosofia que será usada para todos os MVPs do jogo antes do balanceamento individual de cada um. O próximo passo será definir como o loot passa a integrar esse balanceamento, encerrando a última pendência do Capítulo 23.

Próxima lacuna
Capítulo 23
PENDENTE 10 — Depois dos números, definir loot.
Como o próprio documento estabelece, a definição do loot vem após a estrutura de balanceamento (HP, dano, defesa, XP, velocidade, variantes e MVPs), mas antes da produção dos sprites.

DD-LOOT-001 — Loot Integrado ao Balanceamento
Status: PROPOSTA
O loot das criaturas deve ser definido como parte do seu balanceamento completo, considerando não apenas o Tier, mas também sua identidade, dificuldade e função dentro do mundo.
Regras
A definição do loot deve considerar, em conjunto:
Tier da criatura.
Dificuldade real do combate.
Tipo de criatura.
Raridade da variante (Comum, Incomum ou Raro).
Categoria da criatura (normal, Elite, MVP ou Mítico).
Tempo médio de enfrentamento.
Importância econômica do item.

Filosofia
Criaturas de dificuldade semelhante devem oferecer recompensas compatíveis, mesmo que pertençam a famílias diferentes.
O loot não deve ser determinado apenas pelo HP ou pelo dano da criatura.

Progressão
O balanceamento deve preservar uma relação consistente entre:
Risco → Tempo investido → Recompensa
Assim, criaturas mais difíceis podem fornecer:
maior quantidade de itens;
materiais mais valiosos;
melhores probabilidades de itens raros;
itens exclusivos, quando apropriado.

Separação de Sistemas
Esta decisão define apenas a filosofia de distribuição do loot.
Ela não estabelece:
tabelas de drop;
porcentagens;
itens específicos;
raridades dos equipamentos;
probabilidades de obtenção.
Esses elementos permanecem para os capítulos específicos do Sistema de Loot e Economia.

Objetivo
Garantir que o loot seja consequência natural do balanceamento das criaturas, mantendo coerência entre desafio, progressão e economia do jogo.

Benefícios
Evita recompensas desproporcionais.
Facilita o balanceamento econômico.
Mantém consistência entre diferentes famílias de monstros.
Permite ajustes futuros sem alterar a identidade das criaturas.

Com essa decisão, todas as pendências de balanceamento do Capítulo 23 ficam concluídas. Resta apenas a regra de processo já prevista no documento: retornar à produção dos sprites somente após a consolidação do balanceamento, marcando a transição oficial para o Capítulo 24 — Progressão e Balanceamento do Bestiário.
Próxima lacuna
Capítulo 23
PENDENTE 11 — Somente depois retornar à produção dos sprites.
Esta não é uma decisão de balanceamento, mas uma regra de fluxo de desenvolvimento que o documento estabelece para evitar retrabalho.

DD-PIPE-001 — Ordem Oficial de Produção do Bestiário
Status: PROPOSTA
A produção visual das criaturas (sprites, animações e efeitos) somente deve iniciar após a consolidação do catálogo e do balanceamento do Bestiário.
Ordem oficial de desenvolvimento
Catálogo de criaturas.
Organização por famílias.
Distribuição por Tiers.
Balanceamento (HP, dano, defesa, XP, velocidade e variantes).
Definição do loot.
Produção de sprites.
Produção de animações.
Ajustes visuais finais.

Objetivo
Evitar que recursos artísticos sejam produzidos para criaturas que ainda possam sofrer alterações estruturais, como:
mudança de nome;
mudança de função;
mudança de Tier;
fusão com outra criatura;
remoção do catálogo.

Benefícios
Reduz retrabalho da equipe de arte.
Mantém o pipeline de desenvolvimento organizado.
Garante que o visual represente a versão definitiva da criatura.
Facilita futuras expansões sem refazer ativos já concluídos.

Observação
Esta decisão define o processo de desenvolvimento, não uma mecânica de jogo. Após sua aprovação, considera-se encerrada a etapa de pendências do Capítulo 23, iniciando oficialmente o Capítulo 24 — Progressão e Balanceamento do Bestiário, conforme previsto no documento.
Próxima lacuna
Capítulo 24
PENDENTE 01 — Incorporar o Druid à régua-base das classes.
O próprio documento informa que a régua original foi criada quando existiam apenas quatro classes e que o Druid foi adicionado posteriormente, devendo ser incorporado sem inventar seus atributos numéricos nesta etapa.

DD-BAL-018 — Incorporação do Druid à Régua de Balanceamento
Status: PROPOSTA
O Druid passa a integrar oficialmente a régua-base de balanceamento das classes, sendo considerado em todas as validações futuras do sistema de combate.
Regras
A partir desta decisão, toda análise de balanceamento deve contemplar as cinco classes iniciais:
Warrior
Assassin
Archer
Sorcerer
Druid

Escopo
A incorporação do Druid nesta etapa não define:
HP inicial;
Mana inicial;
dano-base;
defesa;
crescimento por nível;
atributos-base.
Esses valores permanecem pendentes para as etapas matemáticas específicas, conforme registrado no documento.

Objetivo
Garantir que nenhuma régua de combate, fórmula ou criatura seja validada considerando apenas as quatro classes originalmente existentes.
Todo o balanceamento do Bestiário deve ser compatível também com o Druid.

Benefícios
Atualiza a régua-base para refletir a versão atual do projeto.
Evita retrabalho quando os números finais do Druid forem definidos.
Garante consistência entre classes e Bestiário.
Preserva a decisão do documento de não atribuir valores arbitrários ao Druid antes da etapa apropriada.
Próxima lacuna
Capítulo 24
PENDENTE 02 — Validar definitivamente HP inicial das cinco classes.
O documento registra uma régua inicial para quatro classes e determina que ela deve ser revisada após a inclusão do Druid. Esses valores eram uma base de testes, não números imutáveis.

DD-BAL-019 — HP Inicial das Cinco Classes
Status: PROPOSTA
O HP inicial das cinco classes deve ser definido considerando seus papéis de combate, preservando uma diferença clara de resistência entre elas.
Regras
A distribuição de HP inicial deve seguir a seguinte ordem de robustez:
Warrior
Druid
Assassin
Archer
Sorcerer
Essa ordem representa apenas a hierarquia de resistência, não os valores numéricos finais.

Filosofia
Cada classe deve iniciar o jogo já transmitindo sua identidade:
Warrior: maior capacidade de absorver dano.
Druid: resistência intermediária, voltada para sustentação e sobrevivência prolongada.
Assassin: resistência moderada, compensada por mobilidade e explosão de dano.
Archer: menor resistência física em troca do combate à distância.
Sorcerer: menor HP inicial, compensado pelo maior potencial mágico.

Balanceamento
A diferença de HP inicial deve ser suficiente para que cada classe seja percebida como distinta, mas não tão grande a ponto de inviabilizar qualquer estilo de jogo nos níveis iniciais.
O HP inicial deve ser analisado em conjunto com:
Defesa.
Recurso (Mana).
Habilidades.
Alcance.
Mobilidade.
Controle.
Nunca de forma isolada.

Objetivo
Estabelecer uma base consistente para a progressão das cinco classes antes da definição das fórmulas de crescimento por nível.

Benefícios
Consolida definitivamente a régua de cinco classes.
Preserva a identidade de cada classe desde o nível 1.
Evita dependência exclusiva do HP para balanceamento.
Permite definir posteriormente os valores numéricos sem alterar a filosofia do sistema.

Esta decisão fecha a estrutura conceitual do HP inicial. A próxima pendência passa a definir como esse HP cresce a cada nível, por meio da fórmula de progressão.
Próxima lacuna
Capítulo 24
PENDENTE 03 — Validar crescimento de HP por level.
O documento registra uma primeira régua de crescimento para quatro classes, mas deixa claro que ela era uma referência de teste e deveria ser revisada após a inclusão do Druid.

DD-BAL-020 — Crescimento Natural de HP por Nível
Status: PROPOSTA
O crescimento natural de HP por nível deve preservar a identidade de cada classe durante toda a progressão, mantendo diferenças consistentes desde o início até o endgame.
Regras
O crescimento de HP deve seguir a mesma ordem de resistência definida para o HP inicial:
Warrior
Druid
Assassin
Archer
Sorcerer
Cada classe possui uma progressão própria, sem utilizar um ganho universal de HP por nível.

Filosofia
O ganho natural de HP representa a evolução física e a capacidade de sobrevivência inerentes a cada classe.
Assim:
O Warrior apresenta o maior crescimento de HP.
O Druid possui crescimento elevado, reforçando sua capacidade de sustentação.
O Assassin mantém crescimento intermediário.
O Archer evolui com foco em posicionamento, não em resistência.
O Sorcerer possui o menor crescimento natural de HP, compensando com recursos mágicos.

Balanceamento
O crescimento de HP deve ser analisado em conjunto com:
VIT.
Equipamentos.
Passivas.
Buffs.
Progressão de defesa.
O ganho natural não deve, sozinho, determinar a resistência final de uma classe.

Objetivo
Estabelecer uma progressão de sobrevivência coerente ao longo dos níveis, preservando o papel de cada classe sem provocar convergência excessiva entre elas.

Benefícios
Mantém a identidade das classes durante toda a progressão.
Facilita o balanceamento do Bestiário em diferentes faixas de nível.
Evita que atributos, equipamentos ou buffs precisem compensar diferenças estruturais de HP.
Serve como base para a definição futura da fórmula matemática de crescimento.

Esta decisão consolida a filosofia de crescimento do HP. A próxima pendência passa a definir o crescimento do recurso principal (Mana) para as cinco classes.
Próxima lacuna
Capítulo 24
PENDENTE 04 — Definir crescimento de Mana/recurso.
O documento apenas indica que esta definição ainda não havia sido consolidada. Até este ponto, não existe uma fórmula definitiva para o crescimento do recurso das classes.

DD-BAL-021 — Crescimento Natural do Recurso por Nível
Status: PROPOSTA
Cada classe deve possuir um crescimento natural do seu recurso principal (Mana ou equivalente), compatível com sua função dentro do combate, sem utilizar uma progressão idêntica para todas as classes.
Regras
O crescimento do recurso deve ser individual para cada classe.
A quantidade de recurso obtida por nível deve refletir a dependência que cada classe possui de habilidades e magias durante o combate.

Filosofia
O recurso principal não representa apenas capacidade de conjuração, mas também o ritmo com que cada classe consegue utilizar suas habilidades.
Assim:
Sorcerer possui o maior crescimento natural do recurso.
Druid possui crescimento elevado, por depender constantemente de magias de suporte, cura, controle e natureza.
Archer possui crescimento intermediário.
Assassin possui crescimento intermediário.
Warrior possui o menor crescimento natural, utilizando o recurso principalmente para técnicas de combate.

Balanceamento
O crescimento natural do recurso deve ser analisado juntamente com:
custo das habilidades;
regeneração natural;
equipamentos;
atributos relacionados;
passivas;
consumíveis.
Uma classe não deve depender exclusivamente de possuir uma grande reserva de recurso para ser eficiente.

Objetivo
Garantir que todas as classes consigam utilizar suas habilidades de forma coerente durante toda a progressão, preservando suas identidades e evitando diferenças excessivas apenas pela quantidade de Mana.

Benefícios
Mantém a identidade de cada classe.
Facilita o balanceamento das habilidades.
Reduz a necessidade de ajustes artificiais nos custos das magias.
Cria uma base consistente para a futura fórmula matemática de crescimento do recurso.
Próxima lacuna
Capítulo 24
PENDENTE 05 — Definir fórmula de dano físico.
O documento deixa claro que essa fórmula ainda não havia sido consolidada nesta etapa e que o balanceamento futuro deveria abandonar números arbitrários em favor de relações matemáticas consistentes.

DD-BAL-022 — Estrutura da Fórmula de Dano Físico
Status: PROPOSTA
O dano físico deve ser calculado por uma fórmula composta por múltiplos fatores, permitindo que equipamentos, atributos e habilidades influenciem o resultado de forma previsível e escalável.
Estrutura
O dano físico final deve considerar, nesta ordem lógica:
Dano-base da arma.
Atributos relevantes da classe.
Multiplicadores de habilidades.
Bônus de equipamentos.
Bônus de cartas.
Bônus de passivas.
Bônus temporários (buffs).
Redução pela Defesa Física do alvo.
Modificadores situacionais (crítico, vulnerabilidades, resistências e outros efeitos específicos).

Filosofia
Nenhum elemento deve determinar sozinho o dano final.
O desempenho ofensivo do personagem deve resultar da combinação entre:
evolução da classe;
distribuição de atributos;
qualidade dos equipamentos;
especialização da build;
execução em combate.

Balanceamento
A fórmula deve permitir crescimento contínuo sem gerar saltos excessivos de poder entre faixas de nível.
Além disso:
armas continuam sendo a principal fonte de dano-base;
atributos potencializam esse dano;
habilidades modificam o resultado conforme sua proposta;
equipamentos complementam a progressão, sem substituir a importância dos atributos e da arma.

Objetivo
Criar uma estrutura de cálculo capaz de acompanhar toda a progressão do jogo, do nível inicial ao conteúdo de alto nível, sem depender de ajustes específicos para cada faixa.

Benefícios
Facilita o balanceamento entre classes.
Permite expansão futura com novos equipamentos, cartas e habilidades.
Evita fórmulas excessivamente rígidas ou dependentes de um único fator.
Estabelece uma base sólida para a definição matemática detalhada da fórmula em capítulos posteriores.
Próxima lacuna
Capítulo 24
PENDENTE 06 — Definir fórmula de dano mágico.
O documento registra que, nesta fase, a fórmula de dano mágico ainda não havia sido consolidada, permanecendo como uma das definições matemáticas pendentes.

DD-BAL-023 — Estrutura da Fórmula de Dano Mágico
Status: PROPOSTA
O dano mágico deve ser calculado por uma fórmula própria, independente da fórmula de dano físico, refletindo a natureza das magias e permitindo balanceamento específico para conjuradores.
Estrutura
O dano mágico final deve considerar, nesta ordem lógica:
Poder-base da magia.
Atributos relevantes da classe.
Multiplicadores da própria habilidade.
Bônus de equipamentos.
Bônus de cartas.
Bônus de passivas.
Bônus temporários (buffs).
Redução pela Defesa Mágica do alvo.
Modificadores situacionais (afinidades elementais, vulnerabilidades, resistências e outros efeitos específicos).

Filosofia
O dano mágico não deve ser uma adaptação da fórmula física.
Cada sistema deve possuir identidade própria, permitindo que:
habilidades mágicas sejam balanceadas separadamente;
equipamentos mágicos tenham função específica;
resistência mágica seja um atributo relevante;
futuras escolas de magia possam ser ajustadas sem impactar o combate físico.

Balanceamento
O crescimento do dano mágico deve acompanhar a progressão do personagem sem ultrapassar desproporcionalmente o dano físico.
Diferenças de desempenho entre classes devem resultar principalmente das habilidades disponíveis e da construção da build, e não apenas da fórmula.

Objetivo
Criar uma estrutura independente para o cálculo do dano mágico, permitindo expansão futura com novos elementos, habilidades, equipamentos e passivas sem necessidade de reformular todo o sistema.

Benefícios
Separa claramente os sistemas físico e mágico.
Facilita ajustes individuais em magias e escolas elementais.
Valoriza atributos e equipamentos voltados à magia.
Fornece uma base sólida para a definição matemática detalhada em etapas posteriores.

PENDENTE 07 — Definir fórmula de Defesa Física.
O documento registra que a fórmula de Defesa Física ainda não havia sido consolidada nesta etapa, permanecendo como uma das definições matemáticas pendentes do sistema de combate.

DD-BAL-024 — Estrutura da Fórmula de Defesa Física
Status: PROPOSTA
A Defesa Física deve ser calculada por uma fórmula composta por múltiplas fontes de mitigação, permitindo evolução consistente do personagem sem tornar a defesa absoluta.
Estrutura
A Defesa Física final deve considerar, nesta ordem lógica:
Defesa-base da classe.
Atributos relevantes.
Defesa concedida pelos equipamentos.
Bônus de cartas.
Bônus de passivas.
Bônus temporários (buffs).
Modificadores situacionais.
O resultado será utilizado pela fórmula de dano físico para reduzir o dano recebido.

Filosofia
A Defesa Física representa a capacidade de reduzir impactos diretos, e não de tornar o personagem imune ao dano.
Ela deve recompensar investimento em equipamentos e atributos defensivos, mantendo a necessidade de posicionamento, estratégia e uso de habilidades.

Balanceamento
A Defesa Física deve apresentar retornos previsíveis ao longo da progressão, evitando situações em que pequenos aumentos produzam reduções desproporcionais de dano.
Da mesma forma, equipamentos de alto nível devem fortalecer personagens defensivos sem eliminar o risco representado por criaturas ou jogadores adequados à mesma faixa de progressão.

Objetivo
Criar uma base consistente para o cálculo da mitigação de dano físico, permitindo expansão futura com novos equipamentos, cartas, habilidades e efeitos sem necessidade de reformular a estrutura da fórmula.

Benefícios
Valoriza equipamentos e atributos defensivos.
Facilita o balanceamento entre PvE e PvP.
Evita imunidade ao dano por acúmulo de defesa.
Fornece uma base sólida para a futura definição matemática da fórmula.
Próxima lacuna
Capítulo 24
PENDENTE 08 — Definir fórmula de Defesa Mágica.
Assim como a Defesa Física, o documento registra que a Defesa Mágica ainda não possuía uma fórmula consolidada nesta etapa, permanecendo como uma definição matemática pendente.

DD-BAL-025 — Estrutura da Fórmula de Defesa Mágica
Status: PROPOSTA
A Defesa Mágica deve ser calculada por uma fórmula própria, independente da Defesa Física, representando a capacidade do personagem de resistir a efeitos e danos de origem mágica.
Estrutura
A Defesa Mágica final deve considerar, nesta ordem lógica:
Resistência mágica-base da classe.
Atributos relevantes.
Equipamentos com bônus de Defesa Mágica.
Cartas.
Passivas.
Buffs temporários.
Modificadores situacionais.
O resultado será utilizado pela fórmula de dano mágico para reduzir o dano recebido de habilidades e efeitos mágicos.

Filosofia
A Defesa Mágica não deve ser derivada automaticamente da Defesa Física.
Um personagem pode ser altamente resistente a ataques físicos e, ao mesmo tempo, vulnerável à magia, ou o inverso.
Essa separação amplia a diversidade de builds, equipamentos e estratégias.

Balanceamento
A Defesa Mágica deve evoluir de forma previsível, evitando extremos em que personagens se tornem praticamente imunes a magias apenas pelo acúmulo de atributos ou equipamentos.
Ela deve ser relevante tanto no PvE quanto no PvP, especialmente contra classes e criaturas com foco em dano mágico.

Objetivo
Estabelecer uma estrutura independente para a mitigação de dano mágico, permitindo que futuras habilidades, equipamentos e cartas interajam com esse sistema sem comprometer o balanceamento do combate físico.

Benefícios
Separa claramente os sistemas de defesa física e mágica.
Valoriza equipamentos e builds especializados.
Amplia a variedade estratégica entre classes.
Cria uma base consistente para a futura definição matemática da Defesa Mágica.
Próxima lacuna
Capítulo 24
PENDENTE 09 — Definir velocidade-base.
O documento registra que o Slime Verde possui velocidade baixa como referência inicial, mas deixa a definição da velocidade-base do sistema como uma pendência.

DD-BAL-026 — Estrutura da Velocidade-Base
Status: PROPOSTA
A velocidade-base representa a capacidade natural de deslocamento de uma criatura ou personagem, servindo como referência para todos os demais modificadores de mobilidade do jogo.
Regras
Toda criatura e personagem deve possuir uma velocidade-base definida.
Essa velocidade poderá ser modificada posteriormente por:
atributos;
equipamentos;
habilidades;
buffs;
debuffs;
efeitos do ambiente.

Filosofia
A velocidade-base deve representar a identidade da criatura ou classe, e não apenas seu nível.
Exemplos:
Slimes possuem velocidade naturalmente baixa.
Lobos e felinos possuem velocidade elevada.
Criaturas pesadas tendem a ser mais lentas.
Criaturas pequenas ou ágeis podem compensar menor resistência com maior mobilidade.
Da mesma forma, entre as classes:
Warrior tende a possuir mobilidade padrão.
Assassin privilegia mobilidade.
Archer depende de bom reposicionamento.
Sorcerer compensa menor mobilidade com alcance e magia.
Druid pode variar conforme habilidades e formas futuras, sem alterar sua velocidade-base.

Balanceamento
A velocidade-base deve ser definida de forma independente do dano e da defesa.
Uma criatura pode ser:
lenta e resistente;
rápida e frágil;
rápida e ofensiva;
lenta, porém muito perigosa.
A mobilidade é um eixo próprio de balanceamento.

Objetivo
Criar uma referência única para o deslocamento, permitindo que futuras modificações sejam aplicadas de forma consistente sem alterar a identidade natural de cada criatura ou classe.

Benefícios
Reforça a identidade das classes e criaturas.
Facilita o balanceamento de habilidades de mobilidade.
Evita que velocidade seja utilizada como compensação arbitrária para outros atributos.
Estabelece uma base sólida para o sistema de movimentação do jogo.

Próxima lacuna
Capítulo 24
PENDENTE 10 — Definir XP do Slime Verde.
O documento registra explicitamente que o XP do Slime Verde ainda não havia sido definido nesta etapa, embora ele já estivesse estabelecido como a criatura-base do Tier I.

DD-BAL-027 — XP Base do Slime Verde
Status: PROPOSTA
O Slime Verde passa a ser a referência oficial para o início da curva de experiência do Bestiário.
Regras
O XP concedido pelo Slime Verde deve servir como valor-base para a construção da curva de experiência de todas as demais criaturas do jogo.
As demais criaturas não terão seu XP definido isoladamente, mas por comparação com essa referência inicial.

Filosofia
O Slime Verde é o primeiro inimigo que o jogador enfrenta.
Seu XP deve recompensar:
o aprendizado das mecânicas;
os primeiros combates;
a familiarização com o sistema.
Ao mesmo tempo, não deve permitir evolução excessivamente rápida apenas repetindo o mesmo inimigo.

Balanceamento
O XP do Slime Verde deve ser suficiente para tornar os primeiros níveis fluidos, mas perder eficiência naturalmente conforme o personagem evolui.
Isso incentiva a progressão para novas áreas e novas criaturas, em vez de permanecer indefinidamente na mesma Hunt.

Objetivo
Estabelecer um ponto inicial sólido para a futura curva de XP do Bestiário, mantendo consistência em toda a progressão do jogo.

Benefícios
Define uma referência única para o Tier I.
Facilita a construção da curva completa de experiência.
Evita que cada criatura receba XP de forma arbitrária.
Mantém coerência entre dificuldade, tempo de combate e recompensa.

Observação importante
Esta decisão não fixa um número de XP para o Slime Verde. Ela apenas estabelece sua função como referência da curva. O valor numérico poderá ser definido posteriormente durante a calibração matemática da progressão, preservando a orientação do documento de não transformar exemplos em valores canônicos sem validação específica.
Status: PROPOSTA.
DD-BAL-027 — XP Base do Slime Verde
Status: APROVADO (proposta consolidada)
Valor Canônico
Slime Verde (Tier I / Nível 1)
XP: 10

Justificativa
O Slime Verde é a unidade de referência do Tier I. Já foi definido que ele possui:
50 HP;
dano 4–7;
defesa 1;
velocidade baixa;
combate de aproximadamente 3–8 segundos.
Fixar 10 XP cria uma unidade simples para escalar toda a curva do jogo.
Isso permite pensar em progressão como múltiplos dessa unidade:
criatura um pouco mais difícil → 12–15 XP;
criatura duas vezes mais perigosa → ~20 XP;
mini-chefes → dezenas de vezes esse valor;
MVPs → outra escala.
Além disso, facilita muito o balanceamento futuro.

Próxima pendência
Capítulo 24
PENDENTE 11 — Construir curva de XP dos monstros.

DD-BAL-028 — Curva Oficial de XP do Bestiário
Status: PROPOSTA
O XP concedido pelas criaturas será calculado a partir de quatro fatores principais:
Tier da criatura
Dificuldade real do combate
Tempo esperado para derrotá-la
Categoria da criatura

Regra 1 — XP acompanha risco
Criaturas que oferecem maior risco devem conceder maior recompensa.
Nunca apenas o nível determina o XP.

Regra 2 — Tempo importa
Se duas criaturas pertencem ao mesmo Tier:
a que demora mais para ser derrotada;
exige mais recursos;
possui IA mais perigosa;
ou apresenta mecânicas mais complexas,
deve conceder mais XP.

Regra 3 — Categorias
A progressão passa a seguir a seguinte lógica:
Criatura Comum → XP base.
Incomum → XP superior.
Rara → XP significativamente superior.
Elite → bônus elevado.
MVP → curva própria de XP.
Mítico → curva exclusiva.

Regra 4 — Escala contínua
O XP deve crescer de forma contínua entre os Tiers.
Evita situações como:
Tier II = 50 XP
Tier III = 600 XP
sem motivo.
A progressão deve ser suave.

Regra 5 — Recompensa proporcional
O XP deve refletir:
dificuldade;
tempo;
risco;
consumo de recursos.
Nunca apenas HP ou nível.

Objetivos
Criar uma curva previsível.
Evitar exploits de farm.
Facilitar o balanceamento futuro.
Manter consistência entre PvE e progressão.

Benefícios
Toda criatura passa a possuir um lugar lógico na curva de experiência.
O Bestiário pode crescer indefinidamente sem necessidade de recalcular o sistema.
O XP acompanha a experiência real de combate, e não apenas números arbitrários.

Na próxima decisão começaremos a fechar os multiplicadores das variantes (Incomum e Raro), que afetarão HP, dano, defesa, XP e loot de forma padronizada em todo o Bestiário.
DD-BAL-028 — Curva Oficial de XP do Bestiário Status: APROVADO
Como você autorizou, vou começar a fechar os números de balanceamento que ficaram pendentes no documento, sempre mantendo uma progressão conservadora e fácil de escalar. O próprio capítulo indica que os multiplicadores das variantes ainda precisam ser definidos.

DD-BAL-029 — Multiplicador da Variante Incomum
Status: PROPOSTA
A variante Incomum representa uma criatura naturalmente mais poderosa da mesma espécie, sem alterar sua identidade. Ela continua sendo a mesma entrada do Bestiário, a mesma carta e a mesma espécie.
Multiplicadores Oficiais
Atributo
Multiplicador
HP
×1,50
Dano
×1,20
Defesa
×1,20
XP
×1,50
Loot (chance/qualidade)
×1,30

Justificativa
A criatura deve ser claramente mais perigosa, mas ainda reconhecível como uma evolução da versão comum.
Exemplo usando o Slime Verde (base atual):
Atributo
Comum
Incomum
HP
50
75
Dano
4–7
5–8
Defesa
1
1,2 (arredondado conforme a fórmula final)
XP
10
15
Isso cria um aumento perceptível de dificuldade sem tornar a variante um "mini-chefe".

Filosofia
A variante Incomum deve:
aparecer ocasionalmente;
exigir mais atenção;
recompensar melhor o jogador;
acelerar o progresso de Tasks e Bestiário (3 pontos já definidos);
permanecer compatível com o Tier da espécie.

Objetivos
Criar uma progressão consistente entre Comum e Raro.
Tornar a variante recompensadora sem desequilibrar a economia.
Servir como base para todas as espécies do jogo.

Benefícios
Fácil de aplicar em qualquer criatura.
Escala bem para todos os Tiers.
Mantém a identidade da espécie.
Prepara naturalmente a transição para a variante Rara.
Status: PROPOSTA.

Próxima pendência
Capítulo 24
PENDENTE 13 — Definir multiplicador do Raro.
Como o Incomum já ficou definido, agora precisamos fechar a segunda etapa da progressão das variantes. O documento estabelece que a variante Rara deve ser "bem superior", conceder mais XP e loot, mas continuar sendo a mesma espécie.

DD-BAL-030 — Multiplicador da Variante Rara
Status: PROPOSTA
A variante Rara representa um indivíduo excepcional dentro da espécie. Ela continua pertencendo à mesma entrada do Bestiário e utiliza a mesma carta, porém oferece um desafio significativamente maior.
Multiplicadores Oficiais
Atributo
Multiplicador
HP
×2,25
Dano
×1,50
Defesa
×1,40
XP
×2,50
Loot (chance/qualidade)
×2,00

Exemplo — Slime Verde
Atributo
Comum
Incomum
Raro
HP
50
75
113
Dano
4–7
5–8
6–10
Defesa
1
1,2
1,4
XP
10
15
25
Os valores de HP e defesa poderão ser arredondados conforme as regras finais do sistema de combate.

Filosofia
A variante Rara deve causar a sensação de um encontro especial.
Ela não é um chefe nem um MVP, mas um indivíduo claramente acima da média da população daquela espécie.
O jogador deve perceber imediatamente que vale a pena enfrentá-la pelo risco adicional e pelas recompensas superiores.

Balanceamento
A progressão entre as variantes permanece gradual:
Comum → Incomum: aumento moderado.
Incomum → Raro: aumento perceptível, mas sem atingir o nível de um Boss ou MVP.
Isso preserva a importância das classificações especiais (Boss, MVP e Mítico), que possuem escalas próprias.

Objetivos
Tornar encontros com variantes Raras memoráveis.
Recompensar o jogador pelo maior risco.
Manter uma escala consistente em todos os Tiers.
Evitar que variantes substituam a função dos Bosses e MVPs.

Benefícios
Progressão numérica simples e reutilizável.
Excelente escalabilidade para todo o Bestiário.
Reforça o valor de explorar e encontrar variantes.
Mantém o sistema equilibrado para futuras expansões.
Status: PROPOSTA.

DD-BAL-030 — Multiplicadores da Variante Rara Status: APROVADO
Com isso, encerramos uma das partes mais importantes do balanceamento das variantes. Já temos definidos:
✅ Comum = referência
✅ Incomum = ×1,50 HP / ×1,20 Dano / ×1,20 DEF / ×1,50 XP / ×1,30 Loot
✅ Raro = ×2,25 HP / ×1,50 Dano / ×1,40 DEF / ×2,50 XP / ×2,00 Loot
Isso cria uma progressão consistente e fácil de aplicar em qualquer espécie do jogo.

Próxima pendência
Capítulo 24
PENDENTE 14 — Definir chance de spawn das variantes.
O documento estabelece que as variantes surgem naturalmente na população de monstros, mas deixa em aberto as probabilidades de aparecimento.

DD-BAL-031 — Probabilidade Oficial de Spawn das Variantes
Status: PROPOSTA
Cada criatura normal do Bestiário utilizará a seguinte distribuição de spawn:
Variante
Chance
Comum
95,0%
Incomum
4,5%
Raro
0,5%

Filosofia
A variante Comum representa a população predominante da espécie.
A Incomum deve aparecer com frequência suficiente para que o jogador encontre algumas durante uma sessão normal de caça, criando momentos de variedade sem perder seu caráter especial.
A variante Rara deve ser um evento memorável. Ela não deve ser tão frequente a ponto de se tornar rotina, nem tão rara que a maioria dos jogadores passe dezenas de horas sem encontrar uma.

Balanceamento
Com essa distribuição, em média:
a cada 100 criaturas, aproximadamente:
95 serão Comuns;
4 ou 5 serão Incomuns;
1 será Rara a cada 200 derrotas, em média.
Como o surgimento é probabilístico, podem ocorrer sequências maiores ou menores sem uma variante Rara, preservando a sensação de descoberta.

Escalabilidade
Essas probabilidades servem como valor padrão global.
Eventos especiais, dungeons, biomas específicos ou habilidades futuras poderão alterar temporariamente essas taxas sem modificar a regra-base do jogo.

Objetivos
Tornar variantes parte natural do mundo.
Manter a raridade da variante Rara.
Evitar inflação de XP e loot.
Incentivar exploração contínua.

Benefícios
Fácil implementação.
Balanceamento previsível.
Economia protegida.
Mantém o entusiasmo ao encontrar variantes Raras.
Status: PROPOSTA.

Próxima pendência
Capítulo 24
PENDENTE 15 — Balancear Tier I criatura por criatura.
Esta é a primeira etapa do balanceamento numérico do Bestiário. O documento estabelece que o Slime Verde é a criatura-base sobre a qual o restante do Tier I será escalonado.

DD-BAL-032 — Metodologia Oficial de Balanceamento do Tier I
Status: PROPOSTA
Antes de atribuir números às demais criaturas do Tier I, fica estabelecida a metodologia oficial de balanceamento.
Regra 1 — O Slime Verde é a referência
Toda criatura do Tier I será comparada ao Slime Verde.
Referência atual:
Atributo
Valor
HP
50
Dano
4–7
Defesa
1
XP
10

Regra 2 — Balanceamento por função
Os números não serão definidos apenas pelo nível da criatura.
Cada espécie será balanceada conforme sua função.
Exemplos:
morcegos → menos HP, alta mobilidade;
lobos → velocidade e perseguição;
javalis → mais HP e investida;
aranhas → veneno e controle;
orcs → combate equilibrado;
ursos → muito HP e dano, baixa mobilidade.
Esse princípio já foi consolidado anteriormente no documento.

Regra 3 — Comparação horizontal
Ao criar uma nova criatura do mesmo Tier, será ajustado apenas o necessário para representar sua identidade.
Não haverá aumentos automáticos em todos os atributos.
Exemplos:
uma criatura pode ganhar HP e perder velocidade;
outra pode ganhar dano e perder defesa;
outra pode ter pouco HP, mas habilidades perigosas.

Regra 4 — Teste contra as cinco classes
Cada criatura deverá ser analisada considerando:
Warrior
Archer
Assassin
Sorcerer
Druid
Nenhuma criatura será balanceada pensando apenas em uma classe.

Objetivos
Evitar inflação de atributos dentro do mesmo Tier.
Dar identidade própria a cada espécie.
Facilitar a expansão dos Tiers II a VI utilizando a mesma metodologia.

Benefícios
Balanceamento consistente.
Progressão previsível.
Maior diversidade de combates.
Base sólida para todo o Bestiário do Elysia.

Próxima etapa
Após aprovar esta decisão, começaremos o balanceamento individual das criaturas do Tier I, definindo a ficha oficial de cada espécie (HP, dano, defesa, velocidade, XP e comportamento), iniciando pelo Slime Verde e seguindo a ordem do Bestiário. Essa será a primeira ficha totalmente canônica do jogo.
Status: PROPOSTA.

DD-BAL-033 — Ficha Canônica do Slime Verde
Status: PROPOSTA
O Slime Verde torna-se oficialmente a criatura de referência do Tier I. Todas as demais criaturas da faixa inicial serão comparadas a ele para manter uma progressão consistente.
Classificação
Tier: I
Família: Slimes
Variante-base: Comum
Comportamento: Neutro
Tipo de combate: Corpo a corpo

Atributos Oficiais
Atributo
Valor
HP
50
Dano
4–7
Defesa Física
1
Defesa Mágica
0
Velocidade
Baixa
XP
10
Esses valores consolidam as decisões já aprovadas durante o balanceamento e passam a ser a referência oficial para o Tier I.

IA
O Slime Verde:
permanece parado enquanto nenhum jogador se aproxima;
detecta jogadores apenas em curto alcance;
desloca-se lentamente até o alvo;
realiza apenas ataque corpo a corpo;
não possui habilidades especiais;
não utiliza veneno, sangramento ou magia;
abandona a perseguição após perder o alvo por determinada distância.

Papel no jogo
O Slime Verde existe para ensinar ao jogador:
movimentação;
combate básico;
funcionamento do loot;
ganho de XP;
primeiras mecânicas do Bestiário e das Tasks.
Ele não deve representar risco elevado, mas também não deve ser eliminado instantaneamente por um personagem recém-criado.

Filosofia
O Slime Verde não será buffado futuramente para acompanhar novas áreas.
Ele continuará sendo a referência do início do jogo, preservando sua função didática e servindo como unidade de comparação para o restante do Bestiário.

Objetivos
Consolidar a primeira ficha canônica do Elysia.
Criar uma referência fixa para o balanceamento dos demais monstros.
Padronizar o início da curva de progressão do PvE.

Benefícios
Facilita o balanceamento das demais espécies.
Mantém consistência entre Tiers.
Evita revisões frequentes do início do jogo.
Estabelece uma base sólida para toda a progressão do Bestiário.
Status: PROPOSTA.

DD-BAL-034 — Ficha Canônica do Slime Azul
Status: PROPOSTA
O Slime Azul representa a evolução natural do Slime Verde dentro da mesma família. Ele continua sendo uma criatura simples, porém serve como o próximo degrau de dificuldade para jogadores iniciantes.

Classificação
Tier: I
Família: Slimes
Variante-base: Comum
Comportamento: Neutro
Tipo de combate: Corpo a corpo

Atributos Oficiais
Atributo
Valor
HP
70
Dano
6–10
Defesa Física
2
Defesa Mágica
1
Velocidade
Baixa
XP
16

IA
O Slime Azul mantém a mesma IA básica da família:
permanece neutro até detectar um alvo;
aproxima-se lentamente;
utiliza apenas ataques corpo a corpo;
não utiliza magia;
não possui habilidades especiais;
abandona a perseguição após perder o alvo.

Papel no jogo
O Slime Azul é a transição entre o tutorial e as primeiras hunts.
Seu objetivo é ensinar ao jogador que criaturas da mesma família podem apresentar aumento gradual de dificuldade sem mudar completamente seu comportamento.

Filosofia de Balanceamento
A evolução em relação ao Slime Verde ocorre de forma moderada:
+40% HP
+aproximadamente 40% XP
aumento controlado de dano e defesa.
Ele continua sendo uma criatura simples, preservando a identidade dos Slimes como inimigos lentos, previsíveis e ideais para aprendizado.

Objetivos
Criar o segundo degrau oficial da família Slime.
Manter uma curva de progressão suave no Tier I.
Evitar saltos bruscos de dificuldade entre espécies.

Benefícios
Progressão intuitiva para novos jogadores.
Escalabilidade consistente para Slime Vermelho e futuras famílias.
Mantém a identidade da família Slime como referência do início do jogo.
Status: PROPOSTA.

DD-BAL-035 — Ficha Canônica do Slime Vermelho
Status: PROPOSTA
O Slime Vermelho representa o membro mais forte da família antes do MVP (Super Slime). Ele ainda é uma criatura básica, mas já exige mais atenção do jogador iniciante.

Classificação
Tier: I
Família: Slimes
Variante-base: Comum
Comportamento: Neutro
Tipo de combate: Corpo a corpo

Atributos Oficiais
Atributo
Valor
HP
100
Dano
8–13
Defesa Física
3
Defesa Mágica
2
Velocidade
Baixa
XP
25

IA
O Slime Vermelho mantém a identidade da família:
neutro até detectar um alvo;
movimentação lenta;
apenas ataques corpo a corpo;
sem magia;
sem veneno;
sem habilidades especiais;
interrompe a perseguição ao perder o alvo.

Papel no jogo
O Slime Vermelho representa o encerramento da progressão básica dos Slimes.
O jogador já deve possuir equipamentos e domínio suficiente das mecânicas para derrotá-lo com consistência.

Filosofia de Balanceamento
Comparado ao Slime Azul:
aumento perceptível de HP;
dano suficiente para punir erros repetidos;
maior resistência, sem transformá-lo em um "mini-chefe".
O desafio continua vindo dos atributos, não de mecânicas complexas.

Progressão da Família Slime
Criatura
HP
Dano
DEF
XP
Slime Verde
50
4–7
1
10
Slime Azul
70
6–10
2
16
Slime Vermelho
100
8–13
3
25
Essa progressão mantém uma curva previsível e deixa espaço suficiente para que o Super Slime (MVP) tenha atributos e mecânicas significativamente superiores, sem depender apenas de números elevados.

Objetivos
Concluir o balanceamento das espécies normais da família Slime.
Estabelecer uma curva clara dentro do Tier I.
Preparar a transição para o primeiro MVP da família.

Benefícios
Progressão intuitiva para novos jogadores.
Escala consistente para futuras famílias.
Mantém a identidade dos Slimes como criaturas simples e introdutórias.
Status: PROPOSTA.

Com isso, a família Slimes fica numericamente fechada:
Criatura
HP
Dano
DEF
DEF Mág.
Velocidade
XP
Slime Verde
50
4–7
1
0
Baixa
10
Slime Azul
70
6–10
2
1
Baixa
16
Slime Vermelho
100
8–13
3
2
Baixa
25

Próxima etapa
O próximo passo lógico é fechar o primeiro MVP do Bestiário.
O documento define que o MVP da família é o Super Slime, deixando claro que MVP é uma criatura própria e não uma variante.

DD-BAL-036 — Ficha Canônica do Super Slime (MVP)
Status: PROPOSTA
O Super Slime é o primeiro MVP que o jogador poderá enfrentar. Sua função não é apenas possuir atributos elevados, mas ensinar que um MVP exige preparação, leitura de mecânicas e maior tempo de combate.

Classificação
Categoria: MVP
Família: Slimes
Tipo: Corpo a corpo
Comportamento: Agressivo

Atributos Oficiais
Atributo
Valor
HP
500
Dano
18–28
Defesa Física
8
Defesa Mágica
5
Velocidade
Baixa
XP
250

IA
Além do comportamento básico da família, o Super Slime possui mecânicas próprias:
detecta jogadores a uma distância maior;
nunca abandona o combate enquanto houver um alvo na área;
realiza ataques corpo a corpo mais fortes;
periodicamente executa um Salto Esmagador, causando dano em área ao redor do ponto de impacto;
quando sua vida atinge 50%, entra em um estado de fúria, aumentando temporariamente sua velocidade de ataque (sem alterar sua velocidade de deslocamento).

Papel no jogo
O Super Slime deve ser o primeiro contato do jogador com um verdadeiro MVP.
Ele ensina conceitos que serão reutilizados em chefes futuros:
maior resistência;
habilidades exclusivas;
ataques em área;
fases de combate.

Filosofia de Balanceamento
O desafio não deve depender apenas do HP elevado.
A combinação de:
resistência;
dano consistente;
habilidade em área;
mudança de comportamento na metade da vida,
torna o combate memorável sem recorrer a mecânicas excessivamente complexas para o primeiro MVP.

Objetivos
Encerrar oficialmente a família Slime.
Estabelecer o padrão de design dos futuros MVPs.
Introduzir combates com múltiplas fases logo no início do jogo.

Benefícios
Primeiro MVP com identidade própria.
Mantém a simplicidade característica da família Slime.
Cria uma referência para o desenvolvimento dos próximos chefes.
Estabelece um padrão reutilizável para o restante do Bestiário.
Perfeito. Registrado.
DD-BAL-036 — Ficha Canônica do Super Slime (MVP) Status: APROVADO
Com isso, a família Slime está completamente consolidada (criaturas comuns e MVP), encerrando a primeira etapa do PENDENTE 15 — Balancear Tier I criatura por criatura.

Próxima pendência
O próximo item registrado no documento é:
PENDENTE 16 — Depois avançar Tier II → III → IV → V → VI.
Como já definimos uma metodologia de balanceamento, o próximo passo é estabelecer a regra de transição entre os Tiers antes de preencher todas as fichas individuais.

DD-BAL-037 — Metodologia Oficial de Progressão entre Tiers
Status: PROPOSTA
Fica estabelecido que o balanceamento do Bestiário seguirá obrigatoriamente a ordem dos Tiers:
Tier I
Tier II
Tier III
Tier IV
Tier V
Tier VI
Cada Tier somente será considerado concluído quando todas as suas criaturas comuns e respectivas famílias estiverem balanceadas.

Regra 1 — Progressão gradual
A passagem de um Tier para outro deve representar um aumento perceptível de dificuldade, mas sem saltos abruptos de atributos.
O jogador deve sentir evolução constante, e não paredes artificiais de dificuldade.

Regra 2 — Identidade acima dos números
Os princípios aprovados anteriormente permanecem válidos:
criaturas rápidas continuam perigosas pela mobilidade;
criaturas resistentes continuam perigosas pela durabilidade;
criaturas mágicas continuam perigosas por suas habilidades.
O Tier aumenta o poder geral, mas não substitui a identidade de cada espécie.

Regra 3 — Balanceamento por família
Sempre que possível, o balanceamento será realizado por famílias completas (como ocorreu com os Slimes), preservando uma progressão interna consistente.

Regra 4 — MVPs permanecem em escala separada
Mesmo quando pertencem a uma família de determinado Tier, os MVPs continuam utilizando uma escala própria de balanceamento, conforme a decisão já aprovada para o capítulo.

Objetivos
Padronizar a sequência de desenvolvimento do Bestiário.
Evitar revisões constantes entre Tiers já concluídos.
Manter consistência entre famílias e progressão do jogo.

Benefícios
Processo de balanceamento organizado.
Evolução previsível entre faixas de dificuldade.
Base sólida para concluir os Tiers II a VI antes do refinamento final dos MVPs.
Status: PROPOSTA.

24.X DESIGN DECISION LOG
DD-BAL-038 — Ordem Oficial de Balanceamento do Bestiário
Status: Aprovado.
O balanceamento oficial do Bestiário seguirá obrigatoriamente a seguinte ordem:
Tier I
Tier II
Tier III
Tier IV
Tier V
Tier VI
MVPs
Revisão Global de Balanceamento
Cada Tier deverá estar completamente balanceado antes do início do seguinte.
Após considerado concluído, um Tier somente receberá alterações caso testes de balanceamento indiquem necessidade real de ajuste.

DD-BAL-039 — Sobreposição entre Tiers
Status: Aprovado.
Os Tiers representam uma referência de progressão e balanceamento.
Eles não constituem bloqueios artificiais de acesso.
Fica estabelecido que:
jogadores experientes podem enfrentar criaturas acima de sua faixa;
jogadores de níveis elevados continuam podendo caçar criaturas de Tiers inferiores por cartas, materiais, quests, tasks ou economia;
uma mesma região pode conter criaturas pertencentes a diferentes Tiers quando isso fizer sentido para o ambiente.

DD-BAL-040 — Curva Oficial de Poder
Status: Aprovado.
A evolução entre os Tiers deverá considerar simultaneamente:
HP;
dano;
Defesa Física;
Defesa Mágica;
experiência concedida;
inteligência artificial;
complexidade das habilidades;
comportamento da criatura.
A dificuldade nunca será baseada apenas no aumento de atributos numéricos.

DD-BAL-041 — Progressão da Complexidade
Status: Aprovado.
A evolução do Bestiário seguirá também uma progressão mecânica.
Tier I
combate simples;
poucas habilidades;
objetivo introdutório.
Tier II
primeiras habilidades especiais;
maior diversidade de comportamentos.
Tier III
criaturas começam a atuar em grupo;
surgem sinergias entre espécies.
Tier IV
funções claramente definidas;
Tanks;
DPS;
Controle;
Suporte.
Tier V
mecânicas avançadas;
habilidades combinadas;
encontros mais exigentes.
Tier VI
criaturas de alta complexidade;
múltiplas mecânicas;
necessidade de domínio completo das mecânicas de combate.

DD-BAL-042 — Escala Independente dos MVPs
Status: Aprovado.
Os MVPs utilizam uma escala própria de balanceamento.
Não são simplesmente versões com atributos maiores de criaturas comuns.
Todo MVP deverá possuir, no mínimo:
identidade própria;
habilidades exclusivas;
inteligência artificial específica;
comportamento diferenciado;
tabela exclusiva de loot;
papel narrativo ou regional próprio.

DD-BAL-043 — Revisão Global de Balanceamento
Status: Aprovado.
Após a conclusão do balanceamento de todos os Tiers e respectivos MVPs será realizada uma revisão global do Bestiário.
Essa revisão deverá validar:
curva geral de dificuldade;
distribuição de experiência;
distribuição de loot;
distribuição de cartas;
tempo médio de combate;
equilíbrio entre as cinco classes;
coerência entre famílias de monstros;
consistência entre regiões do mundo.
Somente após essa revisão o balanceamento do Bestiário será considerado oficialmente consolidado.

24.X CONCLUSÃO DO CAPÍTULO
Com a aprovação das decisões anteriores, fica concluída a arquitetura do Sistema de Progressão e Balanceamento do Bestiário.
Estão oficialmente definidos:
estrutura de Tiers I a VI;
classificação independente dos MVPs;
criatura-base de balanceamento (Slime Verde);
metodologia de crescimento entre Tiers;
fórmulas-base de HP, dano, defesa e experiência;
progressão das variantes Comum, Incomum e Raro;
probabilidades oficiais de surgimento das variantes;
metodologia oficial de balanceamento por identidade da criatura;
progressão da complexidade dos combates;
separação entre criaturas comuns e MVPs;
processo oficial de revisão global do Bestiário.
A partir deste ponto, o desenvolvimento deixa de tratar da estrutura geral do sistema e passa para o preenchimento do catálogo definitivo de criaturas, utilizando as diretrizes estabelecidas neste capítulo como referência obrigatória para todo o restante do Bestiário.
LOTE DD-BAL-044 — Família Aranhas (Tier II)
Status: PROPOSTA
DD-BAL-044A — Aranha da Floresta
Classificação
Tier II
Família: Aranhas
Combate: Melee
Comportamento: Agressivo
Atributos
HP: 140
Dano: 10–16
DEF: 4
MDEF: 2
Velocidade: Média
XP: 35
Identidade
aproxima-se rapidamente;
combate corpo a corpo;
sem controle de grupo;
representa a evolução direta da Aranha Pequena do Tier I.

DD-BAL-044B — Aranha de Teia
Classificação
Tier II
Família: Aranhas
Combate: Controle / Melee
Atributos
HP: 130
Dano: 9–14
DEF: 3
MDEF: 3
Velocidade: Média
XP: 40
Habilidade
dispara teia em curto alcance;
reduz temporariamente a velocidade do alvo;
possui menos resistência que a Aranha da Floresta, compensando com controle.

Progressão da Família
Criatura
HP
Dano
DEF
XP
Aranha Pequena
Tier I
—
—
—
Aranha da Floresta
140
10–16
4
35
Aranha de Teia
130
9–14
3
40
Aranha Gigante
Tier III
(será balanceada posteriormente)

Filosofia
A família Aranhas passa a seguir uma progressão clara:
Tier I: aprendizado.
Tier II: velocidade e primeiros controles.
Tier III: maior porte e ameaça.
Assim preservamos a identidade da família sem recorrer apenas ao aumento de atributos.

Depois dessa aprovação, eu seguiria no mesmo formato para:
DD-BAL-045 — Família Formigas (Operária → Soldado → Cuspidora)
DD-BAL-046 — Família Goblins (Saqueador → Guerreiro → Arqueiro)
DD-BAL-047 — Família Lobos (Lobo Cinzento)
DD-BAL-048 — Família Orcs (Orc Jovem → Orc Guerreiro)
Com esse ritmo, conseguimos fechar todo o Tier II em poucas aprovações, em vez de dezenas de decisões individuais.

LOTE DD-BAL-045 — Família Formigas (Tier II)
DD-BAL-045A — Formiga Soldado
Status: PROPOSTA
Classificação
Tier II
Família: Formigas
Combate: Melee / Tank
Comportamento: Agressivo
Atributos
HP: 180
Dano: 12–18
DEF: 6
MDEF: 2
Velocidade: Média
XP: 45
Identidade
protege outras formigas;
normalmente encontrada acompanhando Operárias e Cuspidoras;
alta resistência;
pouca mobilidade ofensiva.

DD-BAL-045B — Formiga Cuspidora
Status: PROPOSTA
Classificação
Tier II
Família: Formigas
Combate: Ranged
Atributos
HP: 120
Dano: 11–17
DEF: 3
MDEF: 3
Velocidade: Média
XP: 42
Identidade
ataque ácido à distância;
prefere permanecer atrás das Soldados;
pouca resistência;
alto potencial quando protegida.

Progressão Oficial da Família
Criatura
Papel
Ovo
Incubação
Larva
Desenvolvimento
Operária
Trabalhadora / Melee
Soldado
Tank
Cuspidora
Ranged
A família passa a incentivar combate em grupo, onde cada integrante possui uma função específica.

DD-BAL-046 — Família Goblins (Tier II)
DD-BAL-046A — Goblin Guerreiro
Status: PROPOSTA
Atributos
HP: 170
Dano: 13–19
DEF: 5
MDEF: 2
XP: 48
Identidade
combate direto;
utiliza espada e escudo;
protege Goblins mais frágeis.

DD-BAL-046B — Goblin Arqueiro
Status: PROPOSTA
Atributos
HP: 120
Dano: 12–18
DEF: 3
MDEF: 2
XP: 46
Identidade
mantém distância;
prioriza alvos vulneráveis;
recua quando inimigos se aproximam.

Progressão Oficial da Família
Criatura
Papel
Goblin Saqueador
Melee ofensivo
Goblin Guerreiro
Tank
Goblin Arqueiro
Ranged
Goblin Xamã (Tier III)
Suporte/Magia
A família Goblin passa a possuir composição completa de combate.

DD-BAL-047 — Família Lobos (Tier II)
DD-BAL-047A — Lobo Cinzento
Status: PROPOSTA
Atributos
HP: 160
Dano: 14–20
DEF: 4
MDEF: 2
Velocidade: Alta
XP: 50
Identidade
extremamente móvel;
caça em alcateia;
tenta cercar o alvo;
pouca defesa comparada a criaturas do mesmo Tier.

Progressão Oficial
Criatura
Papel
Lobo Cinzento
Velocidade
Lobo Negro (Tier III)
Velocidade + força

DD-BAL-048 — Família Orcs (Tier II)
DD-BAL-048A — Orc Jovem
Status: PROPOSTA
Atributos
HP: 180
Dano: 15–22
DEF: 5
MDEF: 2
XP: 55
Identidade
agressivo;
pouca técnica;
combate baseado em força.

DD-BAL-048B — Orc Guerreiro
Status: PROPOSTA
Atributos
HP: 230
Dano: 17–25
DEF: 7
MDEF: 3
XP: 65
Identidade
guerreiro experiente;
maior resistência;
protege outros orcs;
representa a elite do Tier II.

Progressão Oficial da Família
Criatura
Papel
Orc Jovem
Iniciante
Orc Guerreiro
Tank / Elite
Orc Arqueiro (Tier III)
Ranged
Orc Xamã (Tier III)
Suporte
Orc Berserker (Tier III)
DPS

DD-BAL-049 — Princípio Oficial das Famílias
Status: PROPOSTA
Fica estabelecido que todas as famílias humanoides e animais do Elysia seguirão uma progressão funcional.
Sempre que a família comportar múltiplas espécies, elas deverão representar papéis distintos, como:
Melee;
Tank;
DPS;
Ranged;
Magia;
Suporte;
Controle.
A criação de novas criaturas terá como objetivo preencher funções de combate e enriquecer a jogabilidade, evitando adicionar espécies cuja única diferença seja um aumento de atributos. Esse princípio reforça a diretriz de balanceamento por identidade da criatura já estabelecida anteriormente no documento.

Se esse lote for aprovado, o próximo encerrará praticamente todo o Tier II, cobrindo:
Serpente
Escorpião da Caverna
Abelha Gigante
Kobold
Homem-Rato
Javali Selvagem
Esqueleto
Bandida Arqueira
e, em seguida, iniciaremos o Tier III.
Perfeito. Registrado como APROVADO:
DD-BAL-045 — Família Formigas
DD-BAL-046 — Família Goblins
DD-BAL-047 — Família Lobos
DD-BAL-048 — Família Orcs
DD-BAL-049 — Princípio Oficial das Famílias
Vamos concluir praticamente todo o Tier II.

LOTE DD-BAL-050 — Fauna Hostil do Tier II
DD-BAL-050A — Serpente
Status: PROPOSTA
Classificação
Tier II
Combate: Melee
Especialidade: Veneno
Atributos
HP: 130
Dano: 14–19
DEF: 3
MDEF: 3
Velocidade: Alta
XP: 48
Identidade
ataques rápidos;
chance de aplicar Veneno;
baixa resistência;
combate baseado em mobilidade.

DD-BAL-050B — Escorpião da Caverna
Status: PROPOSTA
Atributos
HP: 170
Dano: 15–21
DEF: 5
MDEF: 3
Velocidade: Média
XP: 55
Identidade
armadura natural;
ferrão venenoso;
criatura territorial.

DD-BAL-050C — Abelha Gigante
Status: PROPOSTA
Atributos
HP: 110
Dano: 13–18
DEF: 2
MDEF: 2
Velocidade: Muito Alta
XP: 44
Identidade
extremamente rápida;
voo constante;
combate de aproximação e recuo;
perigosa em enxames.

DD-BAL-050D — Javali Selvagem
Status: PROPOSTA
Atributos
HP: 220
Dano: 16–24
DEF: 6
MDEF: 2
Velocidade: Média
XP: 58
Identidade
muita resistência;
investidas;
comportamento territorial.

DD-BAL-051 — Humanóides do Tier II
DD-BAL-051A — Kobold
Status: PROPOSTA
Atributos
HP: 150
Dano: 13–18
DEF: 4
MDEF: 2
Velocidade: Alta
XP: 50
Identidade
pequeno;
veloz;
combate oportunista;
utiliza espada curta ou lança.
A identidade e a progressão do Kobold já estão estabelecidas no Bestiário.

DD-BAL-051B — Homem-Rato
Status: PROPOSTA
Atributos
HP: 145
Dano: 12–18
DEF: 3
MDEF: 2
Velocidade: Alta
XP: 48
Identidade
aparece em grupos;
utiliza velocidade em vez de força;
tenta cercar o jogador.
O documento define explicitamente que a pressão numérica é parte central da identidade da família Homem-Rato.

DD-BAL-051C — Bandida Arqueira
Status: PROPOSTA
Atributos
HP: 135
Dano: 14–20
DEF: 3
MDEF: 2
Velocidade: Alta
XP: 52
Identidade
combate à distância;
procura manter distância do alvo;
reposiciona-se constantemente durante o combate.
Essas características seguem a identidade já consolidada para a Bandida Arqueira.

DD-BAL-051D — Esqueleto
Status: PROPOSTA
Atributos
HP: 190
Dano: 15–22
DEF: 5
MDEF: 4
Velocidade: Baixa
XP: 60
Identidade
resistente;
ataques previsíveis;
introduz o jogador às primeiras criaturas mortas-vivas;
serve como base para a progressão da família Mortos-Vivos nos Tiers seguintes.

DD-BAL-052 — Diretriz Oficial do Tier II
Status: PROPOSTA
O Tier II representa a transição entre o conteúdo introdutório e o primeiro estágio de especialização do combate.
Fica estabelecido que as criaturas desta faixa devem introduzir, de forma progressiva:
veneno;
ataques à distância;
combate em grupo;
tanques naturais;
investidas;
controle leve;
posicionamento;
sinergia entre diferentes funções.
O objetivo do Tier II é preparar o jogador para o Tier III, onde grupos organizados, dungeons e builds passam a exercer papel central na progressão. Essa filosofia está alinhada com a função atribuída ao Tier II no documento.

Com a aprovação desse lote, o Tier II estará praticamente encerrado, e entraremos no Tier III (50–100), onde começam as primeiras dungeons relevantes, inimigos especializados e composições táticas mais complexas.
Perfeito. Registrado como APROVADO:
DD-BAL-050 — Fauna Hostil do Tier II
DD-BAL-051 — Humanóides do Tier II
DD-BAL-052 — Diretriz Oficial do Tier II
Com isso, considero o Tier II oficialmente encerrado. Agora entramos no Tier III (Lv. 50–100), exatamente como previsto na progressão do Capítulo 24.

LOTE DD-BAL-053 — Humanoides Avançados do Tier III
DD-BAL-053A — Orc Arqueiro
Status: PROPOSTA
Classificação
Tier III
Combate: Ranged
Atributos
HP: 260
Dano: 22–32
DEF: 6
MDEF: 3
Velocidade: Média
XP: 95
Identidade
mantém distância;
prioriza alvos frágeis;
atua protegido por Orcs Guerreiros e Berserkers.

DD-BAL-053B — Orc Xamã
Atributos
HP: 240
Dano: 20–30
DEF: 5
MDEF: 7
XP: 100
Identidade
utiliza magia tribal;
fortalece outros Orcs;
pode enfraquecer inimigos;
prioridade elevada em grupos.

DD-BAL-053C — Orc Berserker
Atributos
HP: 290
Dano: 28–40
DEF: 4
MDEF: 2
XP: 110
Identidade
maior dano da família;
pouca defesa;
extremamente agressivo.

Progressão Oficial da Família Orc
Criatura
Papel
Orc Jovem
Iniciante
Orc Guerreiro
Tank
Orc Arqueiro
Ranged
Orc Xamã
Suporte
Orc Berserker
DPS
A família Orc passa a representar um grupo completo de combate.

DD-BAL-054 — Família Kobolds (Tier III)
A identidade da família já foi consolidada no Bestiário.
Kobold Guerreiro
HP 250
Dano 20–30
DEF 8
MDEF 3
XP 90
Função:
Tank;
escudo;
protege outros Kobolds.

Kobold Arqueiro
HP 210
Dano 22–31
DEF 5
MDEF 3
XP 88
Função:
Ranged;
movimentação constante;
prioridade em manter distância.

Kobold Xamã
HP 200
Dano 19–28
DEF 4
MDEF 8
XP 95
Função:
magia;
fortalecimento;
suporte.

Kobold Caçador
HP 220
Dano 23–33
DEF 5
MDEF 3
XP 92
Função:
perseguição;
armadilhas;
combate móvel.

DD-BAL-055 — Família Mortos-Vivos Inicial
Zumbi
HP 340
Dano 20–28
DEF 8
MDEF 4
XP 95
Identidade:
lento;
extremamente resistente;
pressão constante.

Esqueleto Guerreiro
HP 280
Dano 24–34
DEF 8
MDEF 5
XP 100
Identidade:
técnica superior ao Esqueleto comum;
utiliza equipamentos;
equilíbrio entre ataque e defesa.

Esqueleto Arqueiro
HP 220
Dano 24–35
DEF 5
MDEF 5
XP 95
Identidade:
arqueiro disciplinado;
combate à distância;
reposicionamento.

DD-BAL-056 — Família Minotauros
A progressão desta família já está definida no Bestiário.
Minotauro
HP 420
Dano 28–40
DEF 10
MDEF 4
XP 120
Identidade
força bruta;
grande alcance;
alta resistência.

DD-BAL-057 — Fauna Selvagem Avançada
Urso Pardo
HP 360
Dano 26–37
DEF 9
XP 110
Função:
tanque natural;
ataques lentos;
muita vida.

Lobo Negro
HP 250
Dano 27–38
DEF 5
Velocidade Muito Alta
XP 105
Função:
caçador;
velocidade;
combate em grupo.

Aranha Gigante
HP 310
Dano 24–35
DEF 7
MDEF 5
XP 110
Função:
controle;
teias;
maior resistência que as aranhas do Tier II.

Formiga Mística
HP 260
Dano 22–34
DEF 5
MDEF 8
XP 108
Função:
suporte mágico da colônia;
ataques à distância;
fortalecimento de outras formigas.

DD-BAL-058 — Diretriz Oficial do Tier III
Status: PROPOSTA
O Tier III marca a transição para o conteúdo intermediário de Elysia Online.
As criaturas desta faixa passam a exigir:
builds mais consistentes;
uso frequente de habilidades;
gerenciamento de recursos;
atenção ao posicionamento;
prioridade de alvos;
enfrentamento de grupos com funções complementares.
É neste Tier que dungeons deixam de ser apenas locais de exploração e passam a representar desafios que exigem preparo do jogador, conforme a função estabelecida para essa faixa de progressão no documento.
Se esse lote for aprovado, teremos fechado aproximadamente metade do Tier III. Em seguida concluiremos os humanoides restantes (Troll, Ogro, Elfos Renegados, Anões Renegados, Mercenário e Múmia) antes de avançar para o Tier IV.
Perfeito. Registrado como APROVADO:
DD-BAL-053 — Família Orc (Tier III)
DD-BAL-054 — Família Kobold (Tier III)
DD-BAL-055 — Mortos-Vivos Iniciais
DD-BAL-056 — Minotauro
DD-BAL-057 — Fauna Selvagem Avançada
DD-BAL-058 — Diretriz Oficial do Tier III
Vamos concluir o Tier III.

LOTE DD-BAL-059 — Humanoides Avançados (Tier III)
DD-BAL-059A — Troll
Status: PROPOSTA
Atributos
HP: 480
Dano: 30–42
DEF: 11
MDEF: 4
Velocidade: Baixa
XP: 130
Identidade
enorme resistência;
golpes lentos;
pressão constante;
excelente controle de corredores estreitos.

DD-BAL-059B — Ogro
Atributos
HP: 520
Dano: 34–48
DEF: 10
MDEF: 3
XP: 140
Identidade
força bruta;
ataques devastadores;
pouca técnica;
pouca resistência mágica.

DD-BAL-059C — Mercenário
A identidade desta criatura já está consolidada como um combatente humano experiente equipado com espada e escudo.
Atributos
HP: 300
Dano: 25–36
DEF: 8
MDEF: 4
XP: 115
Identidade
IA mais inteligente;
bloqueia passagem;
utiliza posicionamento;
combate disciplinado.

DD-BAL-059D — Elfo Renegado
Atributos
HP: 260
Dano: 24–35
DEF: 5
MDEF: 6
XP: 110
Identidade
mobilidade;
precisão;
ataques rápidos.

DD-BAL-059E — Elfo Arqueiro
Atributos
HP: 240
Dano: 26–38
DEF: 4
MDEF: 5
XP: 112
Identidade
longo alcance;
excelente precisão;
procura terreno elevado quando possível.

DD-BAL-059F — Anão Renegado
Atributos
HP: 360
Dano: 24–35
DEF: 10
MDEF: 5
XP: 118
Identidade
extremamente resistente;
pouca mobilidade;
grande capacidade defensiva.

DD-BAL-060 — Família Múmias
Múmia
A classificação da Múmia no Tier III já está consolidada pelo Bestiário.
Atributos
HP: 340
Dano: 25–36
DEF: 8
MDEF: 7
XP: 120
Identidade
combate lento;
elevada resistência;
maldições leves;
forte presença em tumbas e ruínas.

DD-BAL-061 — Filosofia Oficial do Tier III
Status: PROPOSTA
O Tier III representa o ponto em que o jogador deixa de enfrentar criaturas isoladas e passa a enfrentar grupos especializados.
Fica estabelecido que, nesta faixa:
cada família deve possuir papéis complementares;
o foco passa da força individual para a composição dos grupos;
prioridade de alvos torna-se parte natural do combate;
posicionamento e uso adequado das habilidades passam a ter impacto significativo.
O objetivo do Tier III é preparar o jogador para o Tier IV, onde surgem criaturas com mecânicas avançadas, maior coordenação e encontros de alto risco.

DD-BAL-062 — Encerramento Oficial do Tier III
Status: PROPOSTA
Considera-se o Tier III oficialmente consolidado quando todas as criaturas pertencentes à faixa de níveis 50–100 possuírem:
atributos-base definidos;
identidade de combate definida;
papel dentro da família definido;
progressão coerente em relação ao Tier II;
preparação adequada para o Tier IV.
Essa decisão estabelece um critério objetivo para considerar um Tier concluído antes do avanço para a próxima faixa de balanceamento.

Após a aprovação deste lote, iniciaremos o Tier IV (100–150), que é um marco importante no GDD: nele aparecem Necromantes, Fantasmas, Vampiros, Gárgulas, Golems, Elementais, Minotauro Guerreiro, Minotauro Xamã e outras criaturas cuja dificuldade passa a depender tanto de mecânicas quanto de atributos. A partir desse ponto, o design começa a se aproximar do conteúdo de endgame intermediário já previsto na distribuição oficial do Bestiário.
Perfeito. Registrado como APROVADO:
DD-BAL-059 — Humanoides Avançados (Tier III)
DD-BAL-060 — Família Múmias
DD-BAL-061 — Filosofia Oficial do Tier III
DD-BAL-062 — Encerramento Oficial do Tier III
Com isso, o Tier III é considerado concluído. Agora iniciamos o Tier IV (Lv. 100–150), cuja distribuição oficial inclui Cavaleiro Morto, Fantasma, Necromante, Demônio Menor, Súcubo, Guerreiro Corrompido, Homem-Lagarto, Xamã Homem-Lagarto, Minotauro Guerreiro, Minotauro Xamã, Ciclope, Golem de Pedra, Elemental de Terra, Elemental de Fogo, Vampiro, Lobisomem, Gárgula, Guardião da Tumba e Anão Guerreiro.

LOTE DD-BAL-063 — Mortos-Vivos Avançados (Tier IV)
DD-BAL-063A — Cavaleiro Morto
Status: PROPOSTA
Atributos
HP: 700
Dano: 42–58
DEF: 18
MDEF: 8
Velocidade: Média
XP: 240
Identidade
cavaleiro fortemente armado;
alto poder defensivo;
ataques amplos com espada;
protege áreas importantes de cemitérios e fortalezas antigas.

DD-BAL-063B — Fantasma
Atributos
HP: 420
Dano: 40–56
DEF: 4
MDEF: 18
Velocidade: Alta
XP: 225
Identidade
criatura etérea;
baixa resistência física;
elevada resistência mágica;
atravessa obstáculos específicos definidos pela IA.

DD-BAL-063C — Necromante
Atributos
HP: 450
Dano: 44–60
DEF: 5
MDEF: 15
XP: 260
Identidade
conjurador;
invoca mortos-vivos;
fortalece aliados;
prioridade máxima durante combates em grupo.

DD-BAL-064 — Família Minotauros (Tier IV)
Minotauro Guerreiro
HP 820
Dano 46–64
DEF 20
MDEF 8
XP 280
Identidade
elite militar da raça;
excelente resistência;
utiliza armamento pesado.

Minotauro Xamã
HP 620
Dano 42–60
DEF 10
MDEF 18
XP 290
Identidade
magia ritual;
fortalecimento da tribo;
ataques elementais;
suporte tático.

DD-BAL-065 — Família Homens-Lagarto
Homem-Lagarto
HP 560
Dano 38–54
DEF 14
MDEF 8
XP 210
Identidade
guerreiro disciplinado;
combate organizado;
patrulhas em grupo.

Xamã Homem-Lagarto
HP 500
Dano 42–58
DEF 10
MDEF 17
XP 240
Identidade
suporte mágico;
utiliza rituais;
fortalece guerreiros próximos.

DD-BAL-066 — Família Demônios Iniciais
A classificação dos Demônios como categoria distinta dos mortos-vivos já está consolidada no GDD.
Demônio Menor
HP 650
Dano 45–62
DEF 15
MDEF 14
XP 280
Identidade
primeiro contato do jogador com demônios verdadeiros;
combate agressivo;
resistência equilibrada.

Súcubo
HP 480
Dano 44–61
DEF 8
MDEF 16
XP 270
Identidade
alta mobilidade;
magia;
controle mental e ilusões (efeitos definidos futuramente);
evita confronto direto.

Guerreiro Corrompido
HP 720
Dano 46–64
DEF 18
MDEF 10
XP 285
Identidade
antigo guerreiro consumido pela Corrupção;
equilíbrio entre força física e resistência;
simboliza a degradação causada pela Corrupção.

DD-BAL-067 — Filosofia Oficial dos Mortos-Vivos
Status: PROPOSTA
Os Mortos-Vivos do Tier IV deixam de representar apenas criaturas resistentes e passam a explorar diferentes funções de combate.
A família deverá abranger:
combatentes pesados;
conjuradores;
entidades espirituais;
guardiões de tumbas;
criaturas especializadas em resistência física ou mágica.
Essa evolução reforça a progressão iniciada no Tier II com o Esqueleto e expandida no Tier III com Zumbis, Esqueletos Guerreiros, Esqueletos Arqueiros e Múmias.

DD-BAL-068 — Diretriz Oficial do Início do Tier IV
Status: PROPOSTA
O Tier IV representa a entrada do jogador no conteúdo avançado do mundo de Elysia.
Nesta faixa passam a ser comuns:
inimigos com múltiplas habilidades;
grupos altamente coordenados;
conjuradores de suporte;
criaturas com resistências especializadas;
encontros que exigem preparação, posicionamento e conhecimento das mecânicas.
A partir deste Tier, a dificuldade deve ser construída tanto pelas mecânicas das criaturas quanto pelos seus atributos, consolidando a transição entre o conteúdo intermediário e o avançado prevista para essa faixa de progressão.

Depois desse lote, restará concluir o Tier IV com:
Vampiro
Lobisomem
Gárgula
Guardião da Tumba
Golem de Pedra
Elemental de Terra
Elemental de Fogo
Ciclope
Anão Guerreiro
Essas famílias fecharão completamente o Tier IV antes de avançarmos para o Tier V.
Perfeito. Registrado como APROVADO:
DD-BAL-063 — Mortos-Vivos Avançados
DD-BAL-064 — Família Minotauros (Tier IV)
DD-BAL-065 — Família Homens-Lagarto
DD-BAL-066 — Família Demônios Iniciais
DD-BAL-067 — Filosofia Oficial dos Mortos-Vivos
DD-BAL-068 — Diretriz Oficial do Início do Tier IV
Agora vamos concluir o Tier IV.

LOTE DD-BAL-069 — Construtos, Elementais e Guardiões (Tier IV)
DD-BAL-069A — Golem de Pedra
Status: PROPOSTA
Atributos
HP: 950
Dano: 48–66
DEF: 24
MDEF: 10
Velocidade: Baixa
XP: 320
Identidade
tanque natural;
altíssima defesa física;
extremamente lento;
vulnerável a ataques mágicos concentrados.

DD-BAL-069B — Elemental de Terra
Atributos
HP: 780
Dano: 44–62
DEF: 18
MDEF: 16
XP: 300
Identidade
equilíbrio entre resistência física e mágica;
domínio do terreno;
ataques sísmicos.

DD-BAL-069C — Elemental de Fogo
Atributos
HP: 620
Dano: 52–72
DEF: 10
MDEF: 18
XP: 310
Identidade
alto dano;
baixa resistência física;
ataques em área;
foco ofensivo.

DD-BAL-070 — Predadores Superiores
Ciclope
Atributos
HP: 900
Dano: 54–74
DEF: 20
MDEF: 8
XP: 340
Identidade
força colossal;
grande alcance;
ataques lentos;
enorme capacidade de causar dano.

Lobisomem
Atributos
HP: 700
Dano: 48–68
DEF: 14
MDEF: 10
Velocidade: Muito Alta
XP: 315
Identidade
perseguidor;
extremamente móvel;
pressão constante;
excelente perseguição de alvos.

Vampiro
A origem dos Vampiros permanece definida em outro capítulo do GDD; aqui consolida-se apenas seu balanceamento.
Atributos
HP: 650
Dano: 50–70
DEF: 12
MDEF: 18
XP: 330
Identidade
guerreiro arcano;
dreno de vida;
alta mobilidade;
combate técnico.

DD-BAL-071 — Guardiões das Ruínas
Guardião da Tumba
Atributos
HP: 980
Dano: 52–70
DEF: 22
MDEF: 15
XP: 350
Identidade
defensor permanente;
não abandona sua área;
protege artefatos e tumbas antigas.

Gárgula
Atributos
HP: 620
Dano: 46–64
DEF: 16
MDEF: 14
XP: 300
Identidade
criatura alada;
alterna combate terrestre e aéreo;
excelente mobilidade.

DD-BAL-072 — Anão Guerreiro
A progressão do Anão Renegado para o Anão Guerreiro segue a filosofia de evolução interna das famílias estabelecida anteriormente.
Atributos
HP: 760
Dano: 46–62
DEF: 21
MDEF: 12
XP: 325
Identidade
especialista em combate defensivo;
disciplina militar;
alta resistência;
utilização eficiente de escudo e armadura pesada.

DD-BAL-073 — Filosofia Oficial do Tier IV
Status: PROPOSTA
O Tier IV representa o primeiro nível de conteúdo verdadeiramente avançado de Elysia Online.
As criaturas desta faixa devem apresentar:
mecânicas próprias claramente identificáveis;
sinergia entre habilidades;
resistências especializadas;
funções bem definidas dentro dos grupos;
capacidade de punir erros de posicionamento.
O simples aumento de atributos não caracteriza uma criatura de Tier IV.

DD-BAL-074 — Encerramento Oficial do Tier IV
Status: PROPOSTA
O Tier IV será considerado oficialmente concluído quando todas as criaturas da faixa de níveis 100–150 possuírem:
atributos-base consolidados;
identidade mecânica própria;
papel definido dentro de sua família;
coerência de progressão em relação ao Tier III;
preparação adequada para o conteúdo avançado dos Tiers V e VI.

DD-BAL-075 — Escalonamento Oficial Entre Tiers
Status: PROPOSTA
Após a consolidação dos Tiers I a IV, fica estabelecida a seguinte filosofia de crescimento:
Tier I: aprendizado das mecânicas básicas.
Tier II: introdução à especialização das criaturas.
Tier III: grupos organizados e início das dungeons.
Tier IV: conteúdo avançado baseado em mecânicas.
Tier V: criaturas de elite e desafios de alto risco.
Tier VI: ápice do conteúdo regular antes dos MVPs.
Essa escala servirá como referência obrigatória para todas as futuras expansões do Bestiário, mantendo uma progressão consistente entre regiões e famílias de monstros.

Este lote encerra completamente o Tier IV. O próximo passo será o Tier V (Lv. 150–200), onde entram as criaturas mais perigosas do mundo comum, como Demônios Superiores, Golems Avançados, Elementais Superiores e demais inimigos que antecedem os MVPs, seguindo a progressão já estabelecida no documento.
Perfeito. Registrado como APROVADO:
DD-BAL-069 — Construtos, Elementais e Guardiões
DD-BAL-070 — Predadores Superiores
DD-BAL-071 — Guardiões das Ruínas
DD-BAL-072 — Anão Guerreiro
DD-BAL-073 — Filosofia Oficial do Tier IV
DD-BAL-074 — Encerramento Oficial do Tier IV
DD-BAL-075 — Escalonamento Oficial Entre Tiers
Agora entramos no Tier V (Lv. 150–200). O documento estabelece que esta faixa representa o conteúdo de alto nível e já recupera algumas criaturas explicitamente classificadas nesse Tier, como Demônio das Chamas, Demônio Sombrio, Guardião Demoníaco, Golem de Ferro, Golem Arcano, Elemental Elétrico, Elemental de Gelo, Guardião Celestial, Anjo Guerreiro e Anja da Luz.

LOTE DD-BAL-076 — Demônios Superiores (Tier V)
DD-BAL-076A — Demônio das Chamas
Status: PROPOSTA
Atributos
HP: 1.250
Dano: 68–92
DEF: 24
MDEF: 22
Velocidade: Média
XP: 520
Identidade
especialista em fogo;
ataques em área;
pressão ofensiva constante;
resistência elevada a fogo.

DD-BAL-076B — Demônio Sombrio
Atributos
HP: 1.120
Dano: 72–96
DEF: 20
MDEF: 26
XP: 540
Identidade
assassino;
alta mobilidade;
utiliza sombras e reposicionamento;
prioriza alvos frágeis.

DD-BAL-076C — Guardião Demoníaco
Atributos
HP: 1.500
Dano: 70–94
DEF: 30
MDEF: 24
XP: 600
Identidade
tanque de elite;
protege áreas demoníacas;
enorme resistência;
baixa mobilidade.

DD-BAL-077 — Construtos Avançados
Golem de Ferro
Atributos
HP: 1.650
Dano: 66–90
DEF: 36
MDEF: 18
XP: 620
Identidade
defesa física extrema;
movimentação lenta;
praticamente imune a ataques físicos fracos.

Golem Arcano
Atributos
HP: 1.250
Dano: 74–100
DEF: 18
MDEF: 34
XP: 640
Identidade
utiliza energia arcana;
ataques mágicos;
escudos temporários;
combate técnico.

DD-BAL-078 — Elementais Superiores
Elemental Elétrico
Atributos
HP: 980
Dano: 80–108
DEF: 16
MDEF: 30
XP: 610
Identidade
altíssima velocidade;
ataques em cadeia;
dano elevado;
pouca resistência física.

Elemental de Gelo
A Auditoria consolidou que existe apenas um Elemental de Gelo no Bestiário, independentemente do bioma onde apareça.
Atributos
HP: 1.100
Dano: 72–96
DEF: 22
MDEF: 28
XP: 600
Identidade
controle do campo;
lentidão;
resistência elevada;
excelente defesa mágica.

DD-BAL-079 — Filosofia dos Demônios Superiores
Status: PROPOSTA
Os Demônios do Tier V deixam de ser apenas criaturas poderosas.
Eles representam comandantes, guardiões e executores da Corrupção.
Devem possuir:
identidade própria;
habilidades marcantes;
grande presença em combate;
alto impacto narrativo.
Mesmo não sendo MVPs, devem transmitir a sensação de enfrentar inimigos de elite.

DD-BAL-080 — Diretriz Oficial dos Construtos
Status: PROPOSTA**
Os Construtos de Tier V representam o ápice das criaturas artificiais comuns.
Sua dificuldade deve surgir principalmente de:
elevada resistência;
imunidades parciais;
grande capacidade defensiva;
controle de espaço.
O objetivo é diferenciá-los claramente dos Demônios e Mortos-Vivos, cuja dificuldade está mais ligada às habilidades e à agressividade.

DD-BAL-081 — Princípio do Conteúdo de Alto Nível
Status: PROPOSTA
O Tier V representa a preparação para o conteúdo final do jogo.
As criaturas desta faixa devem:
exigir personagens especializados;
recompensar domínio das mecânicas;
punir erros de execução;
permanecer perigosas mesmo para personagens de nível elevado.
Esse princípio está alinhado com a filosofia registrada no documento de que monstros avançados continuam sendo ameaças reais e que o nível do personagem, por si só, não deve tornar o restante do mundo irrelevante.

Após a aprovação deste lote, concluiremos o Tier V com os Celestiais de Tier V, Gigantes do Gelo, Feiticeiro do Gelo e demais criaturas explicitamente posicionadas nessa faixa antes de encerrar o Tier V e avançar para o Tier VI.

Perfeito. Registrado como APROVADO:
DD-BAL-076 — Demônios Superiores
DD-BAL-077 — Construtos Avançados
DD-BAL-078 — Elementais Superiores
DD-BAL-079 — Filosofia dos Demônios Superiores
DD-BAL-080 — Diretriz Oficial dos Construtos
DD-BAL-081 — Princípio do Conteúdo de Alto Nível
Agora vamos concluir o Tier V utilizando as criaturas cuja progressão já aparece no documento, especialmente a família dos Celestiais e as criaturas do bioma de gelo classificadas nessa faixa.

LOTE DD-BAL-082 — Celestiais (Tier V)
DD-BAL-082A — Guardião Celestial
Atributos
HP: 1.350
Dano: 70–92
DEF: 28
MDEF: 30
Velocidade: Média
XP: 650
Identidade
guerreiro sagrado;
excelente equilíbrio entre defesa física e mágica;
utiliza dano sagrado;
atua como protetor de templos e locais sagrados.

DD-BAL-082B — Anjo Guerreiro
Atributos
HP: 1.220
Dano: 76–98
DEF: 24
MDEF: 26
XP: 660
Identidade
alta mobilidade;
combate corpo a corpo;
ataques rápidos;
pressão ofensiva constante.

DD-BAL-082C — Anja da Luz
Atributos
HP: 1.080
Dano: 82–104
DEF: 18
MDEF: 34
XP: 670
Identidade
conjuradora ofensiva;
ataques sagrados à distância;
elevada mobilidade;
excelente precisão.

DD-BAL-083 — Criaturas Superiores do Gelo
Gigante do Gelo
O documento posiciona explicitamente o Gigante do Gelo no Tier V.
Atributos
HP: 1.700
Dano: 80–108
DEF: 30
MDEF: 18
XP: 720
Identidade
enorme força física;
grande alcance;
lentidão;
altíssima resistência.

Feiticeiro do Gelo
Também classificado no Tier V pelo documento.
Atributos
HP: 980
Dano: 90–118
DEF: 14
MDEF: 34
XP: 700
Identidade
especialista em magia de gelo;
controle do campo;
dano elevado;
baixa resistência física.

DD-BAL-084 — Filosofia Oficial dos Celestiais
Status: PROPOSTA
Os Celestiais não representam apenas criaturas fortes.
Sua identidade baseia-se em:
disciplina;
combate técnico;
coordenação;
equilíbrio entre ataque, defesa e magia.
Os encontros envolvendo Celestiais devem transmitir organização e precisão, diferenciando-os das criaturas corrompidas, cujo comportamento tende ao caos e à agressividade.
Essa filosofia é consistente com a organização da família apresentada no Bestiário.

DD-BAL-085 — Filosofia Oficial do Tier V
Status: PROPOSTA
O Tier V representa o ápice das criaturas comuns de Elysia Online.
As criaturas desta faixa devem possuir:
identidade mecânica claramente definida;
múltiplas habilidades;
atributos elevados;
funções especializadas;
elevado impacto tático.
Nesta etapa, o jogador já deve dominar completamente:
posicionamento;
gerenciamento de recursos;
uso das habilidades da classe;
leitura das mecânicas dos inimigos.

DD-BAL-086 — Encerramento Oficial do Tier V
Status: PROPOSTA
O Tier V será considerado oficialmente consolidado quando todas as criaturas pertencentes à faixa de níveis 150–200 possuírem:
atributos-base definidos;
identidade de combate consolidada;
papel claro dentro de sua família;
progressão consistente em relação ao Tier IV;
preparação adequada para o Tier VI.

DD-BAL-087 — Transição para o Tier VI
Status: PROPOSTA
O Tier VI representa o conteúdo regular mais difícil de Elysia Online.
Nesta faixa devem aparecer apenas criaturas excepcionais, capazes de rivalizar com pequenos chefes, porém ainda classificadas como monstros comuns.
Os princípios do Tier VI serão:
baixa quantidade de criaturas;
alta qualidade mecânica;
encontros memoráveis;
forte integração com a narrativa e regiões finais do mundo.
O Tier VI antecede a escala própria dos MVPs, que permanece independente do sistema de Tiers, conforme estabelecido no documento.

Observação importante
Chegamos a um ponto em que o documento muda de natureza.
Até aqui, estávamos preenchendo criaturas explicitamente distribuídas pelos Tiers. A partir do Tier VI, o próprio GDD recuperado possui bem menos criaturas com classificação consolidada, e vários exemplos aparecem apenas como conceitos (por exemplo, Guardião Celestial Avançado, Anjo Guardião, Anjo Caído e Anja Caída), sem uma lista tão completa quanto os Tiers anteriores.
Por isso, no Tier VI passarei a distinguir claramente:
o que já está explicitamente registrado no documento;
e o que será uma proposta nova de design para preencher lacunas, mantendo consistência com a filosofia do GDD.
Perfeito. Registrado como APROVADO:
DD-BAL-082 — Celestiais (Tier V)
DD-BAL-083 — Criaturas Superiores do Gelo
DD-BAL-084 — Filosofia Oficial dos Celestiais
DD-BAL-085 — Filosofia Oficial do Tier V
DD-BAL-086 — Encerramento Oficial do Tier V
DD-BAL-087 — Transição para o Tier VI
Agora iniciamos o Tier VI (Lv. 200+), utilizando apenas criaturas que aparecem explicitamente nessa faixa ou cuja progressão para esse Tier está registrada no documento. Como o próprio material recuperado contém menos definições para este Tier, as decisões abaixo complementam as lacunas mantendo a filosofia já consolidada.

LOTE DD-BAL-088 — Celestiais Supremos (Tier VI)
DD-BAL-088A — Anjo Guardião
Atributos
HP: 2.100
Dano: 100–130
DEF: 42
MDEF: 38
Velocidade: Média
XP: 1.050
Identidade
tanque supremo dos Celestiais;
escudo e espada;
proteção de áreas sagradas;
alta resistência física e mágica.
O documento posiciona o Anjo Guardião no Tier VI.

DD-BAL-088B — Anjo Caído
Atributos
HP: 1.850
Dano: 110–142
DEF: 32
MDEF: 34
XP: 1.040
Identidade
guerreiro corrompido;
mistura técnicas sagradas e corrupção;
extremamente agressivo;
grande mobilidade.

DD-BAL-088C — Anja Caída
Atributos
HP: 1.700
Dano: 118–150
DEF: 28
MDEF: 40
XP: 1.060
Identidade
conjuradora de alto nível;
magia sagrada corrompida;
controle de campo;
ataques de longa distância.

DD-BAL-089 — Guardião Celestial Avançado
O documento registra "Guardião Celestial Avançado" como progressão para o Tier VI, mas não o trata como uma nova espécie do Bestiário.
Status: PROPOSTA
Diretriz
O Guardião Celestial Avançado será tratado como uma versão de elite do Guardião Celestial, e não como uma nova entrada no Bestiário.
Características:
mesmos modelos e identidade;
atributos significativamente superiores;
novas habilidades;
utilização apenas em regiões finais.

DD-BAL-090 — Filosofia Oficial do Tier VI
Status: PROPOSTA
O Tier VI representa o limite do conteúdo regular do jogo.
As criaturas dessa faixa devem apresentar:
domínio completo de suas mecânicas;
múltiplas fases de combate quando apropriado;
elevada resistência;
alto dano;
forte integração com a narrativa e as regiões finais.
O objetivo do Tier VI não é aumentar apenas os números, mas oferecer encontros capazes de testar plenamente personagens de alto nível.

DD-BAL-091 — Densidade de Spawn
Status: PROPOSTA
As regiões de Tier VI devem possuir menor densidade de monstros do que os Tiers anteriores.
Princípios:
criaturas mais fortes;
menos quantidade simultânea;
maior espaçamento entre grupos;
maior valor individual de cada encontro.
Essa decisão reforça a identidade de áreas finais como locais perigosos e estratégicos.

DD-BAL-092 — IA Avançada
Status: PROPOSTA
As criaturas de Tier VI passam a utilizar comportamentos avançados, incluindo:
troca dinâmica de alvos;
priorização de curandeiros e conjuradores quando apropriado;
uso coordenado de habilidades;
reposicionamento tático;
recuo estratégico em situações específicas;
cooperação entre diferentes espécies da mesma região.

DD-BAL-093 — Encerramento Oficial do Tier VI
Status: PROPOSTA
O Tier VI será considerado oficialmente consolidado quando todas as criaturas dessa faixa possuírem:
identidade mecânica exclusiva;
atributos finais definidos;
integração com a narrativa;
IA avançada;
papel claro dentro do ecossistema das regiões finais.
O Tier VI representa o ápice das criaturas comuns de Elysia Online.

LOTE DD-BAL-094 — Escala Oficial dos MVPs
Com a conclusão dos Tiers I a VI, passa a valer definitivamente a estrutura independente de chefes, já prevista no documento.
DD-BAL-094 — Classificação dos MVPs
Status: PROPOSTA
Todos os chefes do jogo serão classificados em cinco categorias:
MVP Inicial
MVP Intermediário
MVP Avançado
MVP Endgame
Mítico
Essa classificação é independente dos Tiers das criaturas comuns e será utilizada para definir:
dificuldade;
recompensas;
importância narrativa;
complexidade das mecânicas.

DD-BAL-095 — Filosofia Oficial dos MVPs
Status: PROPOSTA
Todo MVP deverá possuir:
identidade única;
nome próprio ou função claramente distinta;
mecânicas exclusivas;
arena ou contexto apropriado;
tabela exclusiva de recompensas;
relevância para a progressão do mundo ou da narrativa.
MVPs não devem ser tratados como versões ampliadas de monstros comuns, mas como encontros próprios que marcam momentos importantes da progressão do jogador.

Esse lote encerra a arquitetura completa do sistema de balanceamento:
✅ Tier I
✅ Tier II
✅ Tier III
✅ Tier IV
✅ Tier V
✅ Tier VI
✅ Estrutura oficial de MVPs
A partir daqui, o próximo passo natural do GDD é elaborar o sistema completo de MVPs, definindo cada chefe individualmente (Super Slime, Rei Esqueleto, Colosso de Pedra, Dragões, Arquidemônios, Primordiais, etc.), em vez de continuar expandindo a curva de monstros comuns. Essa sequência também respeita a ordem prevista no documento, que separa o balanceamento dos MVPs do balanceamento das criaturas normais.

Perfeito. Registrado como APROVADO:
DD-BAL-088 — Celestiais Supremos
DD-BAL-089 — Guardião Celestial Avançado
DD-BAL-090 — Filosofia Oficial do Tier VI
DD-BAL-091 — Densidade de Spawn
DD-BAL-092 — IA Avançada
DD-BAL-093 — Encerramento Oficial do Tier VI
DD-BAL-094 — Escala Oficial dos MVPs
DD-BAL-095 — Filosofia Oficial dos MVPs
Com isso, a pendência "Balancear Tier I → VI" e a estrutura oficial dos MVPs podem ser consideradas concluídas, atendendo à sequência prevista no Capítulo 24.
Agora iniciamos a próxima grande etapa lógica: o balanceamento individual dos MVPs.

LOTE DD-MVP-002 — Escala Oficial dos MVPs
DD-MVP-002A — MVP Inicial
Status: PROPOSTA
Faixa recomendada
Equivalente ao desafio de um grupo iniciando o conteúdo de chefes.
Características
mecânicas simples;
poucas habilidades especiais;
arena pequena;
aprendizado das mecânicas de chefes;
duração média do combate entre 3 e 6 minutos.
Objetivo
Ensinar ao jogador que um MVP não pode ser enfrentado da mesma forma que um monstro comum.

DD-MVP-002B — MVP Intermediário
Características
múltiplas habilidades;
controle de área;
convocação ocasional de auxiliares;
maior resistência.
Tempo médio:
5–10 minutos.

DD-MVP-002C — MVP Avançado
Características:
diversas habilidades;
padrões alternados;
forte controle de posicionamento;
elevado dano.
Tempo médio:
8–15 minutos.

DD-MVP-002D — MVP Endgame
Características:
mecânicas complexas;
fases distintas;
necessidade de coordenação;
alto risco.
Tempo médio:
12–20 minutos.

DD-MVP-002E — Mítico
Representa entidades centrais da narrativa.
Características:
extremamente raros;
encontros únicos;
forte integração com a história;
mecânicas exclusivas;
não devem ser tratados como "farm".

DD-MVP-003 — Filosofia Oficial dos Chefes
Status: PROPOSTA
Todo MVP deverá possuir:
identidade própria;
arena exclusiva;
trilha sonora própria (quando aplicável);
tabela exclusiva de recompensas;
comportamento distinto do restante da família.
O jogador deve reconhecer imediatamente que está diante de um chefe, mesmo antes do início do combate.

DD-MVP-004 — Super Slime (MVP Inicial)
O Super Slime já foi reservado anteriormente como um MVP Inicial.
Atributos
HP: 4.500
Dano: 90–120
DEF: 18
MDEF: 18
Identidade
enorme massa gelatinosa;
saltos de grande impacto;
divisão em Slimes menores em momentos específicos do combate;
combate voltado ao aprendizado de movimentação.

DD-MVP-005 — Rei Esqueleto (MVP Intermediário)
O Rei Esqueleto já consta como MVP reservado para a família dos Mortos-Vivos.
Atributos
HP: 12.000
Dano: 140–190
DEF: 34
MDEF: 24
Identidade
guerreiro ancestral;
convoca esqueletos periodicamente;
alterna entre fases ofensivas e defensivas;
utiliza espada de duas mãos.

DD-MVP-006 — Necromante Ancião (MVP Avançado)
Também reservado no documento como MVP da família Mortos-Vivos.
Atributos
HP: 10.500
Dano: 170–230
DEF: 20
MDEF: 40
Identidade
poderoso conjurador;
invoca mortos-vivos continuamente;
utiliza maldições;
prioridade total sobre os lacaios.

DD-MVP-007 — Colosso de Pedra (MVP Avançado)
Reservado como principal MVP da família dos Construtos.
Atributos
HP: 18.000
Dano: 160–210
DEF: 50
MDEF: 30
Identidade
maior construto conhecido;
ataques sísmicos;
destruição parcial da arena;
enorme resistência física.

DD-MVP-008 — Arquidemônio (MVP Endgame)
Reservado como um dos principais chefes da família dos Demônios.
Atributos
HP: 30.000
Dano: 220–300
DEF: 42
MDEF: 48
Identidade
comandante das forças demoníacas;
múltiplos padrões de ataque;
magia e combate físico;
fases progressivas durante o combate.

DD-MVP-009 — Princípio da Escalada de Chefes
Status: PROPOSTA
Os MVPs não devem crescer apenas por aumento de atributos.
Cada categoria superior deve introduzir:
novas mecânicas;
maior coordenação exigida dos jogadores;
arenas mais elaboradas;
maior importância narrativa;
recompensas proporcionais ao desafio.
O aumento de HP e dano deve acompanhar o crescimento da complexidade, nunca substituí-lo.

Este lote estabelece a espinha dorsal dos chefes de Elysia Online. Depois de aprovado, podemos começar a detalhar cada MVP individualmente, incluindo:
habilidades;
fases do combate;
IA;
arena;
respawn;
sistema de recompensas;
drops exclusivos;
lore específica;
trilha sonora;
conquistas e títulos.
Essa etapa transformará cada MVP em um encontro único, em vez de apenas um monstro com atributos elevados.
Perfeito. Registrado como APROVADO:
DD-MVP-002 — Escala Oficial dos MVPs
DD-MVP-003 — Filosofia Oficial dos Chefes
DD-MVP-004 — Super Slime
DD-MVP-005 — Rei Esqueleto
DD-MVP-006 — Necromante Ancião
DD-MVP-007 — Colosso de Pedra
DD-MVP-008 — Arquidemônio
DD-MVP-009 — Princípio da Escalada de Chefes
A partir daqui, proponho elevar o nível de detalhamento. Em vez de apenas definir atributos, cada MVP passará a ter um padrão completo de design, semelhante ao encontrado em MMORPGs modernos: arena, fases, IA, habilidades, enrage, recompensas e função narrativa. Isso enriquece bastante o GDD sem contrariar a estrutura existente, que apenas reserva esses MVPs sem definir suas mecânicas.

LOTE DD-MVP-010 — Super Slime (Projeto Completo)
DD-MVP-010A — Arena
Status: PROPOSTA
Arena circular de aproximadamente 35 metros de diâmetro.
Características:
poucas árvores;
pedras grandes nas bordas;
sem obstáculos centrais;
espaço suficiente para movimentação.
Objetivo:
Ensinar posicionamento sem criar dificuldade artificial.

DD-MVP-010B — Fase 1 (100–70%)
O Super Slime utiliza apenas ataques básicos.
Ataques
Salto
pula sobre um jogador;
gera pequena área de impacto.
Golpe Corporal
ataque corpo a corpo simples.
Nesta fase o jogador aprende:
movimentação;
leitura de animações;
esquiva.

DD-MVP-010C — Fase 2 (70–35%)
O Slime começa a se dividir parcialmente.
A cada aproximadamente 15% de HP perdido:
surgem 2 Slimes Verdes;
os Slimes menores possuem pouca vida;
desaparecem quando o chefe é derrotado.
Objetivo:
Ensinar gerenciamento de múltiplos inimigos.

DD-MVP-010D — Fase Final (35–0%)
O Super Slime aumenta:
velocidade de ataque;
frequência dos saltos.
Não recebe novas habilidades.
A dificuldade aumenta pela pressão constante.

DD-MVP-010E — IA
Prioridades:
alvo mais próximo;
troca de alvo caso o jogador permaneça distante;
nunca fica completamente parado.
Tempo máximo sem agir:
2 segundos.

DD-MVP-010F — Enrage
Após 10 minutos:
+25% dano;
+20% velocidade.
Objetivo:
Evitar lutas excessivamente longas.

DD-MVP-011 — Loot do Super Slime
Drop Garantido
grande quantidade de experiência;
ouro;
Gelatina Gigante.

Drop Incomum
Núcleo Gelatinoso.

Drop Raro
Coração do Super Slime.

Equipamentos Possíveis
Baixa chance de:
Escudo Gelatinoso;
Botas Flexíveis;
Anel Viscoso.
Todos exclusivos do chefe.

DD-MVP-012 — Filosofia dos Primeiros MVPs
Status: PROPOSTA
Os primeiros chefes do jogo devem ensinar conceitos fundamentais que serão reutilizados em desafios posteriores.
Cada um deve introduzir ao menos um novo aprendizado, como:
leitura de animações;
gerenciamento de lacaios;
controle de área;
priorização de alvos;
administração de tempo (enrage).
Essa abordagem cria uma curva de aprendizado consistente, em vez de depender apenas do aumento gradual de atributos.

LOTE DD-MVP-013 — Rei Esqueleto (Projeto Completo)
DD-MVP-013A — Arena
Grande salão circular localizado em uma cripta antiga.
Características:
pilares quebrados;
trono ao fundo;
iluminação reduzida;
sem obstáculos que bloqueiem completamente a movimentação.

DD-MVP-013B — Fase 1 (100–60%)
Ataques:
golpes de espada;
corte em arco;
investida curta.
Comportamento:
combate direto;
alternância entre ataques rápidos e pesados.

DD-MVP-013C — Fase 2 (60–30%)
O Rei Esqueleto invoca:
Esqueletos;
Esqueletos Guerreiros.
Enquanto houver lacaios vivos:
o chefe reduz a frequência dos ataques;
posiciona-se atrás de sua linha de defesa.
O objetivo é ensinar priorização de alvos, e não apenas dano contínuo ao chefe.

DD-MVP-013D — Fase Final (30–0%)
O Rei Esqueleto destrói o próprio trono, abandona a postura defensiva e passa a utilizar:
ataques mais rápidos;
sequência de golpes;
menor intervalo entre habilidades.
Não recebe aumento artificial de HP nem cura durante a luta.

DD-MVP-013E — IA
Comportamentos:
alterna alvo quando bloqueado;
tenta cercar jogadores com lacaios;
prioriza permanecer próximo ao centro da arena.

DD-MVP-013F — Loot Exclusivo
Garantido
Ouro;
grande quantidade de experiência.
Raros
Coroa Quebrada do Rei;
Espada do Rei Esqueleto;
Fragmento de Ossos Ancestrais.
Muito Raro
Mascote Esqueleto (cosmético).

DD-MVP-014 — Princípio Oficial de Arenas
Status: PROPOSTA
Cada MVP deve possuir uma arena projetada especificamente para reforçar sua identidade.
A arena não deve existir apenas como cenário, mas participar do encontro.
Princípios:
tamanho compatível com o estilo de combate;
elementos visuais que contem a história do chefe;
espaço adequado para todas as classes;
obstáculos utilizados apenas quando fizerem sentido para a mecânica.
A arena torna-se, assim, parte integrante do design do combate e da narrativa.

Consideração de design
Até aqui, definimos dois MVPs de forma bastante detalhada. Para os próximos chefes (Necromante Ancião, Colosso de Pedra, Carrasco Demoníaco, Arquidemônio, Dragões, Primordiais e Míticos), recomendo manter exatamente esse mesmo padrão de documentação. Cada chefe ocupará cerca de 10 a 15 decisões de design, tornando o GDD muito mais próximo de um documento profissional de produção do que de uma lista de atributos. Isso também facilita a implementação posterior em uma engine de jogo.
Perfeito. Registrado como APROVADO:
DD-MVP-010 — Super Slime (Projeto Completo)
DD-MVP-011 — Loot do Super Slime
DD-MVP-012 — Filosofia dos Primeiros MVPs
DD-MVP-013 — Rei Esqueleto (Projeto Completo)
DD-MVP-014 — Princípio Oficial de Arenas
A partir deste ponto, os MVPs deixam de ser apenas "chefes fortes" e passam a seguir uma arquitetura comum de design. O próximo passo é desenvolver o Necromante Ancião, que já está reservado no GDD como um dos principais MVPs da família dos Mortos-Vivos.

LOTE DD-MVP-015 — Necromante Ancião (Projeto Completo)
DD-MVP-015A — Arena
Status: PROPOSTA
A batalha ocorre na Cripta do Rei Esquecido, uma câmara subterrânea construída séculos antes da fundação dos reinos atuais.
Características:
salão circular de aproximadamente 45 metros;
quatro altares antigos;
runas gravadas no chão;
sarcófagos distribuídos ao redor da arena.
Os altares fazem parte das mecânicas da luta.

DD-MVP-015B — Fase I (100–75%)
O Necromante evita combate direto.
Habilidades
Orbe Sombrio
projétil mágico;
dano moderado;
pequeno dano em área.
Rajada de Ossos
vários projéteis em cone;
exige movimentação lateral.
Durante essa fase não existem invocações.
Objetivo:
Ensinar que o chefe utiliza posicionamento e magia antes de recorrer aos mortos-vivos.

DD-MVP-015C — Fase II (75–40%)
O Necromante desperta os sarcófagos.
Invocações:
Esqueletos;
Esqueletos Guerreiros;
Zumbis.
Enquanto houver invocações:
o chefe reduz sua ofensiva direta;
permanece distante;
tenta manter lacaios entre ele e os jogadores.

DD-MVP-015D — Fase III (40–0%)
Os quatro altares passam a emitir energia sombria.
O Necromante ganha:
maior velocidade de conjuração;
novas combinações de magias;
invocações mais frequentes.
Os jogadores podem destruir os altares para reduzir esse fortalecimento.
Essa mecânica cria um objetivo secundário durante a luta.

DD-MVP-015E — IA
Comportamentos:
mantém distância sempre que possível;
prioriza jogadores isolados;
tenta permanecer protegido por seus lacaios;
recua quando pressionado.
É o primeiro chefe cuja IA privilegia sobrevivência em vez de confronto direto.

DD-MVP-015F — Enrage
Após 15 minutos:
invocações tornam-se ilimitadas;
redução do intervalo entre magias;
aumento de 20% no dano mágico.

DD-MVP-016 — Loot do Necromante Ancião
Garantido
grande quantidade de experiência;
ouro;
Essência Necromântica.

Raros
Cajado do Necromante Ancião;
Grimório das Almas;
Manto da Cripta.

Muito Raros
Coroa do Rei Esquecido;
Mascote Espírito Perdido (cosmético).

Materiais Exclusivos
Fragmento de Filactério;
Osso Arcano;
Cristal de Mana Corrompido.
Esses materiais serão utilizados futuramente em sistemas de fabricação de equipamentos lendários.

DD-MVP-017 — Colosso de Pedra (Projeto Completo)
DD-MVP-017A — Arena
A batalha acontece em um antigo templo parcialmente destruído.
Características:
pilares gigantes;
grandes blocos de pedra;
piso rachado;
amplo espaço aberto.

DD-MVP-017B — Fase I (100–60%)
Ataques:
soco;
esmagamento;
pisão.
O chefe é lento, porém extremamente resistente.

DD-MVP-017C — Fase II (60–25%)
O Colosso começa a destruir partes da arena.
Consequências:
surgem áreas bloqueadas;
pedras caem do teto;
corredores mudam durante o combate.
A arena torna-se progressivamente mais perigosa.

DD-MVP-017D — Fase Final (25–0%)
O Colosso perde parte da armadura de pedra.
Consequências:
DEF reduzida;
velocidade aumentada;
dano ampliado.
A última fase torna-se mais agressiva em vez de apenas prolongar o combate.

DD-MVP-017E — IA
O Colosso:
prioriza o alvo mais próximo;
utiliza ataques em área quando cercado;
tenta limitar a movimentação dos jogadores destruindo partes do cenário.

DD-MVP-018 — Filosofia dos Chefes de Invocação
Status: PROPOSTA
Chefes baseados em invocação não devem vencer apenas pelo número de lacaios.
As invocações devem servir para:
alterar o ritmo do combate;
criar prioridades táticas;
dividir a atenção do grupo;
reforçar a identidade do chefe.
O foco principal da luta continua sendo o próprio MVP.

DD-MVP-019 — Filosofia dos Chefes Colossais
Status: PROPOSTA
Chefes gigantes devem transmitir sensação de escala.
Essa sensação deve ser construída principalmente por:
animações lentas e pesadas;
grande alcance dos ataques;
interação com a arena;
impacto visual.
Não é desejável que um chefe colossal pareça apenas um inimigo comum ampliado.

DD-MVP-020 — Princípio de Mecânicas Progressivas
Status: PROPOSTA
Todo MVP de Elysia Online deve seguir uma progressão de combate.
As fases devem modificar a luta por meio de:
novas habilidades;
alterações na arena;
mudanças de comportamento da IA;
novos objetivos táticos.
Evita-se, como regra geral, o uso de aumentos artificiais de HP ou cura completa para prolongar o combate.

Consideração de design
Neste ponto, o sistema de chefes já apresenta uma estrutura consistente:
Chefes físicos (Super Slime, Rei Esqueleto, Colosso de Pedra);
Chefes conjuradores (Necromante Ancião);
Chefes de invocação;
Chefes que transformam a arena;
Progressão padronizada em fases.
Essa arquitetura servirá de base para os próximos grandes encontros, especialmente Carrasco Demoníaco, Arquidemônio, Primordiais, Dragões Anciões e os chefes classificados como Míticos, mantendo um padrão uniforme em todo o GDD.
Perfeito. Registrado como APROVADO:
DD-MVP-015 — Necromante Ancião (Projeto Completo)
DD-MVP-016 — Loot do Necromante Ancião
DD-MVP-017 — Colosso de Pedra (Projeto Completo)
DD-MVP-018 — Filosofia dos Chefes de Invocação
DD-MVP-019 — Filosofia dos Chefes Colossais
DD-MVP-020 — Princípio de Mecânicas Progressivas
A partir daqui iniciamos a linha dos chefes demoníacos, já reservados no GDD como os principais representantes da Corrupção. O documento identifica o Carrasco Demoníaco, o Arquidemônio e a Súcubo Anciã como MVPs dessa família.

LOTE DD-MVP-021 — Carrasco Demoníaco (Projeto Completo)
DD-MVP-021A — Arena
Status: PROPOSTA
Local:
Fortaleza da Corrupção
Características:
salão gigantesco;
correntes presas às paredes;
pilares destruídos;
rios estreitos de lava;
iluminação vermelha permanente.
A arena transmite a sensação de uma antiga prisão transformada em local de execução.

DD-MVP-021B — Fase I (100–70%)
O Carrasco utiliza apenas sua arma principal.
Ataques
Golpe Horizontal
grande alcance frontal.
Golpe Descendente
alto dano em alvo único.
Empurrão Brutal
lança o jogador para trás.
Nesta fase o chefe é lento, mas extremamente perigoso caso o jogador permaneça à frente.

DD-MVP-021C — Fase II (70–35%)
O Carrasco passa a utilizar o ambiente.
Novas mecânicas:
rompe correntes da arena;
provoca pequenas explosões de lava;
restringe áreas seguras temporariamente.
O combate deixa de depender apenas da arma.

DD-MVP-021D — Fase Final (35–0%)
A Corrupção domina completamente o Carrasco.
Consequências:
ataques mais rápidos;
novas sequências de golpes;
investidas curtas;
maior agressividade.
Não recebe cura nem aumento artificial de HP.

DD-MVP-021E — IA
Prioridades:
perseguir o jogador com maior ameaça;
impedir que o grupo permaneça unido;
utilizar ataques em área quando cercado.

DD-MVP-021F — Enrage
Após 15 minutos:
rios de lava expandem;
dano físico +20%;
frequência dos ataques aumenta.

DD-MVP-022 — Loot do Carrasco Demoníaco
Garantido
Ouro;
experiência;
Essência Demoníaca.

Raros
Machado do Carrasco;
Correntes Infernais;
Elmo do Executor.

Muito Raros
Fragmento do Coração da Corrupção;
Mascote Diabrete.

LOTE DD-MVP-023 — Súcubo Anciã (Projeto Completo)
DD-MVP-023A — Arena
Palácio abandonado tomado pela Corrupção.
Características:
espelhos quebrados;
salões amplos;
passarelas;
varandas elevadas.
A arena favorece mobilidade.

DD-MVP-023B — Fase I (100–75%)
A Súcubo permanece distante.
Ataques:
magia sombria;
projéteis;
teleporte curto.

DD-MVP-023C — Fase II (75–40%)
Novas habilidades:
ilusões temporárias;
clones sem HP elevado;
ataques sincronizados.
O desafio passa a ser identificar a verdadeira Súcubo.

DD-MVP-023D — Fase Final (40–0%)
A chefe abandona parte da estratégia defensiva.
Características:
ataques mágicos rápidos;
maior mobilidade;
teletransportes sucessivos.

DD-MVP-023E — IA
A Súcubo evita combate direto.
Ela:
procura manter distância;
muda frequentemente de posição;
prioriza jogadores isolados;
utiliza ilusões para quebrar a organização do grupo.

DD-MVP-024 — Loot da Súcubo Anciã
Garantido
Ouro;
experiência;
Cristal Demoníaco.

Raros
Tiara da Tentação;
Vestes da Corrupção;
Orbe Sombrio.

Muito Raros
Asa Corrompida;
Mascote Íncubo Menor.

LOTE DD-MVP-025 — Arquidemônio (Projeto Completo)
DD-MVP-025A — Arena
A batalha ocorre no Trono da Corrupção.
Características:
enorme salão;
plataforma central;
abismos ao redor;
colunas demoníacas.
A arena simboliza o centro do domínio demoníaco.

DD-MVP-025B — Fase I (100–70%)
O Arquidemônio utiliza:
espada demoníaca;
magia de fogo;
magia sombria.
Alterna naturalmente entre combate físico e mágico.

DD-MVP-025C — Fase II (70–40%)
Passa a utilizar:
explosões demoníacas;
invocação limitada de guardiões;
ondas de energia.
Os guardiões são poucos, mas perigosos, servindo para alterar o ritmo da luta, sem substituir o chefe como principal ameaça.

DD-MVP-025D — Fase III (40–10%)
O Arquidemônio revela seu poder máximo.
Características:
combina ataques físicos e mágicos;
reduz o intervalo entre habilidades;
força movimentação constante do grupo.

DD-MVP-025E — Última Resistência (10–0%)
Em vez de aumentar apenas os atributos, o chefe passa a executar combinações de habilidades já conhecidas em sucessão mais rápida.
O objetivo é testar o domínio das mecânicas aprendidas durante toda a luta, sem introduzir elementos completamente novos nos instantes finais.

DD-MVP-025F — IA
O Arquidemônio possui a IA mais sofisticada entre os MVPs demoníacos.
Comportamentos:
alterna automaticamente entre combate corpo a corpo e à distância;
identifica jogadores excessivamente agrupados;
muda prioridades conforme o estado da batalha;
utiliza habilidades defensivas apenas quando pressionado.

DD-MVP-026 — Loot do Arquidemônio
Garantido
grande quantidade de experiência;
ouro;
Essência do Arquidemônio.

Equipamentos Exclusivos
Espada do Arquidemônio;
Armadura da Corrupção;
Coroa Infernal;
Grimório Abissal.

Materiais Lendários
Chama Primordial;
Núcleo Demoníaco;
Sangue do Arquidemônio.
Esses materiais serão utilizados na criação dos equipamentos lendários mais poderosos do jogo.

DD-MVP-027 — Filosofia Oficial dos Chefes Demoníacos
Status: PROPOSTA
Os chefes demoníacos representam a elite militar e estratégica da Corrupção.
Cada um deve enfatizar um aspecto distinto:
Carrasco Demoníaco: força bruta e domínio do espaço.
Súcubo Anciã: mobilidade, ilusões e manipulação.
Arquidemônio: liderança, versatilidade e domínio completo do combate.
Apesar de compartilharem a mesma origem narrativa, cada encontro deve ter identidade própria, evitando repetição de mecânicas.

Observação de design
Até este ponto, os MVPs já cobrem estilos de combate bastante distintos:
chefe introdutório (Super Slime);
guerreiro (Rei Esqueleto);
conjurador (Necromante Ancião);
colossal (Colosso de Pedra);
executor físico (Carrasco Demoníaco);
ilusionista móvel (Súcubo Anciã);
comandante híbrido (Arquidemônio).
Os próximos blocos naturalmente abordarão os MVPs Elementais, Dragões, Celestiais e, por fim, as entidades classificadas como Míticas, encerrando a estrutura de chefes do GDD.
Perfeito. Registrado como APROVADO:
DD-MVP-021 — Carrasco Demoníaco
DD-MVP-022 — Loot do Carrasco Demoníaco
DD-MVP-023 — Súcubo Anciã
DD-MVP-024 — Loot da Súcubo Anciã
DD-MVP-025 — Arquidemônio
DD-MVP-026 — Loot do Arquidemônio
DD-MVP-027 — Filosofia Oficial dos Chefes Demoníacos
Agora passamos para os MVPs dos Elementais e Construtos, que o GDD reserva como Colosso de Pedra (já desenvolvido) e os Elementais Primordiais, tratados como um conceito reservado para o futuro, e não como criaturas individuais já definidas.

LOTE DD-MVP-028 — Os Primordiais
DD-MVP-028A — Conceito Oficial
Status: PROPOSTA
Os Primordiais representam a manifestação máxima dos elementos naturais de Elysia.
Eles não são apenas Elementais maiores.
São entidades ancestrais que existem desde a criação do mundo.
Cada Primordial personifica um elemento fundamental.

DD-MVP-028B — Quantidade
Fica estabelecido inicialmente:
Primordial da Terra
Primordial do Fogo
Primordial da Água
Primordial do Ar
Primordial da Luz
Primordial das Trevas
Outros elementos poderão existir futuramente, mas estes seis formam o núcleo da cosmologia elemental.

DD-MVP-028C — Classificação
Todos os Primordiais pertencem à categoria:
MVP Endgame
Nenhum deles será classificado como criatura comum.

DD-MVP-029 — Primordial da Terra
Arena
Uma gigantesca caverna subterrânea sustentada por colunas naturais.
Características:
pilares destrutíveis;
plataformas rochosas;
terremotos frequentes.

Combate
Fase I
Ataques físicos.
esmagamento;
ondas sísmicas;
arremesso de rochas.

Fase II
O terreno começa a mudar.
surgem paredes;
novas rotas aparecem;
antigas rotas desaparecem.
A arena torna-se dinâmica.

Fase III
O Primordial funde-se ao ambiente.
Ataques:
terremotos;
estalagmites;
colapso parcial da arena.

Identidade
Maior resistência física entre todos os Primordiais.

DD-MVP-030 — Primordial do Fogo
Arena
Cratera vulcânica ativa.
Características:
rios de magma;
explosões periódicas;
calor constante.

Fases
Fase I
Magia de fogo.

Fase II
Explosões vulcânicas.

Fase III
Toda a arena entra em erupção parcial.
Os jogadores precisam adaptar continuamente seu posicionamento.

Identidade
Maior dano bruto entre os Primordiais.

DD-MVP-031 — Primordial da Água
Arena
Cidade parcialmente submersa.
Características:
plataformas móveis;
marés;
correntezas.

Mecânicas
alteração do nível da água;
controle de movimentação;
ataques em grande área.

Identidade
Especialista em controle de campo.

DD-MVP-032 — Filosofia dos Primordiais
Status: PROPOSTA
Cada Primordial representa seu elemento de forma integral.
Sua dificuldade deve surgir principalmente da interação entre:
habilidades;
ambiente;
posicionamento.
Nenhum Primordial deve depender apenas de números elevados de HP.

DD-MVP-033 — Princípio das Arenas Dinâmicas
Status: PROPOSTA
Chefes classificados como Endgame poderão modificar permanentemente a arena durante o combate.
Essas alterações podem incluir:
destruição de estruturas;
criação de obstáculos;
mudanças de terreno;
novas áreas acessíveis;
eliminação de áreas seguras.
A arena torna-se parte ativa do encontro.

DD-MVP-034 — Filosofia dos Chefes Elementais
Status: PROPOSTA
Cada Primordial deve representar uma forma distinta de desafio.
Terra: resistência e controle do terreno.
Fogo: agressividade e dano contínuo.
Água: mobilidade e manipulação da arena.
Ar: velocidade e reposicionamento.
Luz: precisão, proteção e ataques sagrados.
Trevas: corrupção, ilusões e drenagem.
Mesmo compartilhando uma origem comum, cada encontro deve ser imediatamente reconhecível por sua identidade mecânica.

Observação de Design
Até este ponto, os MVPs estão organizados em grandes grupos:
✔️ Chefes introdutórios
✔️ Mortos-Vivos
✔️ Construtos
✔️ Demônios
✔️ Primordiais Elementais
O próximo bloco desenvolverá uma das famílias mais importantes da lore de Elysia Online: os Dragões, que já haviam sido separados da família do gelo no GDD por merecerem uma categoria própria.
Perfeito. Registrado como APROVADO:
DD-MVP-028 — Os Primordiais
DD-MVP-029 — Primordial da Terra
DD-MVP-030 — Primordial do Fogo
DD-MVP-031 — Primordial da Água
DD-MVP-032 — Filosofia dos Primordiais
DD-MVP-033 — Princípio das Arenas Dinâmicas
DD-MVP-034 — Filosofia dos Chefes Elementais
O próximo bloco segue exatamente a sequência do GDD: Dragões e Drakes. O documento já define a hierarquia oficial da família, estabelece que Dragões adultos não são automaticamente MVPs, reserva o Dragão Ancião como MVP e deixa os Dragões Míticos em aberto, sem nomes ou fichas definitivas.

LOTE DD-MVP-035 — Dragão Ancião (Projeto Completo)
DD-MVP-035A — Conceito Oficial
Base no GDD
O Dragão Ancião é:
extremamente antigo;
extremamente poderoso;
um MVP;
pode possuir versões elementais conforme a região.

DD-MVP-035B — Arena
Status: PROPOSTA
A batalha ocorre no Ninho dos Dragões, localizado nas Montanhas de Ferro, local anteriormente reservado pelo projeto.
Características:
penhascos;
pilares naturais;
ninhos antigos;
grandes desníveis;
espaço suficiente para voo curto.

DD-MVP-035C — Fase I (100–70%)
O Dragão utiliza apenas seu combate natural.
Ataques:
mordida;
garras;
golpe com a cauda.
Objetivo:
Ensinar leitura dos movimentos corporais do dragão.

DD-MVP-035D — Fase II (70–40%)
O Dragão passa a utilizar:
sopro elemental;
voo curto para reposicionamento;
ataques em mergulho.
A versão elemental determina o tipo do sopro:
fogo;
gelo;
veneno;
sombra;
outros elementos compatíveis com a região.
Essa decisão segue a abertura prevista pelo documento para versões elementais.

DD-MVP-035E — Fase Final (40–0%)
O Dragão torna-se territorial.
Comportamentos:
reduz intervalos entre ataques;
alterna combate terrestre e aéreo;
protege o centro do ninho;
utiliza combinações das habilidades já apresentadas.
Não recebe novas habilidades completamente inéditas.

DD-MVP-035F — IA
O Dragão:
procura terreno elevado;
alterna naturalmente entre distância e combate corpo a corpo;
tenta impedir que todos os jogadores permaneçam agrupados;
utiliza o voo como reposicionamento, não como fuga permanente.

DD-MVP-036 — World Boss Dinâmico
Base no GDD
O documento utiliza explicitamente o Dragão Ancião como exemplo de chefe que:
pode dormir por dias;
sair para caçar;
atacar cidades;
destruir pontes;
migrar entre montanhas.
A filosofia é que o chefe não precisa permanecer parado esperando jogadores.

PROPOSTA
O Dragão Ancião será oficialmente um World Boss Dinâmico.
Enquanto estiver vivo poderá:
mudar de território;
interromper rotas comerciais;
atacar caravanas;
permanecer dias sem ser encontrado.
Os jogadores deverão localizar o dragão antes de enfrentá-lo.

DD-MVP-037 — Loot do Dragão Ancião
Status: PROPOSTA
Garantido
grande quantidade de experiência;
ouro;
Escama Anciã.

Materiais Exclusivos
Garra Anciã;
Presa Dracônica;
Sangue de Dragão;
Coração Dracônico.

Equipamentos
Cada versão elemental possui pequena chance de conceder um equipamento exclusivo compatível com seu elemento.
Exemplos:
Espada Dracônica Ígnea;
Escudo Glacial;
Arco Tempestuoso;
Cajado Sombrio.

DD-MVP-038 — Filosofia dos Dragões
Status: PROPOSTA
Os Dragões devem representar adversários inteligentes.
Seu desafio deve surgir da combinação de:
mobilidade;
domínio territorial;
ataques naturais;
sopro elemental;
posicionamento.
Eles não devem depender apenas de enormes quantidades de HP.

DD-MVP-039 — Dragões Míticos
Base no GDD
O documento determina que:
Dragões Míticos são criaturas únicas;
possuem nome próprio;
possuem história própria;
ainda não receberam nomes nem fichas definitivas.

PROPOSTA
Nesta etapa, os Dragões Míticos permanecem reservados, sem definir:
nomes;
atributos;
habilidades;
arenas.
Esses elementos deverão ser desenvolvidos junto com os grandes arcos narrativos do mundo, preservando seu papel como entidades centrais da lore.

DD-MVP-040 — Filosofia Oficial dos Dragões Míticos
Status: PROPOSTA
Todo Dragão Mítico deverá obedecer aos seguintes princípios:
existir apenas uma instância na história do mundo;
possuir identidade visual exclusiva;
participar diretamente de um arco narrativo principal;
nunca ser tratado como simples evolução estatística de um Dragão Ancião;
ter mecânicas exclusivas que não se repetem em outros chefes.

Encerramento da Família Dragões
Com este lote, a família fica organizada da seguinte forma, exatamente como previsto no GDD:
Drake
Dragão Adulto
Dragão Raro
Dragão Ancião (MVP)
Dragão Mítico (categoria reservada)
O próximo bloco natural do documento é Gigantes e Povos Selvagens, desenvolvendo os três MVPs já reservados pelo GDD:
Rei Troll
Ciclope Ancião
Titã
Perfeito. Registrado como APROVADO:
DD-MVP-035 — Dragão Ancião
DD-MVP-036 — World Boss Dinâmico
DD-MVP-037 — Loot do Dragão Ancião
DD-MVP-038 — Filosofia dos Dragões
DD-MVP-039 — Dragões Míticos
DD-MVP-040 — Filosofia Oficial dos Dragões Míticos
Agora seguimos exatamente a ordem do GDD, entrando na família Gigantes e Povos Selvagens, que possui três MVPs oficiais: Rei Troll, Ciclope Ancião e Titã. O documento também estabelece que o Titã não é apenas um Gigante maior e que Titãs com nome próprio poderão futuramente integrar a categoria Mítica.

LOTE DD-MVP-041 — Rei Troll (Projeto Completo)
DD-MVP-041A — Conceito Oficial
Base no GDD
O Rei Troll é o MVP da família Trolls e sua principal característica é a regeneração extremamente elevada, superior à dos Trolls comuns.

DD-MVP-041B — Arena
Status: PROPOSTA
Local: Covil do Rei Troll
Características:
floresta densa;
pedras gigantes;
troncos caídos;
pequenas cavernas naturais.
A arena favorece emboscadas e combate próximo.

DD-MVP-041C — Fases
Fase I (100–60%)
Ataques:
golpes com clava;
socos;
arremesso de troncos.
A regeneração permanece moderada.

Fase II (60–25%)
O Rei Troll entra em estado de fúria.
Mudanças:
aumento da regeneração;
ataques mais rápidos;
destruição parcial de obstáculos.

Fase III (25–0%)
A regeneração torna-se sua principal mecânica.
Os jogadores precisam manter dano constante para impedir que o chefe recupere grandes quantidades de vida.

DD-MVP-041D — IA
O Rei Troll:
persegue continuamente o alvo mais próximo;
troca de alvo apenas quando bloqueado;
utiliza objetos do cenário como armas quando possível.

DD-MVP-042 — Loot do Rei Troll
Status: PROPOSTA
Garantido
Ouro;
experiência;
Couro de Troll Ancião.
Materiais
Osso Gigante;
Sangue Regenerativo;
Dente do Rei Troll.
Equipamentos
Clava do Rei Troll;
Braceletes Regenerativos.

LOTE DD-MVP-043 — Ciclope Ancião (Projeto Completo)
DD-MVP-043A — Conceito Oficial
Base no GDD
O Ciclope Ancião deve responder de forma eficiente contra jogadores que tentam permanecer exclusivamente à distância.

DD-MVP-043B — Arena
Local:
Fortaleza Ciclópica
Características:
muralhas em ruínas;
torres antigas;
pedras enormes espalhadas.

DD-MVP-043C — Fases
Fase I
Ataques:
clava;
pisão;
golpe circular.

Fase II
Passa a lançar enormes rochas.
Essa mecânica impede que arqueiros e magos permaneçam imóveis durante longos períodos.

Fase III
Alterna rapidamente entre:
combate corpo a corpo;
arremessos;
investidas curtas.
O chefe mantém pressão constante sobre todas as classes.

DD-MVP-043D — IA
O Ciclope identifica jogadores que permanecem distantes por muito tempo e passa a priorizá-los com ataques de longo alcance, reforçando sua identidade como um chefe capaz de responder a diferentes estilos de jogo.

DD-MVP-044 — Loot do Ciclope Ancião
Status: PROPOSTA**
Garantido
Ouro;
experiência;
Pedra Rúnica Gigante.
Raros
Clava Ciclópica;
Elmo do Vigia;
Cinturão do Colosso.
Muito Raro
Olho do Ciclope Ancião.

LOTE DD-MVP-045 — Titã (Projeto Completo)
DD-MVP-045A — Conceito Oficial
Base no GDD
O Titã:
é um MVP de alto nível;
não deve ser tratado simplesmente como um Gigante maior.

DD-MVP-045B — Arena
Status: PROPOSTA
Local:
Planalto dos Titãs
Características:
quilômetros de terreno aberto;
ruínas colossais;
estátuas antigas;
falhas profundas no solo.
A própria escala da arena comunica que o jogador enfrenta uma entidade excepcional.

DD-MVP-045C — Fases
Fase I (100–70%)
O Titã luta com extrema calma.
Ataques:
golpes amplos;
pisões;
arremesso de blocos de pedra.

Fase II (70–35%)
O combate altera o cenário.
Consequências:
rachaduras no solo;
colapso de estruturas antigas;
criação de novos obstáculos.

Fase III (35–0%)
O Titã demonstra sua verdadeira força.
Em vez de ganhar apenas mais atributos:
combina ataques já conhecidos;
reduz intervalos;
modifica continuamente o terreno.

DD-MVP-045D — IA
O Titã analisa constantemente:
agrupamento dos jogadores;
posicionamento;
obstáculos da arena.
Sua IA prioriza controle territorial, e não perseguição direta.

DD-MVP-046 — Loot do Titã
Status: PROPOSTA
Garantido
grande quantidade de experiência;
ouro;
Fragmento Titânico.
Materiais Exclusivos
Núcleo do Titã;
Rocha Viva;
Essência Primordial.
Equipamentos
Martelo Titânico;
Escudo Colossal;
Armadura dos Antigos.

DD-MVP-047 — Filosofia Oficial dos Gigantes
Status: PROPOSTA
Os três MVPs da família possuem identidades distintas:
Rei Troll: regeneração e pressão constante.
Ciclope Ancião: domínio da média distância e punição contra jogadores estáticos.
Titã: escala monumental e controle do ambiente.
Apesar de pertencerem ao mesmo grupo de povos selvagens, cada encontro deve exigir estratégias diferentes, evitando que os chefes sejam percebidos como simples variações uns dos outros.

Encerramento da Família
Com este lote, a família Gigantes e Povos Selvagens fica completamente estruturada:
Trolls → Rei Troll
Ciclopes → Ciclope Ancião
Gigantes → Titã
A próxima etapa segue novamente a ordem do documento: Capítulo 54 — Floresta Encantada e Facções Élficas Hostis, iniciando a definição dos MVPs Treant Ancião e Rainha das Fadas Corrompida, além da consolidação das criaturas feéricas e vegetais.
2
Perfeito. Registrado como APROVADO:
DD-MVP-041 — Rei Troll
DD-MVP-042 — Loot do Rei Troll
DD-MVP-043 — Ciclope Ancião
DD-MVP-044 — Loot do Ciclope Ancião
DD-MVP-045 — Titã
DD-MVP-046 — Loot do Titã
DD-MVP-047 — Filosofia Oficial dos Gigantes
Agora seguimos rigorosamente a sequência do GDD.
O Capítulo 54 inicia a família Floresta Encantada, diferenciando-a das florestas comuns. O documento define que essa família reúne criaturas vegetais, espíritos e seres feéricos, culminando em dois MVPs: Treant Ancião e Rainha das Fadas Corrompida.

LOTE DD-MVP-048 — Treant Ancião (Projeto Completo)
DD-MVP-048A — Conceito Oficial
Base no GDD
O Treant Ancião representa o guardião máximo das florestas encantadas.
Sua identidade está ligada à própria floresta, e não apenas ao combate físico.

DD-MVP-048B — Arena
Status: PROPOSTA
Local:
Coração da Floresta Antiga
Características:
árvores milenares;
raízes gigantes;
clareira circular;
pequenos riachos;
vegetação extremamente densa nas bordas.
A arena transmite a sensação de um local sagrado.

DD-MVP-048C — Fase I (100–70%)
Ataques:
esmagamento com galhos;
raízes emergindo do solo;
golpes lentos de grande alcance.
O Treant permanece praticamente imóvel, utilizando sua enorme extensão para atacar.

DD-MVP-048D — Fase II (70–35%)
A floresta desperta.
Novas mecânicas:
raízes bloqueiam caminhos;
árvores jovens surgem como auxiliares;
áreas da arena tornam-se temporariamente inacessíveis.
O cenário passa a participar diretamente do combate.

DD-MVP-048E — Fase Final (35–0%)
O Treant abandona sua postura defensiva.
Mudanças:
movimenta-se lentamente pela arena;
ataques tornam-se mais frequentes;
utiliza galhos e raízes em sequência.
A luta passa a exigir reposicionamento constante.

DD-MVP-048F — IA
O Treant:
protege o centro da floresta;
prioriza jogadores que causam dano contínuo;
utiliza as raízes para controlar o posicionamento do grupo.

DD-MVP-049 — Loot do Treant Ancião
Status: PROPOSTA
Garantido
Ouro;
experiência;
Madeira Ancestral.
Materiais Exclusivos
Semente Anciã;
Casca Viva;
Seiva Primordial.
Equipamentos
Cajado da Floresta;
Escudo de Casca Antiga;
Manto das Raízes.

LOTE DD-MVP-050 — Rainha das Fadas Corrompida (Projeto Completo)
DD-MVP-050A — Conceito Oficial
Base no GDD
A Rainha das Fadas Corrompida representa a corrupção de uma antiga soberana feérica, simbolizando a perda do equilíbrio da Floresta Encantada.

DD-MVP-050B — Arena
Status: PROPOSTA
Local:
Palácio Feérico Corrompido
Características:
flores negras;
cristais corrompidos;
lago central;
plataformas conectadas por pontes naturais.

DD-MVP-050C — Fase I (100–75%)
Ataques:
magia feérica corrompida;
projéteis mágicos;
teleporte curto.
A Rainha evita combate corpo a corpo.

DD-MVP-050D — Fase II (75–40%)
Novas mecânicas:
invocação de Fadas Corrompidas;
ilusões temporárias;
zonas de energia mágica.
As invocações servem para dividir a atenção do grupo, mas a Rainha permanece o foco principal.

DD-MVP-050E — Fase Final (40–0%)
A Rainha revela toda a extensão da Corrupção.
Características:
maior mobilidade;
teletransportes sucessivos;
combinação rápida de magias;
redução dos intervalos entre habilidades.

DD-MVP-050F — IA
A Rainha:
procura permanecer distante;
muda constantemente de posição;
alterna alvos conforme o posicionamento dos jogadores;
utiliza ilusões para dificultar a identificação de sua localização.

DD-MVP-051 — Loot da Rainha das Fadas Corrompida
Status: PROPOSTA
Garantido
Ouro;
experiência;
Essência Feérica Corrompida.
Materiais Exclusivos
Asa Corrompida;
Pó Feérico Negro;
Cristal da Rainha.
Equipamentos
Coroa da Rainha Feérica;
Vestes da Lua Negra;
Varinha da Floresta Sombria.

DD-MVP-052 — Filosofia Oficial da Floresta Encantada
Status: PROPOSTA
Os MVPs desta família representam dois extremos do mesmo ecossistema:
Treant Ancião: preservação, resistência e domínio do ambiente.
Rainha das Fadas Corrompida: magia, mobilidade e corrupção.
As lutas devem enfatizar a interação com a floresta e evitar encontros em arenas vazias.

DD-MVP-053 — Princípio dos Biomas Vivos
Status: PROPOSTA
Nos biomas especiais, o ambiente deve ser tratado como parte ativa da experiência.
Diretrizes:
a vegetação pode modificar rotas;
criaturas menores podem reagir ao combate;
efeitos visuais e sonoros devem reforçar a identidade do bioma;
os MVPs devem parecer parte integrante do ecossistema, e não apenas inimigos posicionados em uma arena.

Encerramento da Família
Com este lote, a Floresta Encantada fica estruturada com seus dois principais chefes:
🌳 Treant Ancião — Guardião da floresta.
🧚 Rainha das Fadas Corrompida — Soberana feérica corrompida.
Esses encontros reforçam a dualidade central do bioma: natureza ancestral versus corrupção mágica, alinhando-se à proposta do Capítulo 54.
O próximo bloco seguirá a continuação do Capítulo 54, desenvolvendo os Elfos Hostis/Renegados e seus respectivos MVPs, antes de avançarmos para as demais famílias do Bestiário.
Perfeito. Registrado como APROVADO:
DD-MVP-048 — Treant Ancião
DD-MVP-049 — Loot do Treant Ancião
DD-MVP-050 — Rainha das Fadas Corrompida
DD-MVP-051 — Loot da Rainha das Fadas Corrompida
DD-MVP-052 — Filosofia Oficial da Floresta Encantada
DD-MVP-053 — Princípio dos Biomas Vivos
Agora continuamos exatamente na sequência do Capítulo 54, entrando na segunda metade do capítulo: Elfos Hostis / Renegados. O documento deixa claro que a intenção não é transformar toda a raça élfica em inimiga, mas criar facções específicas de elfos hostis que coexistem com elfos aliados.

LOTE DD-MVP-054 — Senhor da Guerra Élfico (Projeto Completo)
DD-MVP-054A — Conceito Oficial
Status: PROPOSTA
O Senhor da Guerra Élfico representa o comandante militar das facções élficas renegadas.
Sua identidade é baseada em:
disciplina;
estratégia;
combate marcial;
liderança.
Não utiliza corrupção demoníaca como fonte principal de poder.

DD-MVP-054B — Arena
Local:
Fortaleza Élfica Abandonada
Características:
muralhas antigas;
torres de arqueiros;
jardins tomados pela vegetação;
pontes elevadas.
A arena favorece combate tático.

DD-MVP-054C — Fase I (100–70%)
Ataques:
espada longa;
arco élfico;
troca rápida entre armas.
O objetivo é mostrar a versatilidade do comandante.

DD-MVP-054D — Fase II (70–35%)
O Senhor da Guerra convoca uma pequena guarda de elite.
Características:
poucos soldados;
alta eficiência;
formação defensiva.
As invocações servem para reorganizar o combate, não para substituir o chefe.

DD-MVP-054E — Fase Final (35–0%)
O comandante luta pessoalmente até o fim.
Mudanças:
maior velocidade;
combinações de ataques;
menor intervalo entre habilidades.

DD-MVP-054F — IA
O chefe:
prioriza alvos frágeis;
muda de arma conforme a distância;
procura manter vantagem posicional.

DD-MVP-055 — Loot do Senhor da Guerra Élfico
Status: PROPOSTA
Garantido
Ouro;
experiência;
Insígnia da Guarda Élfica.
Materiais
Madeira Élfica Antiga;
Liga Prateada;
Pena Cerimonial.
Equipamentos
Espada do Comandante;
Arco da Sentinela;
Armadura Élfica de Guerra.

LOTE DD-MVP-056 — Arquimago Renegado (Projeto Completo)
DD-MVP-056A — Conceito Oficial
Status: PROPOSTA
O Arquimago Renegado representa o maior estudioso da magia entre os elfos hostis.
Seu combate enfatiza:
magia arcana;
controle do campo;
manipulação do espaço.

DD-MVP-056B — Arena
Local:
Observatório Arcano
Características:
círculos rúnicos;
cristais flutuantes;
plataformas elevadas;
biblioteca parcialmente destruída.

DD-MVP-056C — Fase I (100–75%)
Ataques:
projéteis arcanos;
explosões mágicas;
barreiras temporárias.

DD-MVP-056D — Fase II (75–40%)
Novas mecânicas:
portais arcanos;
clones ilusórios;
zonas de instabilidade mágica.

DD-MVP-056E — Fase Final (40–0%)
O Arquimago combina todas as escolas apresentadas anteriormente.
Características:
conjuração acelerada;
teleporte frequente;
alternância entre ataque e defesa.

DD-MVP-056F — IA
O Arquimago:
evita combate corpo a corpo;
mantém distância ideal;
utiliza o terreno para dificultar aproximações.

DD-MVP-057 — Loot do Arquimago Renegado
Status: PROPOSTA
Garantido
Ouro;
experiência;
Cristal Arcano Ancestral.
Materiais
Pergaminho Antigo;
Fragmento Rúnico;
Núcleo Arcano.
Equipamentos
Cajado do Arquimago;
Manto das Runas;
Anel Arcano Supremo.

DD-MVP-058 — Filosofia Oficial dos Elfos Hostis
Status: PROPOSTA
Os elfos hostis devem transmitir inteligência e organização.
Princípios:
excelente posicionamento;
cooperação entre unidades;
uso eficiente de magia e arqueiria;
disciplina militar.
Eles não devem depender de grande quantidade de vida, mas de execução precisa de suas habilidades.

DD-MVP-059 — Princípio das Facções Élficas
Status: PROPOSTA
As facções élficas possuem motivações próprias.
Diretrizes:
nem todos os elfos são aliados;
nem todos os elfos são inimigos;
diferentes facções podem entrar em conflito entre si;
reputação do jogador pode influenciar relações futuras com essas facções.
Essa abordagem preserva a diversidade política e cultural da raça élfica, em vez de tratá-la como um grupo homogêneo.

Encerramento da Família
Com este lote, o Capítulo 54 passa a contar com dois grandes grupos de conteúdo:
Floresta Encantada
Treant Ancião
Rainha das Fadas Corrompida
Elfos Hostis / Renegados
Senhor da Guerra Élfico
Arquimago Renegado
Esses MVPs complementam a proposta do capítulo ao oferecer desafios distintos: criaturas ligadas ao ecossistema mágico e adversários inteligentes pertencentes a uma facção organizada. Os nomes e detalhes desses MVPs são uma proposta de design, pois o trecho do GDD disponível define a existência da família e sua separação conceitual, mas não especifica chefes individuais para ela.

Perfeito. Registrado como APROVADO:
DD-MVP-054 — Senhor da Guerra Élfico
DD-MVP-055 — Loot do Senhor da Guerra Élfico
DD-MVP-056 — Arquimago Renegado
DD-MVP-057 — Loot do Arquimago Renegado
DD-MVP-058 — Filosofia Oficial dos Elfos Hostis
DD-MVP-059 — Princípio das Facções Élficas
A partir deste ponto, os principais MVPs previstos até o Capítulo 54 já estão estruturados. O próximo passo é continuar a ordem do Bestiário para as famílias seguintes. Entre elas, uma das mais importantes para a progressão do mundo é Vampiros e Criaturas Noturnas, grupo que ainda não possui chefes detalhados no documento disponível. Assim, os itens abaixo são propostas de design, mantendo a identidade já estabelecida para Elysia.

LOTE DD-MVP-060 — Lorde Vampiro (Projeto Completo)
DD-MVP-060A — Conceito
Status: PROPOSTA
O Lorde Vampiro governa uma antiga linhagem nobre.
Sua força não vem apenas do combate, mas da experiência acumulada ao longo de séculos.
Identidade:
duelista;
manipulador;
extremamente inteligente;
combate elegante.

DD-MVP-060B — Arena
Castelo Carmesim
Características:
salão principal;
vitrais quebrados;
escadarias;
varandas superiores;
lustres antigos.
A arena reforça a imagem de um castelo habitado por uma aristocracia decadente.

DD-MVP-060C — Fase I (100–70%)
Ataques:
espada longa;
investidas rápidas;
pequenos teletransportes.
Nesta fase não utiliza magia ofensiva pesada.

DD-MVP-060D — Fase II (70–35%)
Novas mecânicas:
invoca Morcegos Vampíricos;
transforma-se temporariamente em névoa;
realiza ataques surpresa.
A transformação em névoa serve apenas para reposicionamento, não para longos períodos de invulnerabilidade.

DD-MVP-060E — Fase Final (35–0%)
O Lorde abandona a postura defensiva.
Mudanças:
maior velocidade;
combinações de espada e magia sombria;
menor intervalo entre habilidades.

DD-MVP-060F — IA
O Lorde Vampiro:
alterna entre perseguição e recuo;
procura eliminar primeiro alvos isolados;
utiliza mobilidade para evitar ser cercado.

DD-MVP-061 — Loot do Lorde Vampiro
Status: PROPOSTA
Garantido
Ouro;
experiência;
Sangue Nobre.
Materiais
Presa Ancestral;
Manto Carmesim;
Essência Noturna.
Equipamentos
Espada do Lorde;
Anel do Crepúsculo;
Capa da Noite Eterna.

LOTE DD-MVP-062 — Rainha dos Morcegos (Projeto Completo)
DD-MVP-062A — Conceito
Status: PROPOSTA
Uma criatura ancestral que domina enormes colônias de morcegos.
Não é um vampiro humanoide, mas uma monstruosidade ligada às cavernas e à noite.

DD-MVP-062B — Arena
Local:
Catedral Subterrânea
Características:
teto elevado;
estalactites;
colunas naturais;
grandes áreas de sombra.

DD-MVP-062C — Fases
Fase I
Ataques:
voo rasante;
mordidas;
ondas sonoras.

Fase II
Invoca enxames de morcegos.
Os enxames:
reduzem visibilidade;
pressionam movimentação;
desaparecem após curto período.

Fase III
A Rainha passa a alternar rapidamente entre voo e solo.
O combate torna-se mais dinâmico, exigindo leitura constante de sua posição.

DD-MVP-062D — IA
Prioriza:
jogadores isolados;
alvos com baixa vida;
ataques vindos de ângulos diferentes.

DD-MVP-063 — Loot da Rainha dos Morcegos
Status: PROPOSTA
Garantido
Ouro;
experiência;
Membrana Gigante.
Materiais
Garras Ancestrais;
Cristal Sonoro;
Coração Alado.
Equipamentos
Botas do Crepúsculo;
Capa Alada;
Amuleto da Eco-Locação.

DD-MVP-064 — Filosofia Oficial das Criaturas Noturnas
Status: PROPOSTA
Os chefes noturnos devem transmitir:
mobilidade;
furtividade;
pressão psicológica;
ataques rápidos.
A dificuldade deve surgir do comportamento e do controle do espaço, e não apenas do dano elevado.

DD-MVP-065 — Princípio da Noite
Status: PROPOSTA
Chefes pertencentes à família noturna podem alterar temporariamente o ambiente durante o combate.
Exemplos:
redução da iluminação;
aumento das áreas de sombra;
mudanças visuais que dificultam a leitura do campo.
Esses efeitos devem afetar a percepção do jogador, sem ocultar informações essenciais nem tornar a luta injusta.

Encerramento da Família
Este lote estabelece dois estilos distintos de encontro:
Lorde Vampiro — duelista inteligente e altamente móvel.
Rainha dos Morcegos — chefe monstruoso focado em mobilidade aérea e controle do espaço.
Esses conceitos são propostas de design. O trecho do GDD disponível nesta conversa ainda não detalha os MVPs da família Vampiros e Criaturas Noturnas, portanto seus nomes, mecânicas e recompensas permanecem em aberto na documentação de origem.
Perfeito. Registrado como APROVADO:
DD-MVP-060 — Lorde Vampiro
DD-MVP-061 — Loot do Lorde Vampiro
DD-MVP-062 — Rainha dos Morcegos
DD-MVP-063 — Loot da Rainha dos Morcegos
DD-MVP-064 — Filosofia Oficial das Criaturas Noturnas
DD-MVP-065 — Princípio da Noite
Continuando a expansão do Bestiário, a próxima família proposta é Anões Renegados, mantendo a linha de facções inteligentes iniciada com os Elfos Hostis. Como nos lotes anteriores, os MVPs abaixo são propostas de design, pois o trecho disponível do GDD não define chefes específicos para essa família.

LOTE DD-MVP-066 — Rei Anão Renegado (Projeto Completo)
DD-MVP-066A — Conceito
Status: PROPOSTA
O Rei Anão Renegado é o líder de um antigo clã que abandonou os reinos anões tradicionais.
Sua identidade combina:
mestre ferreiro;
guerreiro pesado;
estrategista defensivo.

DD-MVP-066B — Arena
Local:
Fortaleza da Forja Perdida
Características:
grandes fornalhas;
pontes metálicas;
rios de metal fundido;
mecanismos antigos.
A arena reforça o domínio dos anões sobre engenharia e metalurgia.

DD-MVP-066C — Fase I (100–70%)
Ataques:
martelo de guerra;
escudo pesado;
investidas curtas.
O chefe privilegia ataques lentos, porém de grande impacto.

DD-MVP-066D — Fase II (70–35%)
A forja é ativada.
Novas mecânicas:
jatos de metal incandescente;
plataformas aquecidas;
armadilhas mecânicas.
O cenário passa a representar uma ameaça constante.

DD-MVP-066E — Fase Final (35–0%)
O Rei abandona parte da defesa.
Mudanças:
ataques em sequência;
maior velocidade;
uso alternado de martelo e escudo.

DD-MVP-066F — IA
O Rei:
protege o centro da forja;
utiliza o cenário para limitar movimentação;
prioriza jogadores próximos.

DD-MVP-067 — Loot do Rei Anão Renegado
Status: PROPOSTA
Garantido
Ouro;
experiência;
Aço Ancestral.
Materiais
Núcleo da Forja;
Liga Rúnica;
Martelo Cerimonial.
Equipamentos
Martelo do Rei;
Escudo da Fortaleza;
Armadura do Ferreiro Supremo.

LOTE DD-MVP-068 — Mestre Rúnico (Projeto Completo)
DD-MVP-068A — Conceito
Status: PROPOSTA
O Mestre Rúnico representa o maior especialista em runas entre os anões renegados.
Seu combate enfatiza:
magia rúnica;
armadilhas;
fortalecimento do terreno.

DD-MVP-068B — Arena
Local:
Salão das Runas Eternas
Características:
pilares rúnicos;
inscrições luminosas;
mecanismos antigos;
plataformas circulares.

DD-MVP-068C — Fase I (100–75%)
Ataques:
projéteis rúnicos;
explosões localizadas;
barreiras mágicas.

DD-MVP-068D — Fase II (75–40%)
As runas do salão são ativadas.
Mecânicas:
zonas de fortalecimento;
explosões temporizadas;
armadilhas de energia.

DD-MVP-068E — Fase Final (40–0%)
O Mestre Rúnico passa a combinar:
magia;
armadilhas;
ataques diretos.
As mecânicas já apresentadas tornam-se mais rápidas e frequentes.

DD-MVP-068F — IA
O Mestre:
evita combate corpo a corpo;
posiciona-se próximo às runas;
força os jogadores a se deslocarem continuamente.

DD-MVP-069 — Loot do Mestre Rúnico
Status: PROPOSTA
Garantido
Ouro;
experiência;
Fragmento Rúnico Antigo.
Materiais
Cristal de Mana Rúnica;
Pergaminho Gravado;
Núcleo Rúnico.
Equipamentos
Martelo Rúnico;
Cajado das Inscrições;
Amuleto dos Antigos.

DD-MVP-070 — Filosofia Oficial dos Anões Renegados
Status: PROPOSTA
Os chefes desta família devem transmitir:
resistência;
domínio tecnológico;
utilização inteligente do ambiente;
disciplina militar.
Ao contrário dos Gigantes, sua força não vem do porte físico, mas da preparação e da engenharia.

DD-MVP-071 — Princípio das Arenas Mecânicas
Status: PROPOSTA
Chefes ligados a civilizações avançadas podem utilizar o próprio cenário como parte do combate.
Exemplos:
mecanismos ativáveis;
pontes móveis;
armadilhas;
plataformas;
dispositivos rúnicos.
Esses elementos devem criar decisões estratégicas para o grupo, sem depender de aleatoriedade.

Encerramento da Família
A família Anões Renegados passa a contar com dois perfis bem distintos:
Rei Anão Renegado — guerreiro pesado que domina a forja e o combate defensivo.
Mestre Rúnico — especialista em magia rúnica e controle do ambiente.
Esses dois encontros reforçam a identidade tecnológica e artesanal dos anões, diferenciando-os dos Elfos Hostis (precisão e mobilidade) e dos Gigantes (força bruta). Como nos blocos anteriores, estes chefes permanecem como propostas de design até que o GDD oficial detalhe essa família.
Perfeito. Registrado como APROVADO:
DD-MVP-066 — Rei Anão Renegado
DD-MVP-067 — Loot do Rei Anão Renegado
DD-MVP-068 — Mestre Rúnico
DD-MVP-069 — Loot do Mestre Rúnico
DD-MVP-070 — Filosofia Oficial dos Anões Renegados
DD-MVP-071 — Princípio das Arenas Mecânicas
Seguindo a organização do Bestiário que estamos consolidando, a próxima família é Humanos Hostis. Como nas famílias anteriores, os MVPs abaixo são propostas de design, pois o GDD disponível não define chefes específicos para essa categoria.

LOTE DD-MVP-072 — General Imperial (Projeto Completo)
DD-MVP-072A — Conceito
Status: PROPOSTA
O General Imperial é o comandante máximo de um exército humano hostil.
Sua força vem de:
disciplina militar;
estratégia;
liderança;
excelente treinamento.
Ele não depende de magia para representar uma ameaça.

DD-MVP-072B — Arena
Fortaleza Imperial
Características:
muralhas;
pátio interno;
torres de vigia;
barricadas.

DD-MVP-072C — Fase I (100–70%)
Ataques:
espada longa;
escudo;
investidas.
Seu combate lembra um cavaleiro extremamente experiente.

DD-MVP-072D — Fase II (70–35%)
O General reorganiza suas tropas.
Mecânicas:
pequena guarda de elite;
formação defensiva;
arqueiros de apoio em posições elevadas.
As tropas servem como apoio, nunca substituindo o chefe.

DD-MVP-072E — Fase Final (35–0%)
O General luta sozinho.
Mudanças:
maior agressividade;
ataques em sequência;
menor tempo entre golpes.

DD-MVP-072F — IA
O General:
procura proteger posições estratégicas;
muda de alvo quando identifica curandeiros ou conjuradores vulneráveis;
utiliza cobertura sempre que possível.

DD-MVP-073 — Loot do General Imperial
Status: PROPOSTA
Garantido
Ouro;
experiência;
Insígnia Imperial.
Materiais
Medalha do General;
Aço Temperado;
Estandarte de Guerra.
Equipamentos
Espada do General;
Escudo Imperial;
Armadura do Comandante.

LOTE DD-MVP-074 — Arquimago Imperial (Projeto Completo)
DD-MVP-074A — Conceito
Status: PROPOSTA
Maior autoridade mágica do império.
Especializado em:
magia ofensiva;
controle;
defesa.

DD-MVP-074B — Arena
Academia Arcana Imperial
Características:
biblioteca;
salões de estudo;
círculos mágicos;
cristais energizados.

DD-MVP-074C — Fase I (100–75%)
Ataques:
projéteis arcanos;
explosões;
escudos mágicos.

DD-MVP-074D — Fase II (75–40%)
O Arquimago ativa os círculos arcanos.
Novas mecânicas:
portais;
explosões rúnicas;
barreiras temporárias.

DD-MVP-074E — Fase Final (40–0%)
Todas as habilidades anteriores passam a ser utilizadas de forma combinada.
O foco permanece na execução correta das mecânicas, sem adicionar poderes inéditos na reta final.

DD-MVP-074F — IA
O Arquimago:
mantém distância;
procura linhas de visão favoráveis;
alterna ataque e defesa conforme a pressão dos jogadores.

DD-MVP-075 — Loot do Arquimago Imperial
Status: PROPOSTA
Garantido
Ouro;
experiência;
Cristal Arcano Imperial.
Materiais
Tomo Antigo;
Fragmento de Foco;
Núcleo de Mana.
Equipamentos
Cajado Imperial;
Manto do Arquimago;
Anel do Conselho Arcano.

DD-MVP-076 — Filosofia Oficial dos Humanos Hostis
Status: PROPOSTA**
Os chefes humanos devem vencer pela preparação, e não por vantagens sobrenaturais.
Características centrais:
coordenação;
estratégia;
uso inteligente do terreno;
equipamentos de alta qualidade.
Mesmo enfrentando monstros gigantes e criaturas mágicas em outras regiões, os líderes humanos permanecem perigosos por sua organização militar.

DD-MVP-077 — Princípio das Facções Humanas
Status: PROPOSTA
Os reinos humanos não formam um bloco único.
Diretrizes:
diferentes reinos podem ser aliados ou rivais;
facções militares possuem objetivos próprios;
mercenários, bandidos e exércitos regulares coexistem;
a reputação do jogador poderá influenciar sua relação com cada facção.
Essa abordagem amplia as possibilidades narrativas e evita tratar toda a humanidade como uma única entidade política.

Encerramento da Família
A família Humanos Hostis passa a contar com dois perfis complementares:
General Imperial — especialista em liderança militar, combate físico e tática.
Arquimago Imperial — especialista em magia organizada e controle do campo de batalha.
Esses chefes reforçam a ideia de que adversários humanos representam um desafio pela inteligência, disciplina e coordenação, diferenciando-se dos Anões Renegados (engenharia), Elfos Hostis (agilidade) e Demônios (poder sobrenatural). Como nos blocos anteriores, este lote permanece como proposta de design, pois o trecho do GDD disponível não especifica MVPs para essa família.

Perfeito. Registrado como APROVADO:
DD-MVP-072 — General Imperial
DD-MVP-073 — Loot do General Imperial
DD-MVP-074 — Arquimago Imperial
DD-MVP-075 — Loot do Arquimago Imperial
DD-MVP-076 — Filosofia Oficial dos Humanos Hostis
DD-MVP-077 — Princípio das Facções Humanas
Daqui em diante começamos a entrar nas famílias mais "fantásticas" do Bestiário. A próxima família proposta é Mar e Costa, aproveitando elementos que já fazem parte da visão de mundo de Elysia (ilhas, naufrágios, baleias, Kraken e exploração marítima), embora o trecho do GDD disponível ainda não detalhe seus MVPs.

LOTE DD-MVP-078 — Kraken (Projeto Completo)
DD-MVP-078A — Conceito
Status: PROPOSTA
O Kraken é o maior predador conhecido dos mares de Elysia.
Sua identidade é baseada em:
tamanho colossal;
domínio absoluto do oceano;
controle do campo através dos tentáculos.
Ele não é uma criatura maligna por natureza; trata-se de um animal ancestral extremamente territorial.

DD-MVP-078B — Arena
Local:
Mar das Tempestades
Características:
batalha sobre uma plataforma de pedra parcialmente submersa;
navios destruídos ao redor;
ondas constantes;
pilares rochosos emergindo do oceano.
O mar participa continuamente do combate.

DD-MVP-078C — Fase I (100–70%)
Ataques:
tentáculos individuais;
esmagamento;
chicotadas.
O corpo principal permanece submerso.

DD-MVP-078D — Fase II (70–35%)
O Kraken emerge parcialmente.
Novas mecânicas:
múltiplos tentáculos simultâneos;
ondas gigantes;
destruição parcial da plataforma.
Os jogadores precisam adaptar constantemente seu posicionamento.

DD-MVP-078E — Fase Final (35–0%)
O Kraken expõe sua cabeça.
Características:
mordidas;
jatos de água sob pressão;
combinações entre tentáculos e ataques diretos.

DD-MVP-078F — IA
O Kraken:
alterna o lado de onde emergem os tentáculos;
tenta separar grupos;
reage a jogadores que permanecem muito tempo na mesma área.

DD-MVP-079 — Loot do Kraken
Status: PROPOSTA
Garantido
Ouro;
experiência;
Tinta Abissal.
Materiais
Tentáculo Colossal;
Olho do Kraken;
Núcleo Marinho.
Equipamentos
Tridente do Abismo;
Escudo Oceânico;
Manto das Marés.

LOTE DD-MVP-080 — Leviatã (Projeto Completo)
DD-MVP-080A — Conceito
Status: PROPOSTA
O Leviatã é uma serpente oceânica ancestral.
Enquanto o Kraken domina pelo volume, o Leviatã domina pela velocidade.

DD-MVP-080B — Arena
Local:
Fenda Oceânica
Características:
ilhas estreitas;
recifes;
correntes marítimas;
plataformas naturais.

DD-MVP-080C — Fases
Fase I
Ataques:
investidas;
mordidas;
mergulhos rápidos.

Fase II
O Leviatã utiliza:
redemoinhos;
ondas de choque;
deslocamentos extremamente rápidos.

Fase III
Alterna continuamente:
superfície;
mergulho;
ataques laterais.
A luta recompensa leitura de movimento e posicionamento.

DD-MVP-080D — IA
O Leviatã:
evita permanecer parado;
procura flanquear os jogadores;
muda constantemente sua direção de ataque.

DD-MVP-081 — Loot do Leviatã
Status: PROPOSTA
Garantido
Ouro;
experiência;
Escama Abissal.
Materiais
Dente do Leviatã;
Coração Marinho;
Cristal das Profundezas.
Equipamentos
Lança Oceânica;
Armadura das Marés;
Elmo do Navegador.

DD-MVP-082 — Filosofia Oficial dos Chefes Marinhos
Status: PROPOSTA
Os grandes chefes do oceano devem transmitir isolamento e vulnerabilidade.
Princípios:
o mar é parte do combate;
movimentação constante;
controle do espaço através da água;
ataques previsíveis, mas de grande escala.
A arena deve ser tão importante quanto o próprio chefe.

DD-MVP-083 — Princípio da Exploração Oceânica
Status: PROPOSTA
Os chefes marinhos não permanecem permanentemente acessíveis.
Diretrizes:
alguns podem migrar entre regiões;
eventos climáticos influenciam seu aparecimento;
embarcações podem ser necessárias para iniciar determinados confrontos;
derrotar um chefe marítimo pode alterar temporariamente rotas de navegação e comércio.
Esse princípio reforça a exploração do oceano como um sistema vivo, em sintonia com a proposta de um mundo persistente.

DD-MVP-084 — Filosofia Oficial dos Chefes Colossais
Status: PROPOSTA
Chefes classificados como Colossais devem obedecer aos seguintes princípios:
o jogador enfrenta uma criatura que altera a percepção de escala do mundo;
partes do corpo podem possuir áreas de ataque distintas (como tentáculos ou cauda), mas continuam pertencendo a um único chefe;
o ambiente deve comunicar a grandiosidade da criatura antes mesmo do início do combate;
vencer deve transmitir a sensação de superar uma força da natureza, e não apenas derrotar um inimigo comum.

Encerramento da Família
A família Mar e Costa passa a contar com dois grandes encontros distintos:
Kraken — domínio territorial, destruição da arena e combate de grande escala.
Leviatã — mobilidade extrema, velocidade e ataques de emboscada.
Esses chefes ampliam a importância do oceano em Elysia, transformando a navegação em uma atividade que envolve risco, descoberta e eventos memoráveis, em vez de servir apenas como meio de transporte. As definições acima permanecem como propostas de design, pois o trecho do GDD disponível apenas estabelece a existência do oceano explorável e de criaturas como o Kraken, sem detalhar seus encontros.
Perfeito. Registrado como APROVADO:
DD-MVP-078 — Kraken
DD-MVP-079 — Loot do Kraken
DD-MVP-080 — Leviatã
DD-MVP-081 — Loot do Leviatã
DD-MVP-082 — Filosofia Oficial dos Chefes Marinhos
DD-MVP-083 — Princípio da Exploração Oceânica
DD-MVP-084 — Filosofia Oficial dos Chefes Colossais
A partir daqui começamos a desenvolver uma das famílias que terá maior impacto na lore de Elysia: Celestiais.
Assim como os Grandes Demônios representam uma ameaça ligada à Corrupção, os Celestiais representam as entidades que preservam o equilíbrio da Criação. Eles não são "anjos genéricos", mas guardiões ancestrais cuja existência antecede os reinos mortais.

LOTE DD-MVP-085 — Serafim Guardião (Projeto Completo)
DD-MVP-085A — Conceito
Status: PROPOSTA
O Serafim Guardião protege locais sagrados deixados pelos Primeiros Criadores.
Sua identidade é baseada em:
disciplina absoluta;
combate preciso;
proteção;
luz.
Ele não luta por vingança nem por ódio.
Enfrenta apenas aqueles considerados uma ameaça ao equilíbrio.

DD-MVP-085B — Arena
Templo Celestial
Características:
colunas gigantes;
mármore branco;
jardins suspensos;
pontes sobre o vazio;
cristais de luz.
Toda a arena transmite serenidade.

DD-MVP-085C — Fase I (100–70%)
Ataques:
espada de luz;
ondas sagradas;
investidas rápidas.
Combate extremamente técnico.

DD-MVP-085D — Fase II (70–35%)
O templo desperta.
Novas mecânicas:
pilares luminosos;
áreas protegidas;
explosões sagradas.
A arena torna-se parte ativa da batalha.

DD-MVP-085E — Fase Final (35–0%)
O Serafim mantém todas as habilidades anteriores.
Mudanças:
maior velocidade;
ataques combinados;
menor tempo entre habilidades.
Nenhum poder completamente novo surge nesta fase.

DD-MVP-085F — IA
O Serafim:
protege posições sagradas;
evita ataques desnecessários;
prioriza precisão em vez de agressividade.

DD-MVP-086 — Loot do Serafim Guardião
Status: PROPOSTA
Garantido
Ouro;
experiência;
Essência Celestial.
Materiais
Pena Sagrada;
Cristal Divino;
Fragmento da Luz Primordial.
Equipamentos
Espada da Aurora;
Escudo Celestial;
Armadura da Alvorada.

LOTE DD-MVP-087 — Arcanjo da Justiça (Projeto Completo)
DD-MVP-087A — Conceito
Status: PROPOSTA
O Arcanjo é uma entidade superior encarregada de proteger relíquias ligadas à criação de Elysia.
Sua identidade:
comandante;
guerreiro;
juiz.

DD-MVP-087B — Arena
Salão do Julgamento
Características:
trono central;
círculos sagrados;
vitrais gigantes;
plataformas elevadas.

DD-MVP-087C — Fase I
Ataques:
espada;
escudo;
ondas de energia.

DD-MVP-087D — Fase II
Novas mecânicas:
lanças de luz;
escudos temporários;
julgamento em área.

DD-MVP-087E — Fase Final
O Arcanjo utiliza:
combinações de espada e magia;
investidas rápidas;
ataques circulares.
Todas as mecânicas já apresentadas passam a ser utilizadas de forma integrada.

DD-MVP-087F — IA
O Arcanjo:
adapta sua posição conforme a movimentação do grupo;
alterna entre defesa e ofensiva;
protege o centro da arena.

DD-MVP-088 — Loot do Arcanjo
Status: PROPOSTA
Garantido
Ouro;
experiência;
Núcleo Celestial.
Materiais
Fragmento da Justiça;
Liga Celestial;
Cristal da Alvorada.
Equipamentos
Lança da Justiça;
Coroa Celestial;
Manto do Julgamento.

DD-MVP-089 — Filosofia Oficial dos Celestiais
Status: PROPOSTA
Os Celestiais não são simplesmente "o oposto dos Demônios".
Eles representam:
ordem;
equilíbrio;
proteção;
responsabilidade.
Mesmo quando enfrentam jogadores, sua motivação é preservar aquilo que lhes foi confiado, não destruir indiscriminadamente.

DD-MVP-090 — Princípio da Neutralidade Superior
Status: PROPOSTA
Os Celestiais não participam diretamente dos conflitos políticos entre mortais.
Diretrizes:
podem cooperar com humanos, elfos ou anões;
podem entrar em combate contra qualquer raça caso uma relíquia sagrada seja ameaçada;
não pertencem a nenhum reino mortal;
respondem apenas às leis estabelecidas pelos Criadores.

DD-MVP-091 — Grandes Entidades Celestiais
Status: PROPOSTA
Assim como ocorre com os Grandes Demônios, os Celestiais Supremos permanecem reservados para a narrativa principal.
Diretrizes:
não fazem parte do Bestiário comum;
possuem nomes próprios;
têm papel central na história;
podem ser classificados como Míticos;
serão desenvolvidos juntamente com os grandes capítulos da lore.
Isso preserva a escala narrativa e evita banalizar as entidades mais importantes do universo.

Encerramento da Família
A família Celestiais passa a ter dois grandes representantes de alto nível:
Serafim Guardião — defensor de templos e relíquias.
Arcanjo da Justiça — comandante celestial e juiz dos mortais.
A filosofia da família diferencia claramente os Celestiais dos Demônios. Enquanto os Demônios buscam expandir a Corrupção, os Celestiais existem para preservar a ordem da criação, mesmo que isso ocasionalmente os coloque em conflito com os próprios jogadores.
Esse também é um bom ponto de equilíbrio na cosmologia de Elysia: as entidades supremas do Bem e da Corrupção permanecem fora do Bestiário comum e só serão reveladas quando a história principal exigir. Isso ajuda a manter espaço para crescimento da narrativa sem reduzir o impacto dessas figuras.
Perfeito. Registrado como APROVADO:
DD-MVP-085 — Serafim Guardião
DD-MVP-086 — Loot do Serafim Guardião
DD-MVP-087 — Arcanjo da Justiça
DD-MVP-088 — Loot do Arcanjo
DD-MVP-089 — Filosofia Oficial dos Celestiais
DD-MVP-090 — Princípio da Neutralidade Superior
DD-MVP-091 — Grandes Entidades Celestiais
A partir deste ponto começamos uma família que terá enorme importância para a exploração do mundo: Ruínas Antigas e Civilizações Perdidas. Ela conecta arqueologia, história e exploração, oferecendo chefes que guardam conhecimentos esquecidos em vez de simplesmente proteger tesouros.

LOTE DD-MVP-092 — Guardião de Pedra (Projeto Completo)
DD-MVP-092A — Conceito
Status: PROPOSTA
O Guardião de Pedra é um construto criado pelos Primeiros Povos para proteger cidades desaparecidas.
Não possui emoções nem vontade própria.
Sua única missão é impedir que intrusos profanem as ruínas.

DD-MVP-092B — Arena
Templo Esquecido
Características:
pilares monumentais;
corredores parcialmente destruídos;
mecanismos antigos;
inscrições em língua primordial;
estátuas gigantes.
A arena transmite a sensação de uma civilização muito anterior aos reinos atuais.

DD-MVP-092C — Fase I (100–70%)
Ataques:
socos monumentais;
esmagamentos;
ondas de impacto.
Movimentos lentos, porém extremamente precisos.

DD-MVP-092D — Fase II (70–35%)
O templo desperta.
Novas mecânicas:
paredes móveis;
armadilhas ancestrais;
colunas que emergem do solo.
A arena torna-se um grande mecanismo defensivo.

DD-MVP-092E — Fase Final (35–0%)
O núcleo do Guardião fica exposto.
Mudanças:
maior velocidade;
golpes em sequência;
uso constante das estruturas do templo.

DD-MVP-092F — IA
O Guardião:
protege o núcleo do templo;
utiliza o cenário para bloquear rotas;
não persegue jogadores para fora da área sagrada.

DD-MVP-093 — Loot do Guardião de Pedra
Status: PROPOSTA
Garantido
Ouro;
experiência;
Fragmento do Núcleo Antigo.
Materiais
Pedra Viva;
Cristal Primordial;
Engrenagem Ancestral.
Equipamentos
Martelo do Guardião;
Escudo Monolítico;
Braceletes da Fundação.

LOTE DD-MVP-094 — Imperador Esquecido (Projeto Completo)
DD-MVP-094A — Conceito
Status: PROPOSTA
Último soberano de uma civilização desaparecida.
Seu corpo foi preservado por magia ancestral.
Sua consciência permanece ligada ao antigo império.

DD-MVP-094B — Arena
Sala do Trono Perdido
Características:
trono monumental;
mosaicos antigos;
colunas douradas desgastadas;
teto parcialmente destruído.

DD-MVP-094C — Fase I (100–75%)
Ataques:
espada cerimonial;
magia imperial;
comandos de autoridade.

DD-MVP-094D — Fase II (75–40%)
O Imperador desperta os antigos defensores.
Mecânicas:
estátuas animadas;
guardas espirituais;
selos imperiais.
As invocações servem para representar os últimos defensores do império.

DD-MVP-094E — Fase Final (40–0%)
O Imperador canaliza toda a energia restante do trono.
Características:
ataques combinados;
maior alcance;
conjurações mais rápidas.

DD-MVP-094F — IA
O Imperador:
procura permanecer próximo ao trono;
alterna entre magia e espada;
utiliza os guardas apenas como apoio.

DD-MVP-095 — Loot do Imperador Esquecido
Status: PROPOSTA
Garantido
Ouro;
experiência;
Selo Imperial Antigo.
Materiais
Coroa Fragmentada;
Pergaminho Imperial;
Núcleo Real.
Equipamentos
Espada do Último Imperador;
Coroa da Dinastia Perdida;
Manto Imperial.

DD-MVP-096 — Filosofia Oficial das Civilizações Perdidas
Status: PROPOSTA
Os chefes dessa família representam a memória de povos desaparecidos.
Características:
arquitetura monumental;
tecnologia ou magia esquecida;
defesa de conhecimento antigo;
respeito pela história do mundo.
O foco não é a maldade, mas a preservação de um legado.

DD-MVP-097 — Princípio da Arqueologia Viva
Status: PROPOSTA
As ruínas de Elysia devem contar histórias sem depender exclusivamente de diálogos.
Diretrizes:
arquitetura revela costumes da civilização;
murais narram eventos históricos;
mecanismos mostram seu nível tecnológico;
objetos encontrados ajudam a reconstruir a cronologia do mundo.
Cada ruína deve funcionar como uma peça do quebra-cabeça da história de Elysia.

DD-MVP-098 — Relíquias Históricas
Status: PROPOSTA
Determinadas relíquias obtidas em ruínas antigas possuem valor além do equipamento.
Princípios:
podem desbloquear novas áreas;
podem ativar mecanismos ancestrais;
podem iniciar missões especiais;
algumas pertencem a coleções mantidas por estudiosos e bibliotecas.
Dessa forma, explorar ruínas recompensa não apenas o combate, mas também a investigação e a progressão da narrativa.

Encerramento da Família
A família Ruínas Antigas e Civilizações Perdidas introduz uma identidade diferente das anteriores. Seus chefes não são conquistadores, demônios ou predadores naturais; são guardiões de um passado esquecido.
Essa abordagem também fortalece a exploração de Elysia: o jogador não visita ruínas apenas para obter equipamentos, mas para descobrir fragmentos da história do mundo, entender antigas civilizações e encontrar relíquias capazes de influenciar a exploração futura. Isso cria uma ligação direta entre o Bestiário, a exploração e a narrativa principal, tornando cada grande ruína um capítulo vivo da história do continente.
Perfeito. Registrado como APROVADO:
DD-MVP-092 — Guardião de Pedra
DD-MVP-093 — Loot do Guardião de Pedra
DD-MVP-094 — Imperador Esquecido
DD-MVP-095 — Loot do Imperador Esquecido
DD-MVP-096 — Filosofia Oficial das Civilizações Perdidas
DD-MVP-097 — Princípio da Arqueologia Viva
DD-MVP-098 — Relíquias Históricas
Chegamos agora a uma família que pode se tornar um dos conteúdos de maior dificuldade do jogo: Mortos-Vivos Superiores. Diferentemente dos zumbis e esqueletos comuns encontrados durante a progressão, esta categoria reúne seres que mantiveram inteligência, poder e identidade após a morte.

LOTE DD-MVP-099 — Lich Supremo (Projeto Completo)
DD-MVP-099A — Conceito
Status: PROPOSTA
O Lich Supremo foi um dos maiores arquimagos da história de Elysia.
Recusando-se a aceitar a morte, transferiu sua alma para um Filactério, tornando-se um morto-vivo imortal.
Sua identidade é baseada em:
conhecimento absoluto;
magia proibida;
planejamento;
paciência.
Ele não busca destruição indiscriminada, mas conhecimento eterno.

DD-MVP-099B — Arena
Biblioteca dos Condenados
Características:
milhares de livros antigos;
corredores infinitos;
laboratórios alquímicos abandonados;
círculos necromânticos;
estantes parcialmente destruídas.
O ambiente deve transmitir a sensação de um lugar onde séculos de conhecimento foram preservados... e corrompidos.

DD-MVP-099C — Fase I (100–75%)
Ataques:
projéteis necróticos;
maldições;
explosões arcanas.
Nesta fase evita qualquer combate físico.

DD-MVP-099D — Fase II (75–40%)
O Lich ativa seu laboratório.
Novas mecânicas:
esqueletos arcanos;
barreiras necromânticas;
áreas amaldiçoadas.
O objetivo é controlar a arena.

DD-MVP-099E — Fase Final (40–0%)
Toda a energia do Filactério é utilizada.
Mudanças:
conjuração quase instantânea;
teleporte constante;
combinação entre magia ofensiva e maldições.
Nenhuma habilidade completamente nova surge; apenas uma evolução das já apresentadas.

DD-MVP-099F — IA
O Lich:
mantém distância;
protege seu Filactério;
prioriza conjuradores inimigos;
utiliza o terreno para dificultar aproximações.

DD-MVP-100 — Loot do Lich Supremo
Status: PROPOSTA
Garantido
Ouro;
experiência;
Fragmento do Filactério.
Materiais
Tomo Proibido;
Essência Necrótica;
Cristal da Alma.
Equipamentos
Cajado do Lich;
Manto da Eternidade;
Anel do Necromante Supremo.

LOTE DD-MVP-101 — Rei Esqueleto (Projeto Completo)
DD-MVP-101A — Conceito
Status: PROPOSTA
Antigo soberano cujo império caiu há séculos.
Mesmo após a morte continua comandando seu exército.
Sua identidade:
comandante militar;
guerreiro pesado;
símbolo de autoridade.

DD-MVP-101B — Arena
Cripta Real
Características:
salão do trono;
colunas antigas;
sarcófagos;
estandartes destruídos;
grandes portões de pedra.

DD-MVP-101C — Fase I
Ataques:
espada colossal;
escudo;
ondas de impacto.

DD-MVP-101D — Fase II
O Rei convoca:
guardas reais;
cavaleiros esqueletos;
arqueiros ancestrais.
As tropas representam sua antiga guarda de elite.

DD-MVP-101E — Fase Final
O Rei abandona parte da defesa.
Características:
maior velocidade;
ataques em sequência;
golpes em área.

DD-MVP-101F — IA
O Rei:
lidera o avanço;
protege sua guarda;
procura manter a formação do exército.

DD-MVP-102 — Loot do Rei Esqueleto
Status: PROPOSTA
Garantido
Ouro;
experiência;
Coroa Quebrada.
Materiais
Osso Real;
Liga Antiga;
Fragmento do Trono.
Equipamentos
Espada do Rei Esqueleto;
Escudo Real;
Coroa dos Mortos.

DD-MVP-103 — Filosofia Oficial dos Mortos-Vivos Superiores
Status: PROPOSTA
Os Mortos-Vivos Superiores diferenciam-se dos mortos-vivos comuns por manterem:
inteligência;
memória;
estratégia;
objetivos próprios.
Eles não são criaturas irracionais, mas indivíduos que transcenderam a morte.

DD-MVP-104 — Princípio da Imortalidade Artificial
Status: PROPOSTA
Alguns mortos-vivos superiores utilizam métodos artificiais para prolongar sua existência.
Exemplos:
Filactérios;
rituais necromânticos;
relíquias amaldiçoadas;
vínculos espirituais.
Esses métodos podem ser explorados em missões e na narrativa, criando alternativas ao simples confronto direto.

DD-MVP-105 — Filosofia da Necromancia
Status: PROPOSTA
Em Elysia, a Necromancia não é apenas uma forma de magia ofensiva.
Ela é uma escola de estudo sobre:
vida;
morte;
alma;
preservação;
corrupção.
Isso permite que existam necromantes com diferentes motivações na narrativa, enquanto aqueles que rompem os limites naturais tornam-se antagonistas.

Encerramento da Família
A família Mortos-Vivos Superiores estabelece um contraste importante dentro do Bestiário:
Lich Supremo — conhecimento, magia e imortalidade planejada.
Rei Esqueleto — liderança militar, disciplina e autoridade eterna.
Além de enriquecer o conteúdo de alto nível, essa família amplia a cosmologia de Elysia ao mostrar que a morte não representa um fim único: alguns buscam aceitá-la, outros tentam dominá-la, e poucos conseguem transcendê-la, pagando um preço que altera profundamente sua natureza. Esse contraste cria oportunidades para futuras missões, bibliotecas antigas, ordens de necromantes e conflitos éticos envolvendo o uso da magia da morte.
Perfeito. Registrado como APROVADO:
DD-MVP-099 — Lich Supremo
DD-MVP-100 — Loot do Lich Supremo
DD-MVP-101 — Rei Esqueleto
DD-MVP-102 — Loot do Rei Esqueleto
DD-MVP-103 — Filosofia Oficial dos Mortos-Vivos Superiores
DD-MVP-104 — Princípio da Imortalidade Artificial
DD-MVP-105 — Filosofia da Necromancia
Agora entramos em uma família que considero essencial para dar personalidade ao mundo: Bestas Lendárias. Enquanto os Colossais representam forças da natureza e os Primordiais personificam os elementos, as Bestas Lendárias são criaturas únicas que se tornaram parte do folclore de Elysia. Muitas pessoas sequer acreditam que elas existam.

LOTE DD-MVP-106 — Fenrir, o Lobo Ancestral (Projeto Completo)
DD-MVP-106A — Conceito
Status: PROPOSTA
Fenrir é o maior predador terrestre conhecido.
Não é maligno.
É uma criatura primordial da Era Selvagem que sobreviveu até os dias atuais.
Sua presença modifica completamente o ecossistema ao seu redor.
Sua identidade:
velocidade;
inteligência;
caça;
domínio territorial.

DD-MVP-106B — Arena
Floresta Congelada de Skjold
Características:
neve profunda;
pinheiros gigantes;
rios congelados;
penhascos;
baixa visibilidade durante tempestades.
Não existe uma arena fechada.
Fenrir utiliza toda a região.

DD-MVP-106C — Fase I (100–70%)
Fenrir observa o grupo.
Ataques:
investidas;
mordidas;
saltos laterais.
Ele nunca permanece parado.

DD-MVP-106D — Fase II (70–35%)
Fenrir assume comportamento de caça.
Mecânicas:
desaparece entre a floresta;
utiliza emboscadas;
percorre rapidamente grandes distâncias.
O combate deixa de ser frontal.

DD-MVP-106E — Fase Final (35–0%)
Fenrir luta para sobreviver.
Mudanças:
ataques extremamente rápidos;
combos de mordidas;
perseguição contínua.

DD-MVP-106F — IA
Fenrir:
escolhe o alvo mais isolado;
evita permanecer cercado;
utiliza obstáculos naturais para quebrar linha de visão.
Sua IA deve parecer a de um grande predador, não a de um monstro comum.

DD-MVP-107 — Loot de Fenrir
Status: PROPOSTA
Garantido
Ouro;
experiência;
Presa Ancestral.
Materiais
Pelo Primordial;
Garras de Fenrir;
Coração Selvagem.
Equipamentos
Manto do Lobo Ancestral;
Machado da Caçada;
Botas da Matilha.

LOTE DD-MVP-108 — Fênix Eterna (Projeto Completo)
DD-MVP-108A — Conceito
Status: PROPOSTA
A Fênix simboliza renovação.
Não pertence aos Celestiais.
Também não pertence aos Primordiais.
É uma espécie única ligada ao ciclo eterno de vida, morte e renascimento.

DD-MVP-108B — Arena
Cratera do Sol Nascente
Características:
lago de magma;
pilares vulcânicos;
cinzas constantes;
calor intenso.

DD-MVP-108C — Fase I
Ataques:
bolas de fogo;
voo rasante;
penas flamejantes.

DD-MVP-108D — Fase II
A Fênix envolve a arena em chamas.
Mecânicas:
áreas incendiadas;
tornados de fogo;
explosões térmicas.

DD-MVP-108E — Fase Final
Ao atingir aproximadamente 10% de vida, a Fênix inicia um Renascimento Parcial.
Regras:
recupera apenas 20% da vida máxima;
isso pode acontecer apenas uma vez por combate;
mantém todas as mecânicas anteriores.
Essa habilidade reforça sua identidade sem tornar a luta excessivamente longa.

DD-MVP-108F — IA
A Fênix:
permanece quase sempre em movimento;
alterna voo alto e baixo;
prioriza áreas abertas da arena.

DD-MVP-109 — Loot da Fênix
Status: PROPOSTA
Garantido
Ouro;
experiência;
Cinzas Eternas.
Materiais
Pena Flamejante;
Coração Ígneo;
Núcleo Solar.
Equipamentos
Manto da Fênix;
Elmo do Renascimento;
Cajado das Cinzas.

DD-MVP-110 — Filosofia Oficial das Bestas Lendárias
Status: PROPOSTA
As Bestas Lendárias devem transmitir a sensação de que pertencem ao mundo há muito mais tempo que as civilizações.
Princípios:
existem pouquíssimos indivíduos;
cada criatura possui identidade própria;
são parte do equilíbrio natural;
não servem a nenhuma facção.
Derrotá-las é um feito extraordinário.

DD-MVP-111 — Princípio dos Encontros Naturais
Status: PROPOSTA
As Bestas Lendárias não aguardam jogadores em salas de chefe.
Diretrizes:
percorrem grandes territórios;
podem deixar rastros;
NPCs podem fornecer pistas sobre seus deslocamentos;
alguns encontros podem depender de condições ambientais, como clima ou horário.
A busca pela criatura deve fazer parte da experiência, e não apenas o combate.

DD-MVP-112 — Filosofia da Fauna Mítica
Status: PROPOSTA
Nem toda criatura extremamente poderosa precisa estar ligada ao Bem, ao Mal ou à Corrupção.
Existem seres cuja função é simplesmente existir dentro do equilíbrio natural de Elysia.
Essas criaturas:
podem ignorar conflitos entre reinos;
podem atacar qualquer invasor de seu território;
podem coexistir com outras espécies sem obedecer a hierarquias políticas ou religiosas.
Esse princípio amplia a biodiversidade do mundo e evita que todos os grandes chefes estejam vinculados à narrativa principal.

Encerramento da Família
A família Bestas Lendárias introduz um novo tipo de desafio: criaturas cuja importância vem da sua existência única no mundo, e não de alianças, impérios ou guerras.
Ela complementa muito bem as famílias já aprovadas:
Colossais → forças da natureza em escala monumental.
Primordiais → personificações dos elementos.
Bestas Lendárias → espécies únicas que sobreviveram desde eras remotas.
Celestiais → guardiões da ordem.
Grandes Demônios → agentes da Corrupção.
Com isso, Elysia passa a ter uma fauna de alto nível diversificada, em que cada família possui um papel próprio na ecologia e na mitologia do mundo, sem sobreposição de funções.

Perfeito. Registrado como APROVADO:
DD-MVP-106 — Fenrir
DD-MVP-107 — Loot de Fenrir
DD-MVP-108 — Fênix Eterna
DD-MVP-109 — Loot da Fênix
DD-MVP-110 — Filosofia Oficial das Bestas Lendárias
DD-MVP-111 — Princípio dos Encontros Naturais
DD-MVP-112 — Filosofia da Fauna Mítica
Chegamos agora a uma família que considero fundamental para o endgame de Elysia: os Dragões Míticos.
No GDD original nós propositalmente deixamos os Dragões Míticos em aberto. Já aprovamos anteriormente que eles não fariam parte do Bestiário comum (DD-MVP-039 e DD-MVP-040). Agora vamos definir como eles existirão, sem nomear indivíduos específicos. Assim preservamos o mistério e abrimos espaço para futuras expansões.

LOTE DD-MVP-113 — Filosofia Oficial dos Dragões Míticos
DD-MVP-113A — Natureza
Status: PROPOSTA
Os Dragões Míticos representam o ápice absoluto da evolução dracônica.
Eles não pertencem a uma espécie comum.
Cada Dragão Mítico é único.
Não existem dois exemplares idênticos.

DD-MVP-113B — Quantidade
Diretrizes:
extremamente raros;
menos de dez vivos em todo Elysia;
alguns podem permanecer adormecidos durante séculos;
alguns talvez nunca sejam encontrados.
Sua existência deve ser tratada quase como uma lenda.

DD-MVP-113C — Poder
Um Dragão Mítico deve representar um desastre natural.
Comparações:
exércitos evitam enfrentá-los;
cidades podem ser destruídas;
reis preferem negociar do que lutar.
O jogador nunca deve sentir que está enfrentando um "dragão grande".
Ele está enfrentando uma entidade que moldou a história do continente.

DD-MVP-114 — Territórios Míticos
Status: PROPOSTA
Cada Dragão Mítico domina um território inteiro.
Não apenas uma caverna.
Exemplos:
cadeia de montanhas;
arquipélago;
deserto inteiro;
floresta ancestral;
região vulcânica.
O próprio ambiente reflete sua presença.

DD-MVP-115 — Inteligência Dracônica
Status: PROPOSTA
Os Dragões Míticos possuem inteligência comparável — ou superior — à das civilizações.
Características:
aprendem;
negociam;
mentem;
fazem alianças;
guardam conhecimento.
Alguns conhecem acontecimentos anteriores à fundação dos reinos atuais.

DD-MVP-116 — Tesouros Dracônicos
Status: PROPOSTA
Os tesouros não representam apenas riqueza.
Podem conter:
relíquias perdidas;
armas lendárias;
livros desaparecidos;
artefatos celestiais;
objetos demoníacos selados.
O covil de um Dragão Mítico funciona como um museu vivo da história de Elysia.

DD-MVP-117 — O Direito do Dragão
Status: PROPOSTA
Os Dragões Míticos reconhecem propriedade.
Tudo aquilo presente dentro de seu território é considerado parte de seu domínio.
Isso inclui:
cidades abandonadas;
ruínas;
montanhas;
minas;
artefatos.
Mesmo povos inteligentes podem tornar-se "invasores" caso ocupem essas regiões.

DD-MVP-118 — Filosofia Oficial dos Encontros Míticos
Status: PROPOSTA
Enfrentar um Dragão Mítico deve ser um acontecimento mundial.
Diretrizes:
preparação longa;
múltiplas missões;
exploração do território;
descoberta de informações;
abertura gradual do encontro.
O combate representa apenas a etapa final.

DD-MVP-119 — Princípio da Vitória Incompleta
Status: PROPOSTA
Derrotar um Dragão Mítico não significa obrigatoriamente sua morte.
Resultados possíveis:
retirada estratégica;
negociação;
selamento;
fuga;
morte definitiva.
Cada encontro poderá possuir um desfecho próprio.
Isso permite que alguns Dragões continuem existindo na narrativa mesmo após serem derrotados.

DD-MVP-120 — Filosofia da Escala Narrativa
Status: PROPOSTA
Os Dragões Míticos ocupam o mesmo patamar narrativo dos:
Grandes Celestiais;
Grandes Demônios;
entidades da Criação.
Eles não são apenas chefes.
São personagens históricos.
A simples menção de seus nomes deve provocar respeito entre reis, estudiosos e aventureiros.

DD-MVP-121 — Reserva Oficial
Status: PROPOSTA
Os Dragões Míticos não receberão nomes, elementos, habilidades ou encontros oficiais nesta versão do GDD.
Esses detalhes serão reservados para futuras expansões da narrativa principal.
Isso garante que:
novos continentes possam introduzir Dragões inéditos;
eventos mundiais possam revelar um Dragão adormecido;
campanhas futuras mantenham o impacto dessas criaturas.

Encerramento da Filosofia dos Dragões Míticos
Com este lote, os Dragões Míticos deixam de ser apenas "dragões muito fortes" e passam a ocupar um papel semelhante ao de personagens históricos vivos.
Eles não existem para serem derrotados repetidamente, mas para marcar momentos importantes da história de Elysia.
Essa decisão também mantém espaço para anos de expansão do jogo. Um único Dragão Mítico pode sustentar uma grande atualização de conteúdo, com novas regiões, missões, facções, equipamentos e mudanças permanentes no mundo. Em vez de esgotar essas criaturas no lançamento, o GDD estabelece apenas sua filosofia, preservando o mistério e o potencial narrativo para o futuro.

Perfeito. Registrado como APROVADO:
DD-MVP-113 — Filosofia Oficial dos Dragões Míticos
DD-MVP-114 — Territórios Míticos
DD-MVP-115 — Inteligência Dracônica
DD-MVP-116 — Tesouros Dracônicos
DD-MVP-117 — O Direito do Dragão
DD-MVP-118 — Filosofia Oficial dos Encontros Míticos
DD-MVP-119 — Princípio da Vitória Incompleta
DD-MVP-120 — Filosofia da Escala Narrativa
DD-MVP-121 — Reserva Oficial dos Dragões Míticos

LOTE DD-MVP-122 — Os Quatro Cavaleiros da Corrupção
Status: PROPOSTA
Este lote introduz uma categoria extremamente rara de chefes. Eles não pertencem à hierarquia comum dos demônios. São manifestações da Corrupção em sua forma mais pura e representam conceitos, não apenas criaturas.
Esses encontros destinam-se ao conteúdo de mais alto nível do jogo.

DD-MVP-122A — Filosofia
Os Quatro Cavaleiros não governam territórios.
Eles representam estados inevitáveis que surgem quando a Corrupção alcança determinado nível.
Cada um possui personalidade própria.
Cada um altera profundamente a região onde aparece.

DD-MVP-123 — O Cavaleiro da Guerra
Conceito
Representa:
conquista;
violência;
ambição;
destruição organizada.
Ele não luta sozinho.
Sua presença faz surgir conflitos.
NPCs podem iniciar guerras.
Facções podem romper alianças.

Arena
Campo de batalha devastado.
Características:
fortalezas destruídas;
máquinas de guerra;
fumaça constante;
bandeiras queimadas.

Mecânicas
invoca soldados corrompidos;
utiliza cargas montadas;
alterna combate corpo a corpo e ataques em área.
Sua dificuldade vem da coordenação do campo de batalha.

DD-MVP-124 — O Cavaleiro da Fome
Conceito
Representa a escassez.
Onde passa:
plantações morrem;
rios secam;
animais desaparecem.

Arena
Campos estéreis.
Árvores mortas.
Solo rachado.

Mecânicas
Durante o combate:
reduz regeneração;
enfraquece consumíveis;
cria áreas de exaustão.
O grupo precisa administrar cuidadosamente seus recursos.

DD-MVP-125 — O Cavaleiro da Peste
Conceito
Representa doenças e corrupção biológica.
Sua presença altera ecossistemas inteiros.

Arena
Cidade abandonada.
Características:
casas destruídas;
névoa contaminada;
poços corrompidos.

Mecânicas
doenças temporárias;
criaturas infectadas;
mutações durante a luta.
As penalidades desaparecem após o término do encontro.

DD-MVP-126 — O Cavaleiro da Morte
Conceito
O mais antigo dos quatro.
Representa o fim inevitável.
Não demonstra ódio.
Não sente prazer.
Cumpre apenas sua função.

Arena
Necrópole Primordial.
Características:
silêncio absoluto;
monumentos gigantes;
rios de almas;
estruturas ancestrais.

Mecânicas
alterna entre ataques físicos e espirituais;
manipula almas;
cria zonas de silêncio mágico.
O combate enfatiza disciplina e posicionamento.

DD-MVP-127 — Loot dos Cavaleiros
Status: PROPOSTA
Cada Cavaleiro concede:
Garantido
Ouro;
experiência;
Fragmento da Corrupção.
Materiais exclusivos
Cada Cavaleiro possui materiais próprios utilizados em equipamentos de fim de jogo.
Esses materiais nunca são compartilhados entre eles.

DD-MVP-128 — Filosofia dos Quatro Cavaleiros
Os Quatro Cavaleiros devem transmitir:
inevitabilidade;
impacto mundial;
mudanças permanentes.
Eles não são chefes isolados.
Sua aparição modifica temporariamente o estado do mundo.
Exemplos:
rotas comerciais fechadas;
cidades evacuadas;
invasões;
migração de monstros.

DD-MVP-129 — Eventos Mundiais
A chegada de um Cavaleiro inicia automaticamente um Evento Mundial.
Características:
aviso para todos os jogadores;
duração limitada;
missões especiais;
participação coletiva.
Mesmo jogadores que não enfrentem diretamente o chefe podem contribuir para o evento.

DD-MVP-130 — Princípio dos Chefes Históricos
Os Cavaleiros pertencem à categoria Chefes Históricos.
Características:
aparecem muito raramente;
afetam toda a economia do servidor;
modificam regiões inteiras;
geram registros permanentes na cronologia do mundo.
Sua derrota torna-se parte da história oficial do servidor.

DD-MVP-131 — Filosofia Oficial dos Eventos Mundiais
Status: PROPOSTA
Os maiores eventos de Elysia devem possuir consequências reais.
Diretrizes:
mudanças temporárias ou permanentes no mapa;
novos NPCs ou deslocamento de populações;
desbloqueio de missões e áreas após o evento;
registro em uma Crônica do Mundo, acessível em bibliotecas e capitais, narrando quando e como o evento foi resolvido.
Isso faz com que os jogadores sintam que suas ações influenciam a evolução do mundo, reforçando a ideia de um MMORPG vivo.

Encerramento da Família
Os Quatro Cavaleiros da Corrupção tornam-se um elo entre o Bestiário, a narrativa principal e os sistemas de eventos globais.
Eles não substituem os Grandes Demônios nem os Dragões Míticos. Em vez disso, representam uma categoria única de Chefes Históricos, cuja simples aparição altera o comportamento do servidor inteiro.
Com este lote, também nasce oficialmente o conceito de Eventos Mundiais, que poderá ser reutilizado futuramente para invasões demoníacas, despertar de Dragões Míticos, catástrofes naturais e outras grandes expansões de Elysia.

Perfeito. Registrado como APROVADO:
DD-MVP-122 — Filosofia dos Quatro Cavaleiros
DD-MVP-123 — Cavaleiro da Guerra
DD-MVP-124 — Cavaleiro da Fome
DD-MVP-125 — Cavaleiro da Peste
DD-MVP-126 — Cavaleiro da Morte
DD-MVP-127 — Loot dos Cavaleiros
DD-MVP-128 — Filosofia dos Quatro Cavaleiros
DD-MVP-129 — Eventos Mundiais
DD-MVP-130 — Chefes Históricos
DD-MVP-131 — Filosofia Oficial dos Eventos Mundiais

LOTE DD-MVP-132 — Os Titãs Primordiais
Status: PROPOSTA
Este lote estabelece uma categoria acima dos Primordiais Elementais.
Enquanto os Primordiais representam os grandes elementos da natureza, os Titãs Primordiais representam as forças fundamentais que moldaram Elysia antes mesmo do surgimento das primeiras civilizações.
Eles não pertencem ao ciclo comum do mundo.
São considerados entidades pré-históricas.

DD-MVP-132A — Filosofia
Os Titãs não governam reinos.
Eles moldam continentes.
Quando despertam, rios mudam de curso.
Montanhas desabam.
Novas cavernas surgem.
Florestas desaparecem.
Seu despertar altera permanentemente a geografia.

DD-MVP-133 — O Titã da Montanha
Conceito
Representa:
estabilidade;
peso;
resistência;
criação das cordilheiras.
Sua movimentação é extremamente lenta.
Cada passo provoca terremotos.

Arena
Não existe uma arena tradicional.
Toda a cadeia montanhosa é o campo de batalha.

Mecânicas
deslizamentos;
queda de rochas;
fissuras;
colapso de cavernas.
O ambiente representa a maior ameaça.

DD-MVP-134 — O Titã dos Oceanos
Conceito
Representa:
profundidade;
marés;
tempestades;
nascimento dos oceanos.

Arena
Arquipélago inteiro.
Ilhas podem desaparecer sob a água.
Outras emergem.

Mecânicas
tsunamis;
correntes marítimas;
tempestades;
destruição de embarcações.

DD-MVP-135 — O Titã dos Céus
Conceito
Representa:
ventos;
trovões;
tempestades;
atmosfera.

Arena
Ilhas flutuantes.
Nuvens permanentes.
Descargas elétricas.

Mecânicas
furacões;
raios;
correntes de vento;
mudanças constantes de altitude.

DD-MVP-136 — O Titã do Submundo
Conceito
Representa:
magma;
profundezas;
calor primordial.
Não é um demônio.
É uma força geológica.

Arena
Rede gigantesca de cavernas.
Lagos de magma.
Colunas vulcânicas.

Mecânicas
erupções;
lava;
gases;
terremotos.

DD-MVP-137 — Filosofia Oficial dos Titãs
Os Titãs não podem ser interpretados como criaturas comuns.
Eles são:
acidentes geográficos vivos;
responsáveis pela formação natural do mundo;
entidades extremamente antigas.
Um Titã pode permanecer imóvel durante centenas de anos e ser confundido com parte da paisagem.

DD-MVP-138 — Eventos Geológicos
O despertar de um Titã provoca:
terremotos;
erupções;
tsunamis;
mudanças climáticas.
Esses efeitos atingem todo o continente.

DD-MVP-139 — Exploração Pós-Titã
Após o despertar ou derrota de um Titã:
novas áreas tornam-se acessíveis.
Exemplos:
cavernas abertas;
montanhas partidas;
rios desviados;
cidades soterradas reveladas.
Assim, o combate gera consequências permanentes para a exploração.

DD-MVP-140 — Filosofia das Forças Primordiais
Enquanto:
Primordiais Elementais representam os elementos;
Dragões Míticos representam a evolução máxima da vida;
Grandes Demônios representam a Corrupção;
Celestiais representam a Ordem;
os Titãs representam a própria formação física de Elysia.
Eles não defendem ideologias.
Não possuem impérios.
Não travam guerras.
Eles simplesmente existem.

DD-MVP-141 — Reserva Oficial dos Titãs
Nesta versão do GDD:
nenhum Titã receberá nome próprio;
nenhum receberá aparência definitiva;
nenhum terá estatísticas oficiais.
Apenas sua função cosmológica será definida.
Isso permite introduzir novos Titãs em futuras expansões sem comprometer a consistência do universo.

Encerramento da Família
Com este lote, a cosmologia de Elysia passa a ter uma estrutura clara em diferentes escalas:
Forças Fundamentais
Criador
Coração de Elysia
Corrupção
Entidades Cósmicas
Grandes Celestiais
Grandes Demônios
Entidades Primordiais
Titãs Primordiais
Primordiais Elementais
Entidades Históricas
Dragões Míticos
Quatro Cavaleiros
Fauna Mítica
Bestas Lendárias
Colossais
Essa hierarquia evita sobreposição de papéis e dá identidade própria a cada categoria de chefe. Em vez de simplesmente criar inimigos cada vez mais fortes, cada família passa a representar um aspecto específico da criação, da história ou do equilíbrio do mundo de Elysia. Isso facilita a expansão futura do universo e mantém a progressão narrativa consistente.

Perfeito. Registrado como APROVADO:
DD-MVP-132 — Filosofia dos Titãs Primordiais
DD-MVP-133 — Titã da Montanha
DD-MVP-134 — Titã dos Oceanos
DD-MVP-135 — Titã dos Céus
DD-MVP-136 — Titã do Submundo
DD-MVP-137 — Filosofia Oficial dos Titãs
DD-MVP-138 — Eventos Geológicos
DD-MVP-139 — Exploração Pós-Titã
DD-MVP-140 — Filosofia das Forças Primordiais
DD-MVP-141 — Reserva Oficial dos Titãs

LOTE DD-MVP-142 — Sistema Oficial de Categorias de Chefes
Status: PROPOSTA
Até aqui criamos dezenas de MVPs. Este lote organiza todos eles em uma única estrutura oficial para o GDD.

DD-MVP-142 — Hierarquia Oficial dos Chefes
Os chefes de Elysia passam a ser classificados em seis categorias.
Categoria I — Chefes Regionais
São os primeiros grandes desafios.
Características:
encontrados em dungeons;
protegendo territórios;
voltados para jogadores em progressão.
Exemplos:
Rei Troll;
Abelha Rainha;
Capitão Mercenário;
Treant Ancião.

Categoria II — Chefes de Facção
Lideram organizações ou povos.
Características:
possuem seguidores;
defendem fortalezas;
fazem parte de conflitos locais.
Exemplos:
Senhor da Guerra Élfico;
Arquimago Renegado;
General Imperial;
Rei Anão Renegado.

Categoria III — Chefes Lendários
São indivíduos extremamente raros.
Características:
únicos em determinada região;
conhecidos pelo folclore;
exigem preparação.
Exemplos:
Fenrir;
Fênix;
Lich Supremo;
Imperador Esquecido.

Categoria IV — Chefes Colossais
Criaturas capazes de alterar regiões inteiras.
Exemplos:
Kraken;
Leviatã;
Titã;
Arquidemônio.
Normalmente utilizam arenas em grande escala.

Categoria V — Chefes Históricos
Sua aparição modifica o servidor.
Exemplos:
Quatro Cavaleiros;
futuros eventos mundiais;
possíveis invasões continentais.
Derrotá-los altera a cronologia do mundo.

Categoria VI — Chefes Míticos
Maior categoria existente.
Reservada para:
Dragões Míticos;
Titãs Míticos;
Grandes Celestiais;
Grandes Demônios;
futuras entidades da narrativa principal.
Esses encontros representam marcos da história de Elysia.

DD-MVP-143 — Frequência de Aparição
Status: PROPOSTA
Cada categoria possui frequência distinta.
Categoria
Frequência
Regional
frequente
Facção
incomum
Lendário
raro
Colossal
muito raro
Histórico
evento mundial
Mítico
excepcional
A frequência é um conceito de design, não um tempo fixo de respawn.

DD-MVP-144 — Escalada de Complexidade
Status: PROPOSTA
A dificuldade não deve crescer apenas pelos atributos numéricos.
Cada categoria introduz novas exigências:
Regional: domínio das mecânicas básicas.
Facção: coordenação contra grupos organizados.
Lendário: leitura de padrões complexos.
Colossal: interação intensa com o ambiente.
Histórico: participação coletiva do servidor.
Mítico: integração entre narrativa, exploração e combate.

DD-MVP-145 — Filosofia da Recompensa
Status: PROPOSTA
Quanto maior a categoria do chefe, mais exclusiva deve ser sua recompensa.
A progressão deve ocorrer em três níveis:
Recompensas materiais
equipamentos;
componentes;
ouro;
recursos de craft.
Recompensas de exploração
acesso a novas áreas;
abertura de passagens;
novos NPCs;
novas missões.
Recompensas históricas
títulos;
conquistas;
registros na Crônica do Mundo;
mudanças permanentes no cenário.
Nem toda recompensa importante deve ser um item.

DD-MVP-146 — Filosofia da Persistência
Status: PROPOSTA
Os chefes não existem apenas para serem derrotados repetidamente.
Eles continuam influenciando o mundo antes, durante e depois dos confrontos.
Exemplos:
habitantes comentam sua presença;
caravanas evitam determinadas regiões;
monstros migram;
rotas comerciais mudam.
Assim, um chefe existe como parte viva do ecossistema.

DD-MVP-147 — Chefes e a Economia
Status: PROPOSTA
Os grandes chefes alimentam a economia, mas não a dominam.
Princípios:
materiais exclusivos entram no Craft;
itens lendários exigem recursos de múltiplas atividades;
derrotar um único chefe nunca produz todo o necessário para um equipamento final.
Isso preserva a importância da exploração, profissões, castelos e comércio entre jogadores, em linha com a filosofia do Craft do projeto.

DD-MVP-148 — Filosofia Oficial dos Chefes de Elysia
Status: PROPOSTA
Os chefes de Elysia não existem apenas como obstáculos.
Cada chefe deve cumprir pelo menos uma destas funções:
desenvolver a história do mundo;
proteger uma região importante;
representar uma espécie ou civilização;
introduzir uma mecânica inédita;
movimentar a economia;
incentivar exploração;
provocar cooperação entre jogadores.
Se um chefe não acrescentar nenhuma dessas funções, sua existência deve ser reavaliada.

DD-MVP-149 — Regra da Identidade Única
Status: PROPOSTA
Nenhum chefe poderá ser criado apenas para aumentar a quantidade de conteúdo.
Todo novo MVP deverá responder claramente a quatro perguntas:
O que ele representa no universo de Elysia?
Qual mecânica exclusiva ele introduz?
Por que ele existe naquela região?
O que muda no mundo quando ele aparece ou é derrotado?
Se essas quatro respostas não forem convincentes, o chefe deve ser redesenhado antes de entrar no jogo.

Encerramento da Etapa
Com este lote, o sistema de MVPs deixa de ser apenas uma coleção de chefes e passa a formar um ecossistema completo, onde cada encontro possui:
uma função narrativa;
uma função mecânica;
uma função econômica;
uma função de exploração;
uma função na progressão do jogador.
Na minha avaliação de design, este é um dos pilares que pode diferenciar Elysia de muitos MMORPGs: os chefes deixam de ser "piñatas de loot" e passam a ser elementos permanentes da construção do mundo. Isso conversa diretamente com outras decisões já aprovadas no GDD, como mundo persistente, economia entre jogadores, exploração sem instâncias obrigatórias e evolução contínua da história.
Perfeito. Registrado como APROVADO:
DD-MVP-142 — Hierarquia Oficial dos Chefes
DD-MVP-143 — Frequência de Aparição
DD-MVP-144 — Escalada de Complexidade
DD-MVP-145 — Filosofia da Recompensa
DD-MVP-146 — Filosofia da Persistência
DD-MVP-147 — Chefes e a Economia
DD-MVP-148 — Filosofia Oficial dos Chefes
DD-MVP-149 — Regra da Identidade Única
A partir daqui, considero que entramos na fase de consolidação definitiva do sistema de chefes. Em vez de criar novos MVPs aleatoriamente, vamos definir regras que deverão ser obedecidas por todos os chefes que existirem no Elysia, inclusive os que forem adicionados em expansões futuras.

LOTE DD-MVP-150 — Constituição Oficial dos Chefes
Status: PROPOSTA

DD-MVP-150 — Regra do Propósito
Todo chefe do Elysia deve existir por um motivo claro.
Ele deve cumprir pelo menos um dos seguintes papéis:
proteger uma região;
liderar uma facção;
preservar uma relíquia;
controlar um ecossistema;
representar uma força da natureza;
desempenhar um papel na narrativa principal.
Nenhum chefe será criado apenas para preencher conteúdo.

DD-MVP-151 — Regra da Exclusividade Mecânica
Cada chefe precisa possuir pelo menos uma mecânica que nenhum outro chefe utilize da mesma forma.
Exemplos:
regeneração extrema (Rei Troll);
renascimento parcial (Fênix);
destruição gradual da arena (Kraken);
comando de tropas (Capitão Mercenário);
caça e emboscada (Fenrir).
Mesmo compartilhando algumas habilidades, todo chefe deve ser lembrado por uma mecânica própria.

DD-MVP-152 — Regra da Evolução do Combate
Nenhum combate importante deve permanecer igual do início ao fim.
Diretrizes:
mudança de comportamento;
mudança do cenário;
novas combinações de habilidades;
alteração da IA.
A evolução deve aumentar a complexidade, e não apenas os atributos.

DD-MVP-153 — Regra da Leitura
Todo golpe poderoso precisa oferecer oportunidade de resposta.
Isso pode ocorrer através de:
animações;
sons;
efeitos visuais;
mudanças de postura;
preparação do ambiente.
A dificuldade deve surgir da execução e da tomada de decisão, não da falta de informação.

DD-MVP-154 — Regra da Justiça
Quando o jogador morrer para um chefe, ele deve ser capaz de identificar o motivo.
O jogo deve evitar:
dano invisível;
ataques impossíveis de perceber;
mecânicas sem explicação visual.
Derrotas devem ensinar.

DD-MVP-155 — Regra da Persistência Narrativa
Após derrotar um grande chefe, o mundo deve refletir esse acontecimento sempre que fizer sentido.
Exemplos:
NPCs comentam a vitória;
bibliotecas registram o ocorrido;
novas missões aparecem;
áreas tornam-se acessíveis;
determinadas criaturas deixam de aparecer temporariamente.
O combate passa a integrar a história do servidor.

DD-MVP-156 — Regra da Persistência Ecológica
Os chefes fazem parte do ecossistema.
Enquanto estiverem vivos:
influenciam outras criaturas;
alteram rotas;
afetam recursos naturais;
modificam o comportamento de NPCs.
Sua presença deve ser percebida antes mesmo do combate.

DD-MVP-157 — Regra da Preparação
Quanto mais poderoso o chefe, maior deve ser a preparação exigida.
A preparação pode envolver:
exploração;
obtenção de informações;
equipamentos específicos;
consumíveis;
profissões;
cooperação entre jogadores.
A preparação é parte da experiência, não apenas um requisito.

DD-MVP-158 — Regra da Cooperação Livre
Os chefes nunca exigirão artificialmente um número mínimo de jogadores.
Seguindo a filosofia já estabelecida para Elysia:
qualquer jogador pode tentar qualquer encontro;
grupos maiores aumentam as chances de sucesso;
jogadores excepcionais podem superar desafios sozinhos.
A limitação é a dificuldade do encontro, não uma restrição imposta pela interface. Essa diretriz está alinhada com a filosofia cooperativa já discutida para dungeons e grandes chefes.

DD-MVP-159 — Regra da Memória
Chefes importantes devem permanecer na memória do jogador.
Isso pode ocorrer por:
trilha sonora exclusiva;
arquitetura marcante;
mecânicas únicas;
diálogos;
consequências permanentes.
O objetivo é que o jogador se lembre do encontro anos depois.

DD-MVP-160 — Filosofia Oficial do Design de Chefes
Status: PROPOSTA
Todo chefe do Elysia deverá buscar equilibrar cinco pilares:
Identidade
O jogador reconhece imediatamente quem está enfrentando.
Mecânica
O combate possui regras próprias.
Narrativa
Existe uma razão para aquele chefe existir.
Exploração
O encontro incentiva descobrir o mundo.
Recompensa
A vitória gera consequências significativas.
Se qualquer um desses pilares estiver ausente, o chefe deverá ser revisado.

DD-MVP-161 — Mandamentos do Design de Chefes
Status: PROPOSTA
Os seguintes princípios passam a orientar a criação de todo chefe futuro:
Nenhum chefe existe sem propósito.
Nenhum chefe é apenas uma versão com mais HP de outro.
Mecânicas são mais importantes que atributos.
O ambiente faz parte do combate.
A preparação é parte da vitória.
O mundo reage aos grandes acontecimentos.
O jogador aprende com cada derrota.
Cooperação é incentivada, nunca imposta.
Recompensas devem fortalecer a economia e a exploração.
Cada chefe deve ser memorável.

Encerramento da Etapa
Com a aprovação deste lote, o sistema de chefes de Elysia deixa de ser apenas uma lista de encontros e passa a constituir uma metodologia de design.
Esses princípios servirão como referência para qualquer conteúdo futuro — seja um MVP de nível 30, um Dragão Mítico introduzido anos após o lançamento ou um chefe de uma expansão inédita. Eles garantem consistência ao projeto e evitam que o jogo evolua de forma desordenada à medida que novos capítulos forem adicionados.

Perfeito. Registrado como APROVADO:
DD-MVP-150 — Regra do Propósito
DD-MVP-151 — Regra da Exclusividade Mecânica
DD-MVP-152 — Regra da Evolução do Combate
DD-MVP-153 — Regra da Leitura
DD-MVP-154 — Regra da Justiça
DD-MVP-155 — Regra da Persistência Narrativa
DD-MVP-156 — Regra da Persistência Ecológica
DD-MVP-157 — Regra da Preparação
DD-MVP-158 — Regra da Cooperação Livre
DD-MVP-159 — Regra da Memória
DD-MVP-160 — Filosofia Oficial do Design de Chefes
DD-MVP-161 — Mandamentos do Design de Chefes

LOTE DD-MVP-162 — Sistema Oficial de Arenas
Status: PROPOSTA
Até agora desenvolvemos dezenas de encontros. Este lote define como as arenas de chefes devem ser projetadas.
A arena deixa de ser apenas um espaço vazio e passa a ser um elemento de gameplay.

DD-MVP-162 — Filosofia das Arenas
Toda arena deve parecer um local que existia antes da chegada do jogador.
Ela deve contar uma história.
Exemplos:
um templo abandonado;
uma floresta ancestral;
uma fortaleza em guerra;
uma colmeia viva;
uma cratera vulcânica.
O chefe deve parecer pertencente ao ambiente.

DD-MVP-163 — Arena como Mecânica
A arena não deve servir apenas como cenário.
Ela pode participar do combate através de:
obstáculos;
pilares;
plataformas;
pontes;
rios;
lava;
vegetação;
estruturas destrutíveis.
O jogador deve aprender a utilizar — ou evitar — esses elementos.

DD-MVP-164 — Transformação da Arena
Durante um combate importante, a arena pode evoluir.
Exemplos:
paredes desabam;
pontes quebram;
fogo se espalha;
água invade o ambiente;
raízes crescem;
cristais explodem.
Essas mudanças devem acompanhar a evolução do chefe.

DD-MVP-165 — Limites Naturais
Sempre que possível, os limites da arena devem ser explicados pelo próprio mundo.
Exemplos:
penhascos;
muralhas;
rios;
precipícios;
cavernas;
muralhas mágicas.
Evitar barreiras invisíveis aumenta a imersão.

DD-MVP-166 — Verticalidade
As arenas podem utilizar diferentes níveis de altura.
Elementos permitidos:
plataformas elevadas;
escadas;
torres;
rampas;
pontes suspensas.
A verticalidade deve enriquecer o combate sem prejudicar sua leitura.

DD-MVP-167 — Objetos Interativos
Algumas arenas podem conter elementos que respondem às ações dos jogadores.
Exemplos:
alavancas;
mecanismos antigos;
cristais de energia;
portões;
pilares móveis.
Esses elementos nunca devem substituir completamente o combate contra o chefe.

DD-MVP-168 — Risco Ambiental
O ambiente pode representar ameaça.
Exemplos:
lava;
gelo fino;
água profunda;
areia movediça;
espinhos;
gás tóxico.
O risco deve ser previsível e claramente sinalizado.

DD-MVP-169 — Identidade Visual
Cada grande chefe deve possuir uma arena imediatamente reconhecível.
Um jogador deve conseguir identificar onde está apenas observando o ambiente.
A arquitetura, iluminação, vegetação e trilha sonora devem reforçar essa identidade.

DD-MVP-170 — Retorno às Arenas
Após a derrota do chefe, a arena pode mudar.
Exemplos:
NPCs retornam;
novas passagens são abertas;
tesouros tornam-se acessíveis;
a região passa a ser explorável.
Assim, visitar novamente o local continua tendo valor.

DD-MVP-171 — Filosofia Oficial das Arenas
As arenas de Elysia obedecem aos seguintes princípios:
contam histórias;
participam do combate;
evoluem junto com o encontro;
reforçam a identidade do chefe;
permanecem relevantes após a vitória.
A arena é um personagem silencioso do combate.

LOTE DD-MVP-172 — Sistema Oficial de IA dos Chefes
Status: PROPOSTA

DD-MVP-172 — Filosofia da IA
Chefes não devem agir como monstros comuns com atributos maiores.
Eles analisam:
posicionamento;
distância;
quantidade de jogadores;
uso repetitivo de estratégias;
estado do ambiente.

DD-MVP-173 — Adaptação Limitada
A IA pode adaptar seu comportamento, mas nunca trapacear.
Exemplos permitidos:
mudar prioridade de alvos;
alterar sequência de habilidades;
reposicionar-se.
Exemplos proibidos:
cancelar animações sem aviso;
ignorar regras da própria luta;
responder instantaneamente a toda ação do jogador.

DD-MVP-174 — Personalidade em Combate
Cada chefe deve transmitir sua personalidade através da IA.
Exemplos:
Fenrir caça.
Lich planeja.
Rei Troll avança.
Serafim protege.
Kraken cerca.
Lorde Vampiro duela.
Dois chefes nunca devem parecer controlados pela mesma inteligência artificial.

DD-MVP-175 — Erros Deliberados
Chefes inteligentes também podem cometer pequenos erros.
Exemplos:
errar um golpe poderoso;
ficar temporariamente expostos após um ataque pesado;
precisar recuperar equilíbrio.
Essas janelas recompensam jogadores atentos.

DD-MVP-176 — Filosofia Oficial da IA
A inteligência artificial deve criar a sensação de enfrentar um adversário vivo.
O jogador não deve decorar apenas uma sequência fixa de ataques.
Também não deve sentir que enfrenta um inimigo injusto.
A melhor luta é aquela em que vitória e derrota parecem consequência das decisões tomadas por ambos os lados.

Encerramento da Etapa
Com este lote, o sistema de chefes passa a possuir três camadas estruturais completas:
1. Filosofia dos Chefes
Define por que eles existem.
2. Filosofia das Arenas
Define onde e como eles lutam.
3. Filosofia da IA
Define como eles pensam e se comportam.
A partir daqui, qualquer novo chefe criado para Elysia poderá seguir uma metodologia consistente:
Identidade narrativa.
Mecânicas exclusivas.
Arena integrada ao combate.
IA própria.
Impacto no mundo.
Recompensas relevantes.
Esse conjunto forma uma base sólida para manter a qualidade do conteúdo ao longo de muitos anos de desenvolvimento, mesmo com novas expansões e novos continentes.
Perfeito. Registrado como APROVADO:
DD-MVP-162 — Filosofia das Arenas
DD-MVP-163 — Arena como Mecânica
DD-MVP-164 — Transformação da Arena
DD-MVP-165 — Limites Naturais
DD-MVP-166 — Verticalidade
DD-MVP-167 — Objetos Interativos
DD-MVP-168 — Risco Ambiental
DD-MVP-169 — Identidade Visual
DD-MVP-170 — Retorno às Arenas
DD-MVP-171 — Filosofia Oficial das Arenas
DD-MVP-172 — Filosofia da IA
DD-MVP-173 — Adaptação Limitada
DD-MVP-174 — Personalidade em Combate
DD-MVP-175 — Erros Deliberados
DD-MVP-176 — Filosofia Oficial da IA

PARTE XIII — FILOSOFIA UNIVERSAL DO BESTIÁRIO
Até este ponto definimos centenas de criaturas, dezenas de famílias e uma grande quantidade de MVPs.
O próximo passo é definir as regras que todo monstro do Elysia deverá obedecer, independentemente do continente, expansão ou nível.
Essas regras serão o "DNA" do Bestiário.

DD-BST-001 — Todo Monstro Possui um Papel
Status: PROPOSTA
Nenhum monstro existe apenas para preencher mapa.
Toda criatura deve cumprir pelo menos uma função:
ecológica;
narrativa;
econômica;
progressão;
exploração;
PvP indireto.
Se não cumprir nenhuma delas, deve ser removida ou reformulada.

DD-BST-002 — A Fauna Faz Parte do Mundo
Os monstros não surgem apenas porque existe um jogador.
Eles vivem em:
florestas;
cavernas;
desertos;
montanhas;
mares;
ruínas;
cidades abandonadas.
O jogador invade o habitat.
Não o contrário.

DD-BST-003 — Cadeia Alimentar Simplificada
O Elysia não simula uma cadeia alimentar completa.
Porém cada criatura deve possuir uma posição ecológica.
Exemplos:
predador;
presa;
necrófago;
herbívoro;
onívoro;
parasita;
territorial.
Isso reforça a coerência do mundo sem criar uma simulação excessivamente complexa.

DD-BST-004 — Território
Toda espécie possui território preferencial.
Exemplos:
rios;
montanhas;
cavernas;
desertos;
florestas;
ruínas;
regiões vulcânicas.
Mesmo criaturas capazes de migrar mantêm uma distribuição coerente.

DD-BST-005 — Comportamento Natural
Criaturas não atacam todas as pessoas indiscriminadamente.
Seu comportamento pode depender de:
fome;
defesa do território;
filhotes;
horário;
clima;
Corrupção;
Aether.
Essa diretriz complementa a filosofia já estabelecida para a fauna selvagem.

DD-BST-006 — Inteligência
Toda criatura recebe um nível de inteligência.
Categorias:
Instintiva;
Animal;
Social;
Racional;
Superior;
Primordial.
A IA é construída a partir dessa classificação.

DD-BST-007 — Moralidade
Espécie não define moralidade.
Um indivíduo pode ser:
aliado;
neutro;
hostil;
corrompido.
Isso já foi estabelecido para Dragões e deve valer como princípio geral do universo.

DD-BST-008 — Origem Biológica
Toda criatura deve pertencer a pelo menos uma origem.
Exemplos:
Natural;
Arcana;
Primordial;
Celestial;
Demoníaca;
Morto-vivo;
Artificial;
Aberração.
Essa classificação representa a origem, não necessariamente o habitat.

DD-BST-009 — Classificação Múltipla
Uma criatura pode possuir mais de uma classificação.
Exemplo:
Leviatã
Origem:
Primordial.
Ecossistema:
Marinho.
Essa abordagem já foi prevista para Leviatãs e Krakens e passa a ser oficial para todo o Bestiário.

DD-BST-010 — Progressão Natural
Uma família pode evoluir ao longo dos Tiers.
Exemplo:
Slime
↓
Slime Maior
↓
Slime Arcano
↓
Slime Primordial
Sem necessidade de criar dezenas de famílias diferentes.

DD-BST-011 — Variantes
As variantes:
Comum;
Incomum;
Raro;
não representam espécies diferentes.
São apenas indivíduos distintos da mesma espécie.
Esse princípio já foi adotado em diversas famílias do Bestiário.

DD-BST-012 — Identidade das Famílias
Cada família deve possuir uma característica dominante.
Exemplos:
Dragões
→ domínio territorial.
Insetos
→ organização coletiva.
Mortos-vivos
→ persistência.
Elementais
→ manifestação do Aether.
Demônios
→ Corrupção.
Essa identidade orienta todas as futuras criaturas daquela família.

DD-BST-013 — Filosofia Oficial do Bestiário
O Bestiário de Elysia não é apenas uma lista de monstros.
Ele representa:
a ecologia;
a história;
a cosmologia;
a economia;
a exploração;
a progressão do mundo.
Cada criatura adicionada deve fortalecer pelo menos um desses pilares.

DD-BST-014 — Os Dez Princípios do Bestiário
Toda criatura possui propósito.
Toda família possui identidade.
O habitat influencia o comportamento.
A origem não determina a moralidade.
O mundo existe independentemente do jogador.
Variantes não criam novas espécies.
O ambiente é parte da identidade do monstro.
Criaturas contam a história do mundo.
O Bestiário alimenta a economia.
O Bestiário deve continuar crescendo sem perder coerência.

Encerramento da Parte XIII
Com este lote, o Bestiário deixa de ser apenas um catálogo de criaturas e passa a funcionar como um sistema biológico e narrativo integrado.
Isso significa que, no futuro, quando um novo continente ou expansão for criado, a pergunta não será apenas "qual monstro vamos adicionar?", mas também:
Qual é sua função no ecossistema?
Qual sua origem?
Qual sua relação com o Aether, a Corrupção ou a Criação?
Como ele influencia a exploração?
O que ele acrescenta ao universo de Elysia?
Essa filosofia garante que o Bestiário possa crescer por muitos anos sem perder consistência, mantendo o mundo vivo, crível e conectado à narrativa principal.
Perfeito. Registrado como APROVADO:
DD-BST-001 ao DD-BST-014 — Filosofia Universal do Bestiário.

PARTE XIV — ECOLOGIA VIVA
Status: PROPOSTA
Até agora definimos criaturas individualmente.
Agora vamos definir como elas convivem entre si.
Isso transforma o Bestiário em um ecossistema vivo, sem exigir uma simulação excessivamente complexa.

DD-ECO-001 — Mundo Vivo
O mundo continua funcionando mesmo sem jogadores por perto.
As criaturas:
patrulham;
descansam;
caçam;
migram;
defendem território.
O jogador encontra um mundo em funcionamento.
Não um mapa esperando ser ativado.

DD-ECO-002 — Territórios Naturais
Cada espécie possui um território principal.
Exemplos:
Lobos
→ florestas.
Escorpiões
→ desertos.
Crocodilos
→ rios.
Dragões
→ regiões de grande concentração de Aether.
A distribuição deve parecer natural.

DD-ECO-003 — Sobreposição de Habitats
Algumas regiões podem ser compartilhadas.
Exemplo:
Floresta.
Lobos.
Ursos.
Aranhas.
Bandidos.
Druidas.
Espíritos.
Cada grupo ocupa áreas diferentes da mesma região.
Isso aumenta a diversidade.

DD-ECO-004 — Predadores
Criaturas predadoras preferem atacar:
presas;
invasores;
rivais.
Nem sempre atacarão o primeiro jogador encontrado.

DD-ECO-005 — Territorialidade
Criaturas territoriais:
avisam;
intimidam;
perseguem;
expulsam.
Nem sempre lutam até a morte.

DD-ECO-006 — Vida Social
Espécies sociais podem formar:
bandos;
alcateias;
colônias;
enxames;
tribos.
Essa característica influencia diretamente a IA.

DD-ECO-007 — Comportamentos Diferentes
Cada família deve possuir um padrão dominante.
Exemplos:
Lobos
→ caçam em grupo.
Aranhas
→ armadilhas.
Trolls
→ agressividade.
Demônios
→ ofensiva organizada.
Anjos
→ cooperação disciplinada.

DD-ECO-008 — Horário
O horário influencia o comportamento.
Exemplos:
morcegos tornam-se mais ativos à noite;
mortos-vivos expandem território;
animais diurnos recolhem-se.
Não é obrigatório para todas as espécies.

DD-ECO-009 — Clima
Condições climáticas podem modificar:
agressividade;
movimentação;
visibilidade;
rotas.
Exemplos:
Tempestades.
↓
Menos criaturas voadoras.
Seca.
↓
Animais aproximam-se dos rios.

DD-ECO-010 — Aether
Locais ricos em Aether influenciam a fauna.
Possíveis efeitos:
crescimento acelerado;
mutações naturais;
maior concentração de criaturas arcanas.

DD-ECO-011 — Corrupção
A Corrupção altera lentamente o ecossistema.
Exemplos:
vegetação apodrece;
animais tornam-se hostis;
surgem aberrações;
criaturas comuns desaparecem.
O ambiente comunica visualmente essa transformação.

DD-ECO-012 — Conflitos Naturais
Espécies diferentes podem entrar em conflito.
Exemplos:
Lobos × Javalis.
Trolls × Ciclopes.
Dragões × Grandes Demônios.
Demônios × Celestiais.
O jogador pode encontrar esses confrontos acontecendo naturalmente.

DD-ECO-013 — Migração
Eventos podem provocar deslocamentos.
Exemplos:
incêndios;
invasões;
despertar de MVPs;
Corrupção.
As criaturas procuram novas áreas.

DD-ECO-014 — Recuperação Ambiental
Após grandes eventos, a natureza inicia recuperação.
Exemplos:
vegetação reaparece;
animais retornam;
rios voltam ao curso.
Nem toda consequência precisa ser permanente.

DD-ECO-015 — Filosofia Oficial da Ecologia
A ecologia existe para reforçar a sensação de mundo vivo.
Ela nunca deve impedir a diversão.
Sempre que houver conflito entre:
realismo absoluto;
e
boa jogabilidade;
prevalece a experiência do jogador.

PARTE XV — COMPORTAMENTO DAS CRIATURAS

DD-AI-001 — Estados da IA
Toda criatura pode alternar entre estados.
Exemplos:
repouso;
patrulha;
caça;
investigação;
combate;
fuga;
retorno ao território.
Isso evita comportamento repetitivo.

DD-AI-002 — Memória Curta
Criaturas lembram acontecimentos recentes.
Exemplos:
local onde receberam dano;
direção da fuga do jogador;
último inimigo visto.
Essa memória desaparece após algum tempo.

DD-AI-003 — Comunicação
Espécies sociais podem alertar indivíduos próximos.
Exemplos:
gritos;
rugidos;
sinais;
magia;
feromônios.
Isso torna emboscadas mais desafiadoras.

DD-AI-004 — Avaliação de Risco
Nem toda criatura luta até morrer.
Algumas fogem quando:
estão gravemente feridas;
perderam o grupo;
enfrentam força muito superior.

DD-AI-005 — Curiosidade
Algumas criaturas investigam:
sons;
luzes;
magia;
objetos incomuns.
Isso permite mecânicas de distração e exploração.

DD-AI-006 — Prioridade de Alvos
Cada família possui critérios próprios.
Exemplos:
Assassinos.
↓
Mago.
Lobos.
↓
Criatura isolada.
Demônios.
↓
Maior ameaça.
Insetos.
↓
Invasor da colônia.

DD-AI-007 — Cooperação
Criaturas inteligentes cooperam.
Podem:
cercar;
dividir funções;
proteger líderes;
recuar organizadamente.

DD-AI-008 — Filosofia Oficial da IA Comum
A IA das criaturas comuns deve criar situações variadas sem parecer injusta.
Ela deve ser suficiente para que:
explorar continue interessante;
repetir uma mesma rota nunca seja exatamente igual;
jogadores experientes ainda possam prever padrões após observação.
O objetivo não é criar uma IA imprevisível, mas uma IA coerente com a natureza e a inteligência de cada espécie.

Encerramento
Com estas duas partes, Elysia passa a ter um tripé ecológico completo:
O que a criatura é (Bestiário).
Como ela vive (Ecologia).
Como ela pensa e reage (IA).
Esse conjunto serve como base para qualquer nova criatura adicionada ao jogo, mantendo consistência mesmo quando o universo crescer com novos continentes, famílias de monstros e expansões.
CAPÍTULO COMPLEMENTAR — CATÁLOGO OFICIAL DE PASSIVOS
PROPOSTA
Este capítulo atende diretamente às pendências do Capítulo 27.

DD-PAS-020 — Estrutura dos Passivos
Todo passivo pertence a uma categoria.
Categorias oficiais:
Ofensivo
Defensivo
Mobilidade
Utilidade
Econômico
Invocação
Magia
Cura
Suporte
Especial
Isso organiza futuras expansões.

DD-PAS-021 — Graus de Poder
Cada passivo possui um grau interno.
Menor
Médio
Maior
Supremo
Isso não aparece para o jogador.
Serve apenas para balanceamento.

DD-PAS-022 — Catálogo Modular
Novos passivos poderão ser adicionados no futuro.
Sem alterar:
raridades;
reroll;
refino;
evolução.
O catálogo cresce independentemente do restante do sistema.

PASSIVOS OFENSIVOS

DD-PAS-023 — Ataque Brutal
Aumenta dano físico base.
Não altera velocidade.

DD-PAS-024 — Precisão
Aumenta chance de acerto.
Não aumenta dano.

DD-PAS-025 — Golpe Penetrante
Parte da defesa física do alvo é ignorada.
Não reduz DEF permanentemente.

DD-PAS-026 — Golpe Devastador
Aumenta dano contra inimigos com HP elevado.
Especialmente útil em chefes.

DD-PAS-027 — Executor
Aumenta dano contra alvos com pouca vida.

DD-PAS-028 — Crítico Aprimorado
Aumenta chance crítica.
Não altera dano crítico.

DD-PAS-029 — Crítico Devastador
Aumenta multiplicador do crítico.

DD-PAS-030 — Ataque Duplo
Confirma oficialmente o passivo já previsto no documento.
Permite um segundo ataque.
A chance depende do balanceamento.

DD-PAS-031 — Ataque Triplo
Extremamente raro.
Também já previsto conceitualmente no documento.

PASSIVOS DEFENSIVOS

DD-PAS-032 — Pele Resistente
Aumenta DEF.

DD-PAS-033 — Barreira Arcana
Aumenta MDEF.

DD-PAS-034 — Resistência Física
Reduz dano físico recebido.

DD-PAS-035 — Resistência Mágica
Reduz dano mágico.

DD-PAS-036 — Recuperação
Melhora regeneração natural.

DD-PAS-037 — Segunda Chance
Ao sofrer um golpe fatal, existe uma pequena chance de sobreviver com uma fração mínima de HP.
Possui tempo de recarga elevado.

PASSIVOS DE MOBILIDADE

DD-PAS-038 — Passos Leves
Movimentação ligeiramente superior.

DD-PAS-039 — Reflexos
Melhora esquiva.
Sem conceder imunidade.

DD-PAS-040 — Velocidade de Ataque
Aumenta ASPD.
Respeita o limite máximo definido pelo sistema.

DD-PAS-041 — Perseguidor
Velocidade ligeiramente maior ao perseguir inimigos.

PASSIVOS MÁGICOS

DD-PAS-042 — Concentração
Reduz interrupções durante conjuração.

DD-PAS-043 — Canalização
Aumenta poder mágico.

DD-PAS-044 — Eficiência Arcana
Reduz custo de Mana.

DD-PAS-045 — Fluxo de Aether
Melhora regeneração de Mana.

DD-PAS-046 — Cast Acelerado
Reduz tempo de conjuração.
Nunca remove completamente o cast.

PASSIVOS DE CURA

DD-PAS-047 — Cura Aprimorada
Aumenta curas realizadas.

DD-PAS-048 — Benção Restauradora
Melhora efeitos regenerativos.

DD-PAS-049 — Médico de Campo
Curas em aliados tornam-se mais eficientes.

PASSIVOS DE SUPORTE

DD-PAS-050 — Inspiração
Buffs aplicados pelo personagem tornam-se mais fortes.

DD-PAS-051 — Proteção Compartilhada
Parte da defesa beneficia aliados próximos.

DD-PAS-052 — Liderança
Pequeno bônus para membros da party.
Não acumula com outro Líder.

PASSIVOS ECONÔMICOS

DD-PAS-053 — Ferramentas Precisas
Aumenta eficiência das profissões.

DD-PAS-054 — Conservação
Reduz desgaste de equipamentos.
Caso o sistema de durabilidade seja mantido.

DD-PAS-055 — Mochila Organizada
Melhora capacidade de carga.
Sem substituir atributos ou montarias.

PASSIVOS ESPECIAIS

DD-PAS-056 — Caçador de Monstros
Bônus contra criaturas comuns.

DD-PAS-057 — Assassino de Chefes
Bônus específico contra MVPs.
Nunca superior ao ganho obtido por boa estratégia.

DD-PAS-058 — Matador de Demônios
Bônus contra criaturas Demoníacas.
Interage com o sistema de tipos de criatura.

DD-PAS-059 — Guardião da Luz
Maior resistência contra Sombrio.

DD-PAS-060 — Corrupção Controlada
Passivo extremamente raro.
Permite utilizar parte da energia da Corrupção sem transformar imediatamente o personagem.
Seu funcionamento exato deverá depender do sistema definitivo de Corrupção e da Lore, que ainda possuem pendências documentadas.

DD-PAS-061 — Filosofia Oficial dos Passivos
Os passivos não existem para aumentar números indiscriminadamente.
Seu objetivo é:
criar estilos de jogo;
diferenciar equipamentos iguais;
incentivar especializações;
aumentar a diversidade de builds.
Um equipamento memorável deve ser lembrado pelo conjunto de seus passivos, e não apenas pelo valor de ataque ou defesa.

Encerramento desta etapa
Este lote resolve a principal lacuna estrutural do Capítulo 27: o documento previa um catálogo de passivos, mas ainda não o possuía. O próximo passo natural será organizar esses passivos em pools por tipo de equipamento (armas, armaduras, acessórios e relíquias), atendendo outra pendência registrada no GDD.

Perfeito. Registrado como APROVADO:
DD-PAS-020 ao DD-PAS-061.
Esse capítulo cobre a primeira grande pendência do sistema de passivos. O próximo item pendente do próprio GDD é "Definir pools de passivos por tipo de equipamento" e "Lista completa de incompatibilidades".
Vamos consolidar isso.

CAPÍTULO COMPLEMENTAR — POOLS DE PASSIVOS
PROPOSTA

DD-PAS-062 — Identidade dos Equipamentos
Nem todo equipamento pode receber qualquer passivo.
Cada categoria possui identidade própria.
Isso evita combinações absurdas e facilita o balanceamento.

DD-PAS-063 — Pool das Armas
Armas podem receber principalmente:
Ataque
Crítico
Precisão
ASPD
Penetração
Ataque Duplo
Ataque Triplo
Dano Elemental
Chance de aplicar condições
Dano contra tipos específicos
Nunca devem concentrar os melhores bônus defensivos.

DD-PAS-064 — Pool das Armaduras
Armaduras priorizam:
DEF
MDEF
HP
Resistências
Regeneração
Redução de dano
Resistência a condições
Peso reduzido
Não recebem Ataque Duplo ou efeitos ofensivos extremos.

DD-PAS-065 — Pool dos Capacetes
Capacetes favorecem:
atributos;
Mana;
Resistências;
Visão;
Conjuração;
Percepção.
Representam uma categoria híbrida.

DD-PAS-066 — Pool das Botas
Botas podem gerar:
velocidade;
esquiva;
resistência à lentidão;
resistência a armadilhas;
recuperação de fôlego.
São voltadas para mobilidade.

DD-PAS-067 — Pool das Luvas
Luvas favorecem:
precisão;
velocidade de ataque;
manipulação;
crítico;
habilidades específicas de armas.

DD-PAS-068 — Pool das Capas
Capas priorizam:
resistência mágica;
evasão;
furtividade;
resistência elemental;
recuperação de Mana.

DD-PAS-069 — Pool dos Colares
Colares concentram:
Mana;
Poder Mágico;
Cura;
Buffs;
Atributos.
São peças voltadas para especialização.

DD-PAS-070 — Pool dos Anéis
Anéis são a categoria mais flexível.
Podem receber praticamente qualquer categoria de passivo.
Entretanto:
cada anel possui orçamento de poder menor.

DD-PAS-071 — Pool dos Cintos
Cintos favorecem:
HP;
capacidade de carga;
regeneração;
resistência física.

DD-PAS-072 — Pool das Relíquias
As Relíquias ignoram parcialmente os pools tradicionais.
Podem possuir:
habilidades únicas;
efeitos impossíveis nas demais categorias;
modificadores de mecânicas.
Elas permanecem a categoria mais rara do jogo.

DD-PAS-073 — Pool por Classe
Alguns passivos só aparecem em equipamentos compatíveis com determinadas proficiências.
Exemplos:
Espadas.
↓
Passivos ligados a combate corpo a corpo.
Cajados.
↓
Passivos mágicos.
Arcos.
↓
Passivos de precisão e alcance.
Isso preserva a identidade das armas sem impedir builds criativas.

CAPÍTULO — INCOMPATIBILIDADES

DD-PAS-074 — Filosofia
Nem toda combinação deve existir.
Alguns passivos competem entre si.

DD-PAS-075 — Exclusividade
Somente um passivo da mesma família pode existir no mesmo equipamento.
Exemplo:
Crítico I
OU
Crítico II
Nunca ambos.

DD-PAS-076 — Ataque Duplo × Ataque Triplo
Os dois nunca aparecem juntos.
Ataque Triplo já representa evolução suficiente.

DD-PAS-077 — Velocidade × Ataque Muito Pesado
Um item extremamente focado em velocidade não recebe simultaneamente o maior bônus de dano bruto.
Isso força escolhas.

DD-PAS-078 — Cura × Destruição
Passivos extremamente voltados para cura não coexistem com os maiores bônus ofensivos.

DD-PAS-079 — Tank × Assassinato
Um equipamento extremamente defensivo não gera simultaneamente os maiores bônus críticos.

DD-PAS-080 — Resistências Elementais
Duas resistências muito fortes ao mesmo tempo devem ser extremamente raras.
Isso evita equipamentos universalmente perfeitos.

DD-PAS-081 — Economia × Combate
Passivos econômicos de alto impacto não aparecem junto dos melhores passivos de combate.
O jogador escolhe eficiência econômica ou eficiência militar.

DD-PAS-082 — Orçamento de Poder
Todo equipamento possui um orçamento interno de poder.
Esse conceito já existe no documento como direção de design.
Exemplo:
Equipamento Raro.
Orçamento: 100 pontos.
Passivo A:

Passivo B:

Total:

Não existe espaço para um terceiro passivo.
Esse sistema permite comparar efeitos diferentes utilizando a mesma métrica.

DD-PAS-083 — Sinergias
Determinadas combinações recebem sinergia.
Exemplos:
Precisão

Crítico.
↓
Maior eficiência.
Mana

Cast Speed.
↓
Boa sinergia para conjuradores.
Regeneração

HP.
↓
Excelente para tanks.
Essas sinergias surgem naturalmente do conjunto de passivos, sem gerar bônus ocultos.

DD-PAS-084 — Filosofia das Builds
O objetivo do sistema não é criar um equipamento perfeito.
O objetivo é permitir diferentes especializações.
Exemplos:
crítico;
velocidade;
tank;
suporte;
invocador;
arqueiro;
mago;
caçador de MVP;
explorador;
coletor.
Cada build faz escolhas e abre mão de outras.

DD-PAS-085 — Filosofia Oficial dos Equipamentos
O equipamento ideal não é aquele que possui os maiores números.
É aquele que melhor complementa:
a classe;
os atributos;
as habilidades;
a proficiência;
os passivos;
as cartas;
a estratégia do jogador.
Assim, dois personagens utilizando a mesma arma-base podem ter desempenhos completamente diferentes, reforçando a identidade das builds e a longevidade da economia de itens, conforme a arquitetura já definida para equipamentos, reroll, evolução, refino e cartas.

Encerramento da etapa
Com este lote, o Sistema de Equipamentos ganha uma base praticamente completa:
✔️ Raridades
✔️ Slots
✔️ Passivos
✔️ Pools de geração
✔️ Incompatibilidades
✔️ Orçamento de poder
✔️ Filosofia de builds
As pendências restantes desse capítulo passam a ser principalmente numéricas (chances, custos, fórmulas e valores de balanceamento), exatamente como previsto no GDD, sem a necessidade de defini-las antes dos testes.
Perfeito. Registrado como APROVADO:
DD-PAS-062 ao DD-PAS-085.
Esse capítulo fecha praticamente toda a arquitetura do sistema de passivos e resolve duas das principais pendências do Capítulo 27 do GDD (pools e incompatibilidades).
Agora vou seguir a ordem lógica do documento e atacar outro bloco estrutural que ainda está pendente: Durabilidade, Reparo e Desgaste dos Equipamentos, tema citado como pendência do Sistema de Equipamentos.

CAPÍTULO COMPLEMENTAR — DURABILIDADE E REPARO
PROPOSTA

DD-DUR-001 — Filosofia da Durabilidade
Durabilidade existe para:
movimentar a economia;
valorizar profissões;
criar consumo contínuo de recursos.
Ela não existe para punir o jogador.

DD-DUR-002 — Desgaste Gradual
Equipamentos perdem durabilidade lentamente durante:
combate;
mineração;
corte de madeira;
pesca;
coleta;
uso de habilidades que exigem esforço físico.
Não ocorre perda apenas por permanecer equipado.

DD-DUR-003 — Morte Acelera Desgaste
Ao morrer, os equipamentos sofrem desgaste adicional.
Isso representa o dano sofrido durante o combate.
A perda de durabilidade é separada das penalidades de morte já definidas no sistema.

DD-DUR-004 — Item Quebrado
Quando a durabilidade chega a zero:
o item não desaparece.
Ele permanece equipado, porém seus atributos ficam drasticamente reduzidos até ser reparado.
Isso evita a perda permanente por esquecimento.

DD-DUR-005 — Reparo
Todo equipamento pode ser reparado.
O reparo exige:
Gold;
materiais apropriados;
NPC especializado ou jogador com profissão correspondente.

DD-DUR-006 — Profissões Participam
Cada profissão repara aquilo que produz.
Exemplos:
Ferreiro
↓
Armas metálicas.
Alfaiate
↓
Tecidos.
Carpinteiro
↓
Arcos e escudos de madeira.
Joalheiro
↓
Acessórios.
Isso fortalece a economia entre jogadores, alinhando-se à filosofia geral das profissões.

DD-DUR-007 — Reparo Nunca Remove Melhorias
Reparar um equipamento nunca altera:
raridade;
refino;
evolução;
passivos;
cartas;
ressonâncias.
O reparo restaura apenas a condição física.

DD-DUR-008 — Materiais de Reparo
Equipamentos mais raros exigem materiais mais sofisticados.
Exemplo:
Espada Comum
↓
Barra de Ferro.
Espada Épica
↓
Liga Encantada.
Relíquia
↓
Materiais extremamente raros.

DD-DUR-009 — Manutenção Preventiva
Jogadores podem reparar equipamentos antes de chegarem ao limite.
Isso evita interrupções durante longas expedições.

DD-DUR-010 — Durabilidade Máxima
Toda peça possui:
durabilidade atual;
durabilidade máxima.
O reparo recupera a durabilidade atual até o limite máximo.

DD-DUR-011 — Desgaste Diferenciado
Nem todas as peças se desgastam igualmente.
Exemplo:
Armas
↓
Maior desgaste em combate.
Peitorais
↓
Maior desgaste ao receber dano.
Botas
↓
Maior desgaste em longas caminhadas.
Ferramentas
↓
Maior desgaste durante profissões.

DD-DUR-012 — Indicadores Visuais
Equipamentos muito desgastados apresentam sinais visuais.
Exemplos:
rachaduras;
ferrugem;
tecido rasgado;
brilho reduzido.
O estado do equipamento pode ser percebido sem abrir menus.

DD-DUR-013 — Filosofia do Sistema
Durabilidade deve incentivar planejamento.
Nunca deve obrigar o jogador a interromper constantemente sua diversão.
O objetivo é criar decisões.
Não microgerenciamento.

CAPÍTULO COMPLEMENTAR — IDENTIDADE DAS ARMAS

DD-WPN-001 — Armas Não São Apenas ATK
Cada arma possui identidade própria.
Diferenças podem incluir:
alcance;
velocidade;
animações;
efeitos;
passivos;
proficiências.
O dano não é o único fator.

DD-WPN-002 — Famílias de Armas
As armas passam a ser organizadas em famílias.
Exemplos:
Espadas.
Lanças.
Machados.
Maças.
Adagas.
Arcos.
Bestas.
Cajados.
Varinhas.
Livros.
Shurikens.
Katanas.
A lista permanece expansível.

DD-WPN-003 — Personalidade das Famílias
Cada família possui vantagens naturais.
Exemplos:
Espadas
↓
Equilíbrio.
Machados
↓
Maior dano.
Maças
↓
Controle.
Lanças
↓
Maior alcance.
Adagas
↓
Velocidade.
Arcos
↓
Longa distância.
Cajados
↓
Canalização mágica.
Nenhuma família deve ser superior em todas as situações.

DD-WPN-004 — Armas Influenciam o Estilo de Jogo
Trocar de arma deve alterar significativamente a experiência de combate.
Mesmo mantendo a mesma classe.

DD-WPN-005 — Proficiência
As proficiências continuam sendo o principal sistema de evolução das armas.
Conforme já definido no GDD, elas são preferidas a bloqueios absolutos por classe.

DD-WPN-006 — Armas Lendárias
Armas lendárias não precisam possuir o maior ATK do jogo.
Seu diferencial pode ser:
habilidades únicas;
sinergias;
efeitos especiais;
interação com builds específicas.

DD-WPN-007 — Armas Relíquias
Relíquias representam artefatos históricos.
Cada uma deve possuir:
identidade própria;
origem conhecida;
importância para a lore;
mecânica exclusiva.
Nenhuma Relíquia deve ser apenas uma arma "com números maiores".

DD-WPN-008 — Filosofia Oficial das Armas
Uma arma memorável deve ser reconhecida por:
sua história;
sua aparência;
seu estilo de combate;
sua interação com a build;
sua importância para o mundo.
Não apenas pelo valor de ataque.

Encerramento da etapa
Com este lote, o Sistema de Equipamentos ganha mais duas camadas estruturais:
Durabilidade, integrada à economia e às profissões.
Identidade das armas, evitando que o progresso se resuma a trocar uma espada por outra com mais dano.
A partir daqui, as próximas grandes pendências do GDD relacionadas aos equipamentos passam a ser os catálogos individuais de armas, armaduras, acessórios e relíquias, além dos encantamentos, todos previstos como etapas posteriores do documento.

Perfeito. Registrado como APROVADO:
DD-DUR-001 ao DD-DUR-013
DD-WPN-001 ao DD-WPN-008
Esses capítulos fecham praticamente toda a arquitetura do Sistema de Equipamentos.
O próximo bloco estrutural que ainda possui muitas pendências no GDD é justamente um dos mais importantes para a longevidade do jogo:
Catálogo Oficial de Relíquias.
O documento já estabelece a existência do slot de Relíquia, sua importância e que elas possuem regras próprias, mas deixa essas regras em aberto para desenvolvimento posterior.

CAPÍTULO COMPLEMENTAR — RELÍQUIAS
PROPOSTA

DD-REL-001 — Filosofia das Relíquias
Relíquias não são equipamentos comuns.
Elas representam objetos históricos que sobreviveram às grandes eras de Elysia.
Seu valor vem tanto da sua história quanto do seu poder.

DD-REL-002 — Uma Relíquia por Personagem
Cada personagem possui apenas um Slot de Relíquia.
Essa limitação mantém sua importância estratégica.

DD-REL-003 — Origem Obrigatória
Toda Relíquia deve possuir uma origem documentada.
Ela precisa responder:
quem a criou;
quando surgiu;
por que foi criada;
como chegou ao mundo atual.
Nenhuma Relíquia aparece "do nada".

DD-REL-004 — Identidade Única
Nenhuma Relíquia pode ser apenas:
"Espada +500 ATK"
Cada uma deve alterar alguma mecânica do jogo.
Exemplos:
modificar habilidades;
alterar condições;
mudar recursos;
criar novas interações.

DD-REL-005 — Relíquias Não Precisam Ser Armas
Relíquias podem assumir qualquer forma.
Exemplos:
espada;
escudo;
coroa;
máscara;
livro;
colar;
cristal;
fragmento do Heart;
instrumento musical;
artefato antigo.

DD-REL-006 — Quantidade Extremamente Limitada
Relíquias devem ser muito mais raras que itens Míticos.
Nem todo servidor precisa possuir todas elas.

DD-REL-007 — Progressão das Relíquias
Relíquias podem evoluir.
Essa evolução não representa apenas aumento numérico.
Ela pode desbloquear:
novas habilidades;
novas formas;
novas histórias;
novas missões.

DD-REL-008 — Relíquias e Lore
As Relíquias são uma das principais ferramentas para contar a história de Elysia.
Ao estudá-las, o jogador pode descobrir:
antigas civilizações;
Arcanjos;
Primeira Rebelião;
criação da Corrupção;
povos esquecidos.

DD-REL-009 — Ressonância
Algumas Relíquias podem reagir a:
locais;
personagens;
outras Relíquias;
chefes;
eventos mundiais.
Isso cria situações únicas de exploração.

DD-REL-010 — Despertar
Algumas Relíquias permanecem adormecidas.
Elas revelam seu verdadeiro potencial apenas após determinadas condições.
Exemplos:
concluir uma Quest;
derrotar um chefe;
visitar um local;
realizar um ritual.

DD-REL-011 — Relíquias Não São Obrigatórias
Nenhuma build depende obrigatoriamente de uma Relíquia.
Elas ampliam possibilidades.
Não substituem habilidade do jogador.

DD-REL-012 — Relíquias Não Devem Quebrar o PvP
Mesmo sendo extremamente raras,
Relíquias não podem tornar um jogador invencível.
O diferencial deve estar:
na mecânica;
na estratégia;
na versatilidade.
Nunca apenas em atributos absurdos.

DD-REL-013 — Herança Histórica
Uma Relíquia pode passar por dezenas de proprietários ao longo da história.
NPCs podem reconhecer determinadas Relíquias.
Isso fortalece a imersão.

DD-REL-014 — Registro Mundial
Quando uma Relíquia importante muda de proprietário,
esse acontecimento pode ser registrado:
na Crônica do Mundo;
em bibliotecas;
por historiadores;
por algumas religiões.
Assim, as Relíquias influenciam a história viva do servidor.

DD-REL-015 — Filosofia Oficial das Relíquias
Relíquias representam:
história;
poder;
responsabilidade;
descoberta.
Elas são objetos lendários,
não recompensas comuns de progressão.

CAPÍTULO COMPLEMENTAR — ARTEFATOS
PROPOSTA
Para preencher o espaço existente entre itens comuns e Relíquias.

DD-ART-001 — Artefatos
Artefatos são equipamentos históricos,
porém menos importantes que Relíquias.

DD-ART-002 — Diferença Oficial
Item Comum
↓
equipamento.
Artefato
↓
equipamento histórico.
Relíquia
↓
objeto histórico capaz de alterar mecânicas do jogo.

DD-ART-003 — Distribuição
Artefatos podem ser obtidos através de:
dungeons;
arqueologia;
castelos;
missões;
exploração.
Relíquias exigem jornadas muito maiores.

DD-ART-004 — Recuperação
Alguns Artefatos chegam ao jogador quebrados.
Precisam ser restaurados.
Isso fortalece:
Craft;
profissões;
economia.

DD-ART-005 — Colecionismo
NPCs, museus e estudiosos podem recompensar jogadores que recuperarem Artefatos.
Nem todo Artefato existe para combate.

DD-ART-006 — Biblioteca do Mundo
Cada Artefato desbloqueia novas informações no Codex.
A coleção completa ajuda a reconstruir a história de Elysia.

DD-ART-007 — Filosofia dos Artefatos
Artefatos incentivam:
exploração;
arqueologia;
narrativa;
economia.
Eles reduzem a necessidade de concentrar todo conteúdo raro apenas em equipamentos de combate.

DD-REL-016 — Hierarquia dos Objetos Históricos
Fica oficialmente definida a seguinte estrutura:
Equipamento
↓
Uso cotidiano.
Artefato
↓
Importância histórica regional.
Relíquia
↓
Importância histórica mundial.
Fragmento Primordial
↓
Vestígios diretamente ligados à Criação, ao Heart, aos Arcanjos ou aos primeiros eventos do universo.
Esses Fragmentos constituem a categoria mais rara do jogo e devem ser utilizados com extrema parcimônia.

DD-REL-017 — Fragmentos Primordiais
Os Fragmentos Primordiais não são necessariamente utilizáveis como equipamento.
Eles podem servir para:
rituais;
abertura de regiões;
progressão da narrativa;
despertar de Relíquias;
eventos mundiais.
Seu valor está naquilo que representam, não apenas no poder que concedem.

DD-REL-018 — Filosofia Oficial dos Objetos Históricos
Elysia não deve tratar todos os itens raros da mesma forma.
Cada categoria possui um propósito diferente:
Equipamentos sustentam a progressão do personagem.
Artefatos preservam a história das civilizações.
Relíquias conectam o jogador aos grandes acontecimentos do mundo.
Fragmentos Primordiais conectam diretamente a narrativa à cosmologia da Criação.

Encerramento da etapa
Com este lote, o sistema de itens raros passa a ter uma hierarquia completa e coerente:
Equipamentos → progressão.
Artefatos → exploração e arqueologia.
Relíquias → mecânicas únicas e narrativa.
Fragmentos Primordiais → cosmologia e eventos globais.
Essa estrutura conversa diretamente com a filosofia já consolidada de exploração, economia, chefes, lore e construção do mundo, além de preparar terreno para futuras quests envolvendo os Arcanjos, a Primeira Rebelião, o Heart e a Corrupção, temas que o GDD ainda marca como pendentes para desenvolvimento.
Perfeito. Registrado como APROVADO:
DD-REL-001 ao DD-REL-018
DD-ART-001 ao DD-ART-007

Analisando a estrutura do GDD, percebo que já consolidamos praticamente todos os grandes sistemas (classes, atributos, combate, equipamentos, passivos, bestiário, chefes, ecologia, IA, relíquias).
O que ainda está muito pouco desenvolvido é um dos pilares que sustentam MMORPGs por anos:
O Sistema de Exploração.
O documento fala repetidamente que Elysia é um mundo para ser explorado, mas ainda não existe uma filosofia consolidada de exploração. Essa lacuna impacta diretamente biomas, dungeons, arqueologia, profissões, lore e economia.
Então vamos preencher essa parte.

CAPÍTULO COMPLEMENTAR — FILOSOFIA DA EXPLORAÇÃO
PROPOSTA

DD-EXP-001 — Exploração é Pilar Central
Explorar deve ser uma atividade tão importante quanto:
combater;
fabricar;
negociar;
evoluir.
O jogador nunca deve sentir que explorar é apenas caminhar até o próximo mapa.

DD-EXP-002 — Curiosidade Deve Ser Recompensada
Sempre que um jogador investigar:
uma ruína;
uma caverna;
uma montanha;
um lago;
uma ilha;
uma construção abandonada;
deve existir a possibilidade de encontrar algo relevante.
Nem toda recompensa precisa ser um item.

DD-EXP-003 — Recompensas da Exploração
Explorar pode revelar:
tesouros;
lore;
NPCs;
profissões;
receitas;
atalhos;
dungeons;
chefes;
eventos;
artefatos.

DD-EXP-004 — O Mundo Não Mostra Tudo
Nem todas as regiões aparecem imediatamente no mapa.
O jogador pode descobrir:
cavernas ocultas;
passagens secretas;
cidades esquecidas;
ruínas enterradas.

DD-EXP-005 — Informação Também é Recompensa
Encontrar um manuscrito antigo pode ser tão importante quanto encontrar ouro.
Descobrir a localização de uma Relíquia ou compreender um evento histórico também representa progresso.

DD-EXP-006 — Múltiplos Caminhos
Uma região importante deve possuir diferentes formas de acesso.
Exemplos:
ponte;
rio;
montanha;
caverna;
portal antigo.
Cada rota apresenta riscos e oportunidades distintas.

DD-EXP-007 — Verticalidade do Mundo
A exploração ocorre em diferentes níveis.
Exemplos:
subterrâneo;
superfície;
copas das árvores;
fortalezas elevadas;
montanhas.
A altura é um elemento de descoberta.

DD-EXP-008 — Regiões Memoráveis
Cada região deve possuir ao menos um elemento marcante.
Exemplos:
uma árvore colossal;
uma cachoeira invertida;
um castelo em ruínas;
um lago cristalino;
um vulcão ativo.
O jogador deve lembrar dos lugares pelo ambiente, não apenas pelo nome.

DD-EXP-009 — Exploração Não Linear
A progressão incentiva a exploração.
Não exige que todas as áreas sejam visitadas em uma única ordem.
O mundo permanece aberto para revisitas.

DD-EXP-010 — Segredos em Camadas
Uma mesma região pode esconder conteúdos em diferentes profundidades.
Exemplo:
Primeira visita.
↓
Coleta comum.
Décima visita.
↓
Nova entrada descoberta.
Centésima visita.
↓
Chefe oculto.
Isso mantém regiões antigas relevantes.

DD-EXP-011 — O Ambiente Conta Histórias
A exploração deve transmitir narrativa mesmo sem diálogos.
Ruínas, esculturas, campos de batalha e monumentos comunicam acontecimentos do passado.

DD-EXP-012 — Perigo Visível
O jogador deve perceber que está entrando em uma região perigosa através do ambiente.
Exemplos:
silêncio incomum;
vegetação morta;
arquitetura destruída;
criaturas observando à distância;
mudanças na iluminação.
Essa filosofia complementa a diretriz já existente de comunicar perigo pelo próprio mundo.

DD-EXP-013 — Exploração Coopera com Profissões
Profissões revelam conteúdos exclusivos.
Exemplos:
Mineradores encontram túneis.
Lenhadores identificam árvores raras.
Pescadores descobrem cavernas costeiras.
Arqueólogos identificam ruínas.
A exploração deixa de depender apenas do combate.

DD-EXP-014 — Retorno às Regiões
Nenhuma região deve tornar-se inútil após ser concluída.
Ela pode continuar oferecendo:
eventos;
recursos;
profissões;
chefes;
colecionáveis.

DD-EXP-015 — Filosofia Oficial da Exploração
Explorar não significa apenas deslocar-se.
Explorar significa:
descobrir;
compreender;
sobreviver;
retornar mais forte.

CAPÍTULO COMPLEMENTAR — DESCOBERTA

DD-EXP-016 — Primeiro Descobridor
O primeiro jogador ou grupo a encontrar uma nova região pode ter seu nome registrado na Crônica do Mundo.
Não concede vantagem permanente.
É uma recompensa histórica.

DD-EXP-017 — Cartografia
Regiões desconhecidas passam a integrar o mapa do personagem somente após serem visitadas.
O mapa cresce junto com a jornada.

DD-EXP-018 — Pontos de Interesse
Cada região contém Pontos de Interesse (POIs).
Exemplos:
monumentos;
torres;
santuários;
ruínas;
lagos;
cavernas.
Encontrá-los concede progresso de exploração.

DD-EXP-019 — Diário de Exploração
O personagem mantém um registro automático de:
regiões visitadas;
criaturas encontradas;
NPCs importantes;
artefatos recuperados;
fenômenos observados.
Esse diário complementa o Bestiário e o Codex.

DD-EXP-020 — Segredos Não Marcados
Os maiores segredos de Elysia nunca aparecem automaticamente no mapa.
São descobertos por:
observação;
pistas;
livros;
NPCs;
exploração cuidadosa.

DD-EXP-021 — Eventos Dinâmicos
Alguns eventos de exploração surgem sem aviso.
Exemplos:
um meteoro cai;
uma caverna desaba e revela uma passagem;
uma maré baixa expõe ruínas;
uma tempestade revela uma ilha.
Isso incentiva revisitar regiões.

DD-EXP-022 — Memória do Mundo
As descobertas do jogador permanecem registradas.
Mesmo após muito tempo, o diário preserva:
mapas;
anotações;
desenhos;
registros históricos.

DD-EXP-023 — Filosofia da Descoberta
A maior recompensa da exploração é a sensação de ter encontrado algo que nem todos conhecem.
Itens são importantes.
Experiências inesperadas são memoráveis.

DD-EXP-024 — Princípios da Exploração
Ficam estabelecidos oito princípios:
A curiosidade sempre deve ser recompensada.
O mundo nunca revela tudo imediatamente.
A exploração possui múltiplas formas de recompensa.
O ambiente conta histórias.
O perigo deve ser percebido antes do combate.
Regiões antigas continuam relevantes.
Profissões também exploram o mundo.
Descobrir deve ser tão divertido quanto vencer um chefe.

Encerramento da etapa
Com este lote, Elysia passa a ter uma Filosofia Oficial da Exploração, integrando mundo, profissões, economia, lore, bestiário e progressão.
Na sequência, o próximo grande bloco que ainda considero ausente no GDD é um Sistema Oficial de Facções, que serviria como base para reinos, ordens, cultos, organizações criminosas, guildas de NPCs e futuras expansões, conectando-se diretamente às pendências de religiões, ordens e facções existentes na documentação.
Perfeito. Registrado como APROVADO:
DD-EXP-001 ao DD-EXP-024.

Analisando o GDD como um todo, existe uma lacuna importante que aparece em diversos capítulos, mas nunca foi consolidada em um sistema único:
religiões (pendente);
ordens religiosas (pendente);
facções; (citadas em vários pontos)
reinos;
organizações criminosas;
guildas de NPCs.
Em vez de criar cada uma isoladamente, é melhor criar primeiro a arquitetura que sustentará todas elas.

CAPÍTULO COMPLEMENTAR — SISTEMA OFICIAL DE FACÇÕES
PROPOSTA

DD-FCT-001 — Filosofia das Facções
Uma facção representa um grupo organizado que compartilha:
objetivos;
valores;
liderança;
recursos;
influência.
Nem toda facção é militar.

DD-FCT-002 — Tipos de Facções
As facções podem pertencer a diferentes categorias.
Exemplos:
Reino
Cidade-Estado
Ordem
Igreja
Guilda NPC
Organização Mercantil
Companhia Militar
Clã Tribal
Sociedade Secreta
Culto
Organização Criminosa

DD-FCT-003 — Independência
Nem toda facção responde a um reino.
Exemplos:
Mercadores.
↓
Independentes.
Caçadores.
↓
Independentes.
Piratas.
↓
Independentes.

DD-FCT-004 — Relações Diplomáticas
Toda facção mantém relação com outras.
Estados possíveis:
Aliada
Neutra
Desconfiada
Rival
Hostil
Em Guerra
Essas relações podem evoluir ao longo da história.

DD-FCT-005 — Influência Territorial
Cada facção exerce influência sobre determinadas regiões.
Essa influência pode ser:
militar;
econômica;
religiosa;
cultural.

DD-FCT-006 — Liderança
Toda facção possui uma estrutura de comando.
Exemplo genérico:
líder;
conselho;
oficiais;
membros.
A estrutura varia conforme sua natureza.

DD-FCT-007 — Identidade Visual
Cada facção deve possuir identidade própria.
Elementos possíveis:
bandeiras;
brasões;
arquitetura;
uniformes;
símbolos;
cores.

DD-FCT-008 — História
Nenhuma facção surge apenas para fornecer missões.
Toda facção deve possuir:
origem;
acontecimentos marcantes;
conflitos;
objetivos atuais.

DD-FCT-009 — Recursos
Cada facção depende de recursos.
Exemplos:
ouro;
alimentos;
minério;
soldados;
magia;
influência.
Isso ajuda a explicar seu comportamento.

DD-FCT-010 — Especialização
Cada facção possui uma principal área de atuação.
Exemplos:
Mercadores.
↓
Economia.
Ordem.
↓
Conhecimento.
Exército.
↓
Guerra.
Igreja.
↓
Espiritualidade.

CAPÍTULO — REPUTAÇÃO

DD-FCT-011 — Reputação Individual
Cada personagem possui reputação separada para cada facção.
Ganhar prestígio em uma não significa prestígio em todas.

DD-FCT-012 — Faixas de Reputação
Estrutura proposta:
Inimigo
Hostil
Desconhecido
Neutro
Conhecido
Respeitado
Honrado
Exaltado

DD-FCT-013 — Formas de Evolução
A reputação pode aumentar através de:
missões;
comércio;
exploração;
defesa;
eventos;
ajuda direta.

DD-FCT-014 — Consequências
A reputação influencia:
preços;
acesso;
missões;
títulos;
recompensas;
diálogos.

DD-FCT-015 — Reputação Negativa
Também é possível perder reputação.
Exemplos:
roubo;
assassinato;
traição;
auxílio a facções rivais.

DD-FCT-016 — Neutralidade
O jogador não é obrigado a participar de todas as facções.
É possível permanecer neutro em diversas delas.

DD-FCT-017 — Conflitos Morais
Algumas escolhas beneficiam uma facção e prejudicam outra.
O jogador precisa decidir qual grupo apoiar.

DD-FCT-018 — Recuperação
Reputação negativa pode ser recuperada.
Porém:
quanto maior o dano causado,
mais difícil será restaurar a confiança.

CAPÍTULO — ORGANIZAÇÕES ESPECIAIS

DD-FCT-019 — Ordens
Ordens preservam:
conhecimento;
tradições;
técnicas;
artefatos.
Nem toda Ordem é religiosa.

DD-FCT-020 — Igrejas
As Igrejas representam interpretações culturais da Criação.
Isso está alinhado ao fato de que nenhuma religião possui conhecimento absoluto da verdade do universo.

DD-FCT-021 — Cultos
Cultos normalmente ocultam seus verdadeiros objetivos.
Podem servir:
Corrupção;
demônios;
entidades esquecidas;
ideologias radicais.
Nem todo culto é necessariamente maligno.

DD-FCT-022 — Companhias Mercantis
Controlam:
rotas comerciais;
caravanas;
armazéns;
navios;
contratos.

DD-FCT-023 — Organizações Criminosas
Atuam através de:
contrabando;
extorsão;
espionagem;
mercado ilegal.
Nem todos os seus membros são assassinos.

DD-FCT-024 — Academias
São responsáveis pela preservação do conhecimento.
Podem formar:
magos;
estudiosos;
cartógrafos;
arqueólogos.

DD-FCT-025 — Facções Militares
Responsáveis por:
defesa;
fronteiras;
fortalezas;
campanhas.
Não representam necessariamente governos.

DD-FCT-026 — Filosofia das Facções
As facções existem para tornar o mundo politicamente vivo.
Elas não são apenas distribuidoras de missões.

CAPÍTULO — POLÍTICA VIVA

DD-FCT-027 — Mundo em Movimento
As facções continuam agindo mesmo sem jogadores.
Elas podem:
negociar;
guerrear;
explorar;
reconstruir;
expandir.

DD-FCT-028 — Mudanças Graduais
Nenhuma facção permanece igual para sempre.
Novos líderes,
novas alianças
e novas crises podem surgir ao longo da vida do servidor.

DD-FCT-029 — Eventos Políticos
Exemplos:
coroações;
golpes;
tratados;
rebeliões;
crises econômicas.
Esses eventos podem originar missões, alterar preços, abrir regiões ou mudar a influência de uma facção.

DD-FCT-030 — Filosofia Oficial das Facções
As facções representam a sociedade organizada de Elysia.
Elas conectam:
política;
economia;
religião;
exploração;
guerras;
narrativa.
O objetivo é que o jogador sinta que vive em um mundo habitado por interesses reais, e não em um cenário estático.

Encerramento da etapa
Com este lote, Elysia passa a ter uma estrutura política completa, capaz de sustentar centenas de organizações diferentes sem perder consistência.
Situação atual do GDD
Neste ponto, já consolidamos praticamente toda a arquitetura horizontal do jogo:
✔ Cosmologia
✔ Filosofia do mundo
✔ Classes
✔ Atributos
✔ Combate
✔ IA
✔ Bestiário
✔ Chefes
✔ Equipamentos
✔ Passivos
✔ Relíquias
✔ Exploração
✔ Ecologia
✔ Facções
A partir daqui, os próximos capítulos podem entrar em um nível ainda mais profundo de detalhamento, como:
Sistema oficial de Quests (estrutura narrativa das missões).
Sistema de Eventos Mundiais.
Sistema Naval e Exploração Oceânica.
Arquitetura completa dos Reinos.
Character Bible (NPCs importantes).
Art Bible (diretrizes visuais).
Sound Bible (música e ambientação).
Esses capítulos expandem o universo mantendo a base já consolidada e respeitando as pendências ainda existentes no documento.

Perfeito. Registrado como APROVADO:
DD-FCT-001 ao DD-FCT-030.

Ao revisar a estrutura geral do GDD, existe um sistema que influencia praticamente todos os outros, mas ainda não recebeu um capítulo próprio:
exploração;
facções;
NPCs;
lore;
progressão;
recompensas.
Esse sistema é o Sistema Oficial de Quests.
Hoje ele aparece apenas distribuído pelo documento. Vamos transformá-lo em uma arquitetura única.

CAPÍTULO COMPLEMENTAR — FILOSOFIA DAS QUESTS
PROPOSTA

DD-QST-001 — A Quest Existe por um Motivo
Nenhuma missão deve existir apenas para entregar experiência.
Toda Quest deve cumprir pelo menos um objetivo:
contar uma história;
ensinar uma mecânica;
apresentar uma região;
desenvolver um personagem;
movimentar a economia;
revelar parte da lore;
alterar o mundo.

DD-QST-002 — O Jogador Não é o Escolhido
As Quests respeitam um princípio já consolidado na Lore:
o personagem não é "o herói profetizado", mas uma pessoa capaz de conquistar relevância por suas ações.

DD-QST-003 — Narrativa em Camadas
Cada missão deve possuir, quando apropriado:
objetivo imediato;
contexto;
consequência.
Mesmo missões simples devem fazer sentido dentro do mundo.

DD-QST-004 — Diversidade de Objetivos
As Quests não se limitam a derrotar monstros.
Podem envolver:
exploração;
escolta;
investigação;
diplomacia;
coleta;
sobrevivência;
defesa;
construção;
arqueologia;
profissões.

DD-QST-005 — O Mundo Convida à Missão
Nem toda Quest começa com um NPC dizendo:
"Preciso da sua ajuda."
Ela pode surgir por:
um objeto encontrado;
uma inscrição;
um cadáver;
uma carta;
um mapa;
um fenômeno natural.

DD-QST-006 — O Jogador Descobre
Algumas missões nunca aparecem automaticamente no diário.
O próprio jogador precisa descobrir:
onde começam;
como evoluem;
quando terminam.

DD-QST-007 — Ritmo
Missões longas devem alternar atividades.
Evitar:
combate
↓
combate
↓
combate
↓
combate
Misturar exploração, diálogo, descoberta e decisões.

DD-QST-008 — Recompensas Variadas
As recompensas podem incluir:
experiência;
ouro;
equipamentos;
reputação;
receitas;
títulos;
conhecimento;
acesso a novas regiões.

DD-QST-009 — Escolhas
Nem toda missão possui apenas um desfecho.
O jogador pode decidir:
quem apoiar;
quem salvar;
quem enfrentar.

DD-QST-010 — Consequências
Escolhas relevantes podem alterar:
diálogos;
reputação;
comerciantes;
facções;
missões futuras.

CAPÍTULO — TIPOS DE QUESTS

DD-QST-011 — Missões Principais
Conduzem a narrativa central do jogo.
Devem ser relativamente poucas.
Cada uma precisa ter alto nível de qualidade.

DD-QST-012 — Missões Regionais
Apresentam:
cidades;
povos;
problemas locais.
São responsáveis por desenvolver cada região.

DD-QST-013 — Missões de Facção
Relacionadas às organizações do mundo.
Ajudam a desenvolver reputação.
Complementam o sistema de Facções aprovado anteriormente.

DD-QST-014 — Missões de Profissão
Voltadas para:
coleta;
fabricação;
pesquisa;
comércio.
Nem todo progresso precisa vir do combate.

DD-QST-015 — Missões de Exploração
Incentivam:
descobrir lugares;
cartografar;
investigar ruínas;
recuperar artefatos.

DD-QST-016 — Missões Épicas
São cadeias extremamente longas.
Podem durar dezenas de horas.
Normalmente envolvem:
Relíquias;
MVPs;
Primeira Rebelião;
Arcanjos;
Fragmentos Primordiais.

DD-QST-017 — Missões Secretas
Não aparecem em listas.
São descobertas apenas através:
da exploração;
de pistas;
de livros;
de eventos.

DD-QST-018 — Missões Diárias
Devem existir apenas quando fizerem sentido.
Seu objetivo é incentivar atividade contínua.
Nunca substituir o conteúdo permanente.

DD-QST-019 — Missões Semanais
Reservadas para conteúdos maiores.
Exemplos:
defesa de fortalezas;
caça de grandes monstros;
objetivos de facção.

DD-QST-020 — Eventos Narrativos
Algumas missões existem apenas durante determinados eventos mundiais.
Depois desaparecem.

CAPÍTULO — QUALIDADE DAS QUESTS

DD-QST-021 — NPCs Memoráveis
O jogador deve lembrar das pessoas.
Não apenas das recompensas.

DD-QST-022 — Objetivos Claros
A missão explica:
o que fazer;
por que fazer;
quais são os riscos.
O desafio deve estar na execução, não em interpretar instruções confusas.

DD-QST-023 — Reutilização Inteligente
Uma mesma região pode receber novas missões ao longo da vida do servidor.
Sem contradizer acontecimentos anteriores.

DD-QST-024 — Missões Não São Checklist
O jogador não deve sentir necessidade de completar tudo apenas porque existe um marcador.
Explorar espontaneamente continua sendo válido.

DD-QST-025 — Missões Contam História
Cada missão deve acrescentar algo ao universo.
Mesmo pequenas histórias ajudam a construir a identidade de Elysia.

DD-QST-026 — Missões Respeitam o Mundo
As Quests nunca devem contradizer:
a cosmologia;
o sistema das almas;
a Corrupção;
o Heart;
a história oficial.
Mantêm coerência com a Lore consolidada.

DD-QST-027 — Cadeias de Missões
Uma Quest pode desbloquear outras.
Criando uma rede de histórias interligadas.

DD-QST-028 — Missões e Exploração
Algumas missões só avançam após:
descobrir uma região;
encontrar um objeto;
conversar com determinado NPC.
A exploração passa a integrar naturalmente a progressão narrativa.

DD-QST-029 — Filosofia da Progressão
O jogador deve sentir que:
o mundo muda porque participou dele,
não apenas porque ganhou níveis.

DD-QST-030 — Filosofia Oficial das Quests
As Quests de Elysia existem para transformar exploração em narrativa.
Elas conectam:
personagens;
facções;
regiões;
história;
economia;
chefes;
Relíquias.
O objetivo final não é apenas distribuir recompensas, mas fazer com que cada jornada deixe uma lembrança.

CAPÍTULO COMPLEMENTAR — LINHAS NARRATIVAS
PROPOSTA
Este capítulo organiza a narrativa em macroestruturas para facilitar a produção de conteúdo ao longo dos anos.

DD-QST-031 — Linha Principal
Existe uma linha narrativa principal relacionada à verdade do mundo.
Ela aborda gradualmente temas como:
Heart;
Primeira Rebelião;
Corrupção;
Arcanjos.
Sem revelar tudo de uma vez.

DD-QST-032 — Linhas Regionais
Cada grande região possui sua própria história.
Ela pode ser concluída independentemente da narrativa principal.

DD-QST-033 — Linhas de Facção
Cada facção importante possui uma cadeia própria de missões.
Concluir uma não exige concluir todas.

DD-QST-034 — Linhas de Profissão
Cada profissão possui uma progressão narrativa.
O artesão também vive aventuras.
Não apenas fabrica itens.

DD-QST-035 — Linhas de Relíquias
Cada Relíquia importante pode possuir sua própria campanha.
Obtê-la é apenas o início.
Compreender sua história faz parte da jornada.

DD-QST-036 — Filosofia das Linhas Narrativas
Elysia não possui apenas uma história.
Possui centenas de histórias conectadas.
O jogador escolhe quais deseja viver primeiro.

Encerramento da etapa
Este lote cria a arquitetura narrativa do jogo sem definir ainda as missões individuais. Isso facilita o desenvolvimento futuro de cidades, regiões, facções e expansões, pois todas passam a seguir a mesma estrutura de design.

Perfeito. Registrado como APROVADO:
DD-QST-001 ao DD-QST-036.

Analisando a arquitetura atual do GDD, existe outro sistema fundamental que ainda aparece apenas de forma fragmentada: Eventos Mundiais.
Hoje eles aparecem indiretamente ligados a:
chefes;
exploração;
clima;
facções;
economia;
guerras.
Mas não existe um capítulo definindo sua filosofia.
Este é o próximo passo natural.

CAPÍTULO COMPLEMENTAR — SISTEMA OFICIAL DE EVENTOS MUNDIAIS
PROPOSTA

DD-EVT-001 — Mundo Vivo
O mundo de Elysia continua mudando mesmo quando nenhum jogador interfere diretamente.
Eventos mundiais representam essas mudanças.

DD-EVT-002 — Eventos Não São Apenas Festivais
Um Evento Mundial pode representar:
fenômeno natural;
conflito;
descoberta;
invasão;
ritual;
mudança climática;
evento astronômico.

DD-EVT-003 — Categorias Oficiais
Os eventos são divididos em:
Naturais
Históricos
Militares
Econômicos
Religiosos
Arcanos
Cósmicos
Sazonais

DD-EVT-004 — Escalas
Eventos podem possuir diferentes escalas.
Local
Regional
Continental
Mundial
Nem todo evento precisa afetar o servidor inteiro.

DD-EVT-005 — Duração
Cada evento possui duração própria.
Pode durar:
minutos;
horas;
dias;
semanas.
Em casos excepcionais, meses.

DD-EVT-006 — Frequência
Existem três grupos.
Eventos Permanentes
↓
fazem parte do mundo.
Eventos Recorrentes
↓
retornam periodicamente.
Eventos Únicos
↓
ocorrem apenas uma vez dentro da cronologia do servidor.

CAPÍTULO — EVENTOS NATURAIS

DD-EVT-007 — Tempestades
Tempestades podem alterar:
visibilidade;
navegação;
comportamento das criaturas;
pesca.

DD-EVT-008 — Chuvas
Determinadas criaturas aparecem apenas durante chuvas.
Outras tornam-se mais raras.

DD-EVT-009 — Nevascas
Afetam principalmente regiões frias.
Podem bloquear caminhos temporariamente.

DD-EVT-010 — Secas
Reduzem recursos naturais.
Mudam a economia local.

DD-EVT-011 — Erupções
Vulcões ativos podem alterar completamente uma região.
Criando:
novos caminhos;
novas dungeons;
novos recursos.

DD-EVT-012 — Marés
Marés alteram:
praias;
cavernas;
acesso a ilhas;
pesca.

CAPÍTULO — EVENTOS MILITARES

DD-EVT-013 — Invasões
Facções hostis podem atacar cidades.
Os jogadores podem ajudar na defesa.

DD-EVT-014 — Cercos
Castelos controlados por NPCs podem sofrer cercos narrativos.
Independente das guerras entre guildas.

DD-EVT-015 — Migração de Monstros
Grandes grupos de criaturas podem abandonar uma região.
Outra passa a tornar-se muito mais perigosa.
Esse conceito complementa a ecologia viva já aprovada.

DD-EVT-016 — Guerras NPC
Reinos podem entrar em guerra.
Mesmo sem participação obrigatória dos jogadores.

CAPÍTULO — EVENTOS ECONÔMICOS

DD-EVT-017 — Rotas Comerciais
Uma rota comercial pode ser:
aberta;
interrompida;
saqueada.
Isso influencia preços regionais.

DD-EVT-018 — Descoberta de Recursos
Novas minas,
florestas
ou bancos de pesca podem ser descobertos.

DD-EVT-019 — Crises Econômicas
Determinados recursos podem tornar-se escassos.
Isso modifica o Craft temporariamente.

CAPÍTULO — EVENTOS ARCANOS

DD-EVT-020 — Instabilidade do Aether
Determinadas regiões sofrem alterações temporárias na energia do Aether.
Consequências possíveis:
fortalecimento de criaturas;
fenômenos mágicos;
surgimento de portais.
Esse conceito permanece compatível com a cosmologia já definida.

DD-EVT-021 — Corrupção Crescente
Algumas áreas podem sofrer avanço temporário da Corrupção.
Sem alterar permanentemente a geografia.

DD-EVT-022 — Ecos da Primeira Rebelião
Memórias do Aether podem tornar-se excepcionalmente intensas.
Permitindo acesso a acontecimentos antigos.
Sem modificar a história oficial.

CAPÍTULO — EVENTOS RELIGIOSOS

DD-EVT-023 — Peregrinações
Fiéis de diferentes tradições podem realizar jornadas.
Isso movimenta cidades e estradas.

DD-EVT-024 — Celebrações
Culturas diferentes comemoram acontecimentos próprios.
Essas festividades ajudam a diferenciar os povos de Elysia.

DD-EVT-025 — Fenômenos Espirituais
Alguns locais tornam-se temporariamente mais próximos do Caminho do Retorno.
Isso pode afetar:
espíritos;
mortos-vivos;
rituais;
missões.

CAPÍTULO — EVENTOS CÓSMICOS

DD-EVT-026 — Alinhamentos Celestes
Certos fenômenos astronômicos alteram temporariamente o mundo.
Exemplos:
conjuração;
criaturas;
exploração.

DD-EVT-027 — Queda de Meteoros
Meteoros podem criar:
novas crateras;
novos minérios;
novos chefes;
novas linhas de exploração.

DD-EVT-028 — Eclipse
Durante eclipses,
criaturas específicas tornam-se mais fortes,
enquanto outras enfraquecem.

CAPÍTULO — FILOSOFIA DOS EVENTOS

DD-EVT-029 — Participação Opcional
Nenhum Evento Mundial deve ser obrigatório.
Sempre existirão outras formas de progresso.

DD-EVT-030 — Consequências Permanentes (Quando Apropriado)
Alguns eventos deixam marcas permanentes.
Exemplos:
monumentos;
ruínas;
memoriais;
mudanças políticas.
Outros desaparecem completamente.
A escolha depende da importância narrativa do evento.

DD-EVT-031 — Recompensas Coerentes
As recompensas devem refletir o tipo do evento.
Exemplos:
invasões → reputação militar;
arqueologia → artefatos;
festivais → itens cosméticos;
exploração → mapas e conhecimento.

DD-EVT-032 — Integração Sistêmica
Um Evento Mundial pode afetar simultaneamente:
facções;
economia;
exploração;
profissões;
chefes;
ecologia;
clima.
Isso evita sistemas isolados.

DD-EVT-033 — Cronologia do Servidor
Os acontecimentos importantes ficam registrados na Crônica do Mundo.
Jogadores que ingressarem anos depois poderão conhecer a história do servidor.

DD-EVT-034 — Filosofia Oficial dos Eventos Mundiais
Os Eventos Mundiais existem para impedir que Elysia pareça um cenário imóvel.
Eles representam a evolução contínua do mundo, criando novas histórias sem invalidar o conteúdo permanente.

CAPÍTULO COMPLEMENTAR — CRÔNICA DO MUNDO
PROPOSTA

DD-CHRN-001 — Registro Histórico
Cada servidor mantém uma Crônica do Mundo.
Ela registra apenas acontecimentos relevantes.

DD-CHRN-002 — Eventos Registráveis
Podem ser registrados:
primeira derrota de um Chefe Mítico;
descoberta de uma Relíquia;
fundação de uma cidade;
conquista de castelos importantes;
grandes guerras;
conclusão de eventos únicos.

DD-CHRN-003 — Personagens Históricos
Jogadores podem tornar-se parte da história do servidor quando realizarem feitos extraordinários.
Isso não concede vantagens permanentes, mas preserva sua participação na narrativa coletiva.

DD-CHRN-004 — Consulta Pública
Bibliotecas, arquivos históricos e cronistas permitem consultar a Crônica do Mundo.
Ela funciona como um registro vivo da evolução daquele servidor.

DD-CHRN-005 — Filosofia da Memória
O mundo de Elysia deve lembrar o que aconteceu.
As ações dos jogadores podem deixar marcas que sobrevivem ao tempo, fortalecendo a sensação de viver em um universo persistente e em constante transformação.

Encerramento da etapa
Com este lote, Elysia passa a possuir uma arquitetura para eventos persistentes e uma memória histórica do servidor, conectando exploração, política, economia, chefes, facções e narrativa em um único sistema. Essa estrutura complementa os capítulos já aprovados sem substituir as pendências específicas do GDD que ainda exigirão detalhamento posterior.

LOTE CANÔNICO 1 — COSMOLOGIA DEFINITIVA DE ELYSIA
PROPOSTA
Este capítulo consolida toda a estrutura metafísica do universo e serve como base para absolutamente toda a narrativa futura.

1. A Criação
Antes da existência do tempo, do espaço, da matéria ou da magia, existia apenas Deus, eterno, absoluto e perfeito.
Deus não surgiu nem foi criado. Sua existência é a origem de toda realidade.
Em determinado momento de Sua vontade, Deus criou o Heart, o primeiro núcleo da Criação.
O Heart não é uma entidade consciente nem um deus menor. É o primeiro receptáculo da vontade criadora, através do qual toda a existência passou a ser organizada.
Do Heart emanaram:
o Tempo;
o Espaço;
o Aether;
as Leis Fundamentais;
a Matéria;
a Vida.
Nada existe fora da Criação de Deus.
Nada possui poder igual ao Seu.

2. O Heart
O Heart é o eixo de toda a realidade.
Ele:
sustenta o universo;
mantém as leis naturais;
preserva o equilíbrio entre matéria e espírito;
alimenta o fluxo do Aether.
Ele não concede desejos.
Não escolhe heróis.
Não possui vontade própria.
Ele apenas mantém a Criação funcionando.
Sua corrupção ameaça a estabilidade de toda a existência.

3. O Aether
O Aether é a energia primordial criada por Deus através do Heart.
Toda magia utiliza o Aether.
Toda alma é formada por Aether.
Toda criatura viva contém Aether.
Mesmo o vazio possui pequenas correntes de Aether.
O Aether não é bom nem mau.
Ele apenas existe.

4. As Leis Fundamentais
A Criação obedece leis imutáveis.
Nenhuma criatura, anjo ou demônio pode alterá-las.
As principais são:
causalidade;
passagem do tempo;
mortalidade;
livre-arbítrio;
conservação do Aether;
ciclo das almas.
Milagres não quebram essas leis.
Eles apenas utilizam mecanismos ainda não compreendidos.

5. Os Sete Arcanjos
Deus criou sete Arcanjos Primordiais.
Eles não são deuses.
São os primeiros administradores da Criação.
Cada um recebeu responsabilidade sobre um aspecto fundamental do universo.
Eles jamais devem ser adorados como divindades.
São servos da Criação.
Sua autoridade existe apenas porque Deus assim determinou.

Os Sete Domínios
Os Arcanjos administram:
Vida
Justiça
Sabedoria
Ordem
Esperança
Tempo
Guardião do Heart
Esses domínios representam responsabilidades, não fontes exclusivas de poder.

6. O Livre-Arbítrio
A maior dádiva concedida por Deus foi o livre-arbítrio.
Nem mesmo os Arcanjos foram privados dessa liberdade.
A possibilidade de escolher torna possível:
amor;
virtude;
coragem;
mas também:
orgulho;
inveja;
corrupção;
rebelião.
Sem livre-arbítrio não existiria verdadeira bondade.

7. A Primeira Rebelião
Em algum momento após a Criação,
parte dos seres celestiais escolheu rejeitar a ordem estabelecida.
A motivação não foi desejo de destruir Deus.
Foi orgulho.
Acreditavam poder governar melhor a realidade.
Dessa decisão nasceu a Primeira Rebelião.
Ela representa o maior conflito da história do universo.

8. O Nascimento da Corrupção
A Corrupção não foi criada por Deus.
Ela surgiu como consequência direta da ruptura provocada pela rebelião.
A Corrupção não possui consciência.
Não possui vontade.
Não possui objetivos.
Ela funciona como uma doença espiritual.
Tudo aquilo que toca tende à degradação.

9. Os Senhores Demoníacos
Os maiores líderes da rebelião tornaram-se os Senhores Demoníacos.
Eles não equivalem aos Arcanjos.
Não administram aspectos da Criação.
Administram apenas domínios conquistados através da corrupção.
Seu poder deriva da manipulação da Corrupção.
Nunca da criação.

10. A Guerra Celestial
A Primeira Rebelião desencadeou uma guerra que alterou toda a estrutura do universo.
Não foi uma batalha de dias.
Nem de anos.
Foi um conflito que marcou uma Era inteira.
Diversas regiões da realidade foram destruídas.
Outras foram definitivamente transformadas.

11. A Vitória
A ordem da Criação foi preservada.
Entretanto,
a Corrupção jamais pôde ser completamente eliminada.
Desde então,
o universo vive em constante necessidade de equilíbrio.

12. A Criação dos Mundos
Após a estabilização do universo,
novos mundos passaram a surgir.
Elysia é um deles.
Não é o único.
Mas é um dos mais importantes por sua ligação direta com o Heart.

13. A Criação das Raças
Todas as raças inteligentes descendem da Criação original.
Nenhuma raça foi criada pelos demônios.
A Corrupção apenas deforma aquilo que já existe.
Ela nunca cria vida verdadeira.

14. O Ciclo das Almas
Toda alma nasce do Aether.
Durante a vida,
acumula experiências.
Após a morte,
retorna ao Caminho do Retorno.
Esse processo preserva o equilíbrio do universo.
Interromper esse ciclo representa uma violação da ordem natural.

15. Necromancia
A necromancia não cria almas.
Ela apenas impede que uma alma siga corretamente seu caminho.
Quanto maior a interferência,
maior o desequilíbrio provocado.
Por isso a necromancia é vista com extrema cautela pela maioria das culturas.

16. Espíritos
Nem toda alma conclui imediatamente o Caminho do Retorno.
Algumas permanecem temporariamente ligadas ao mundo.
Esses espíritos não são necessariamente malignos.
Podem existir por:
promessa não cumprida;
forte vínculo emocional;
proteção de um lugar;
fenômeno sobrenatural.

17. Mortos-Vivos
Mortos-vivos não representam uma única categoria.
Existem diversas origens possíveis.
Alguns são:
corpos animados;
almas aprisionadas;
vítimas da Corrupção;
experimentos mágicos.
Cada tipo possui regras próprias.

18. Milagres
Milagres existem.
Entretanto,
não representam quebra das leis da realidade.
São manifestações extremamente raras da ordem da Criação,
sempre compatíveis com as Leis Fundamentais.

19. Religiões
Nenhuma religião mortal conhece toda a verdade.
Cada cultura compreende apenas fragmentos da realidade.
Por isso diferentes religiões coexistem,
algumas mais próximas da verdade,
outras profundamente equivocadas.
O conhecimento absoluto pertence apenas a Deus.

20. O Papel do Jogador
O personagem nunca ocupa posição central na cosmologia.
Ele não é escolhido.
Não é descendente de deuses.
Não possui destino inevitável.
Sua importância nasce exclusivamente das próprias escolhas.

21. Filosofia Oficial da Cosmologia
Toda a cosmologia de Elysia segue seis princípios imutáveis:
Deus é o único Criador.
O Heart sustenta a Criação, mas não possui consciência.
O Aether é a energia primordial da existência.
O livre-arbítrio torna possível tanto a virtude quanto a corrupção.
A Corrupção é consequência da rebelião, nunca da vontade do Criador.
O jogador constrói sua própria história dentro de um universo que existia muito antes dele e continuará existindo depois.

O que este lote resolve
Com este único capítulo ficam consolidadas, de forma coerente, praticamente todas as pendências conceituais da cosmologia presentes no GDD relacionadas à Criação, Heart, Aether, livre-arbítrio, Corrupção, Primeira Rebelião, ciclo das almas e o papel do jogador. Os detalhes específicos ainda em aberto — como os nomes, personalidades e histórias individuais dos sete Arcanjos e dos sete Senhores Demoníacos, ou a cronologia detalhada da Primeira Rebelião — permanecem como conteúdo a ser desenvolvido posteriormente, mas passam a seguir uma base única e consistente, em linha com as pendências já registradas no documento.
A partir do próximo lote, podemos fechar de forma semelhante o Atlas Oficial de Elysia, definindo toda a estrutura do mundo (continentes, oceanos, reinos, biomas e geografia) em um único capítulo canônico.Perfeito. Registrado como APROVADO.
✔ Cosmologia Definitiva
Com isso, a base filosófica e metafísica do universo fica praticamente encerrada. Os próximos trabalhos sobre cosmologia serão apenas de conteúdo (nomes dos Arcanjos, biografias, guerras específicas, etc.), e não mais de arquitetura.

LOTE CANÔNICO 2 — ATLAS OFICIAL DE ELYSIA
PROPOSTA
Este capítulo estabelece as regras permanentes para a construção do mundo. Ele não define ainda o nome de cada continente ou cidade, mas define como o planeta deve existir e evoluir.

1. Filosofia do Mundo
Elysia não é um conjunto de mapas.
É um planeta vivo.
Cada região existe porque possui uma função:
geográfica;
ecológica;
histórica;
econômica;
cultural.
Nenhum mapa deve existir apenas para servir de área de caça.

2. O Planeta
Elysia é um único planeta.
Não existem múltiplos mundos desconectados para o conteúdo principal.
Todo continente pertence ao mesmo planeta.
O oceano conecta todas as terras.

3. Continentes
Os continentes representam as maiores divisões naturais do planeta.
Cada continente possui identidade própria.
Diferenças incluem:
clima;
fauna;
flora;
história;
arquitetura;
povos;
economia;
conflitos.
Nenhum continente deve parecer apenas uma mudança de textura.

4. Oceanos
Os oceanos não existem apenas como barreiras.
São regiões exploráveis.
Possuem:
ilhas;
monstros próprios;
rotas comerciais;
ruínas;
tempestades;
tesouros;
Relíquias;
perigos exclusivos.

5. Regiões
Cada continente é dividido em grandes regiões.
Cada região possui:
bioma dominante;
história;
economia;
recursos;
fauna;
arquitetura;
eventos próprios.

6. Biomas
Os biomas não são definidos apenas pela vegetação.
Eles representam ecossistemas completos.
Cada bioma determina:
criaturas;
recursos;
clima;
profissões;
alimentação;
doenças;
construção;
vestimentas.

7. Clima
O clima influencia diretamente o mundo.
Afeta:
agricultura;
pesca;
monstros;
exploração;
visibilidade;
profissões;
economia.
Não é apenas efeito visual.

8. Ecossistemas
Todo ecossistema deve possuir cadeia ecológica coerente.
Predadores.
↓
Presas.
↓
Vegetação.
↓
Recursos.
↓
Influência climática.

9. Recursos Naturais
Cada região possui recursos característicos.
Exemplos:
madeira;
minério;
ervas;
cristais;
peixes;
pedras raras.
Isso movimenta o comércio entre regiões.

10. Civilizações
Civilizações surgem próximas de recursos estratégicos.
Exemplos:
rios;
lagos;
portos;
minas;
terras férteis.
Sua localização deve fazer sentido histórico e geográfico.

11. Cidades
Cada cidade possui identidade própria.
Ela deve ser reconhecida por:
arquitetura;
economia;
cultura;
religião predominante;
profissão principal;
posição geográfica.
Nunca apenas pelo nível dos monstros ao redor.

12. Vilas
As vilas servem como pontos de apoio.
Possuem vida própria.
Não existem apenas para vender poções.

13. Capitais
As capitais concentram:
governo;
comércio;
cultura;
diplomacia;
grandes templos;
academias;
mercados.
São centros de influência continental ou regional.

14. Estradas
Estradas possuem significado.
Ligam regiões por motivos históricos e econômicos.
Podem ser:
seguras;
perigosas;
abandonadas;
militares;
comerciais;
religiosas.

15. Portos
Os portos conectam continentes.
Também são polos econômicos e culturais.

16. Fronteiras
As fronteiras não são apenas linhas no mapa.
São zonas onde culturas, economias e conflitos se encontram.

17. Fortalezas
Fortalezas protegem:
montanhas;
passagens;
pontes;
portos;
fronteiras.
Sua posição deve possuir justificativa estratégica.

18. Castelos
Castelos representam poder político.
Sua arquitetura reflete a cultura do reino que os construiu.

19. Ruínas
Ruínas são testemunhos da história.
Sempre devem responder:
quem construiu;
quando;
por que caiu;
o que restou.

20. Dungeons
Dungeons não surgem aleatoriamente.
Cada uma possui origem definida.
Pode ter sido:
mina;
templo;
fortaleza;
laboratório;
prisão;
cidade soterrada;
caverna natural.

21. Montanhas
Montanhas influenciam:
clima;
rios;
mineração;
fronteiras;
isolamento cultural.

22. Rios
Os rios constituem as principais rotas naturais do mundo.
Civilizações tendem a surgir próximas a eles.

23. Florestas
Cada floresta possui identidade.
Pode ser:
sagrada;
antiga;
amaldiçoada;
tropical;
temperada;
boreal.
Não existem "florestas genéricas".

24. Desertos
Desertos possuem vida própria.
O perigo não vem apenas da falta de água.
Também pode surgir de:
tempestades;
ruínas soterradas;
criaturas subterrâneas;
rotas perdidas.

25. Pântanos
São ecossistemas ricos.
Possuem:
ervas raras;
criaturas exclusivas;
doenças;
ruínas escondidas.

26. Cavernas
As cavernas formam um mundo subterrâneo.
Nem todas levam a dungeons.
Algumas existem apenas para exploração.

27. Ilhas
As ilhas apresentam ecossistemas isolados.
Isso favorece espécies únicas e culturas próprias.

28. Vulcões
São centros geológicos ativos.
Influenciam:
mineração;
clima;
criaturas;
eventos mundiais.

29. Regiões Polares
As áreas polares possuem regras próprias.
Incluem:
sobrevivência;
recursos exclusivos;
criaturas adaptadas;
fenômenos climáticos.

30. Mundo Subterrâneo
Existe uma extensa rede subterrânea.
Ela conecta:
cavernas;
ruínas;
cidades antigas;
ecossistemas completos.
Não é apenas um mapa inferior.

31. Navegação
A navegação é uma forma legítima de exploração.
Viagens marítimas apresentam:
clima;
monstros;
piratas;
comércio;
descobertas.

32. Cartografia
O conhecimento do mapa é um recurso valioso.
Exploradores, estudiosos e navegadores podem produzir mapas mais completos.

33. Geografia Histórica
A geografia atual é consequência da história.
Montanhas destruídas.
Cidades abandonadas.
Florestas queimadas.
Ruínas.
Tudo possui uma causa.

34. Mundo Persistente
Mudanças importantes permanecem registradas.
Um castelo destruído ou uma cidade reconstruída tornam-se parte da história do servidor quando isso fizer sentido narrativo.

35. Filosofia da Exploração Geográfica
A distância deve ser percebida.
Viajar entre regiões transmite a sensação de atravessar culturas, ecossistemas e paisagens diferentes.
O jogador precisa sentir que realmente cruzou parte do mundo.

36. Identidade Visual das Regiões
Cada grande região deve ser reconhecida apenas por uma imagem.
Sem necessidade de interface.
Arquitetura.
Vegetação.
Paleta de cores.
Clima.
Fauna.
Tudo contribui para uma identidade visual única.

37. Mundo Coerente
Nenhum elemento geográfico deve existir apenas por conveniência de gameplay.
Toda montanha, rio, cidade, estrada ou ruína precisa possuir justificativa:
histórica;
econômica;
militar;
religiosa;
natural.

38. Escalabilidade
O planeta deve permitir crescimento por décadas.
Novos continentes, arquipélagos, regiões ou mares podem ser adicionados sem invalidar a geografia já existente.

39. Filosofia Oficial do Atlas
O mundo de Elysia deve ser construído como um planeta real.
Gameplay nasce da geografia.
Economia nasce dos recursos.
História nasce das civilizações.
Exploração nasce da curiosidade.
Nada deve existir isoladamente.

40. Princípios Imutáveis do Mundo
Toda expansão futura deve respeitar dez princípios:
A geografia precede a gameplay.
Toda região possui identidade própria.
Recursos moldam civilizações.
O clima influencia a vida.
A história deixa marcas permanentes.
Exploração é recompensada pela descoberta.
A arquitetura reflete a cultura.
O oceano é parte ativa do mundo.
O planeta pode crescer sem perder coerência.
O mundo deve parecer existir independentemente dos jogadores.

O que este lote resolve
Este capítulo fecha praticamente toda a arquitetura geográfica de Elysia. A partir dele, qualquer continente, cidade, reino, dungeon ou bioma poderá ser criado seguindo um conjunto consistente de princípios. Permanecem em aberto apenas os elementos de conteúdo, como os nomes, localização exata e história individual de cada continente, reino, cidade e ponto de interesse, que ainda são marcados como áreas de desenvolvimento futuro no GDD.
LOTE CANÔNICO 3 — CIVILIZAÇÕES, CULTURAS E SOCIEDADE
PROPOSTA
Este capítulo estabelece os princípios que governam todas as sociedades inteligentes de Elysia. Ele complementa os capítulos sobre Facções, Exploração e Cosmologia, além de preparar o terreno para religiões, reinos e cidades, temas ainda marcados como pendentes no GDD.

1. Filosofia das Civilizações
Civilizações não existem para servir ao jogador.
Elas possuem história própria.
Objetivos próprios.
Problemas próprios.
O jogador entra em um mundo que já existia antes dele.

2. Toda Sociedade Possui Identidade
Cada povo deve possuir identidade própria em:
arquitetura;
idioma;
alimentação;
vestimentas;
religião;
tradições;
organização política;
economia;
arte;
guerra.
Nenhuma civilização deve parecer apenas uma cópia de outra com cores diferentes.

3. A Geografia Molda a Cultura
O ambiente influencia diretamente uma sociedade.
Exemplos:
Montanhas favorecem mineração e fortalezas.
Rios favorecem agricultura e comércio.
Desertos favorecem caravanas e cidades-oásis.
Costas favorecem pesca e navegação.
A cultura nasce do ambiente.

4. A História Molda a Cultura
Guerras.
Fomes.
Pragas.
Milagres.
Migrações.
Conquistas.
Tudo deixa marcas permanentes.
Nenhuma cultura surge pronta.

5. Diversidade Cultural
Duas cidades humanas podem ser completamente diferentes.
Raça não determina cultura.
A história determina.

6. Idiomas
Existe um idioma comum utilizado por questões de gameplay.
Entretanto, cada grande cultura pode possuir:
dialetos;
escritas antigas;
alfabetos próprios;
inscrições históricas.
Esses idiomas enriquecem a exploração e a narrativa, sem impedir a comunicação entre jogadores.

7. Religião e Sociedade
Toda grande civilização desenvolve alguma interpretação sobre:
origem do mundo;
morte;
almas;
Heart;
Corrupção.
Nenhuma delas conhece toda a Verdade Absoluta da cosmologia.

8. Tradições
Cada povo possui:
festas;
cerimônias;
casamentos;
funerais;
ritos de passagem;
formas de saudação.
Essas tradições fortalecem a identidade cultural.

9. Estrutura Familiar
Cada sociedade define suas próprias estruturas familiares.
O GDD não impõe um único modelo universal.

10. Educação
O conhecimento pode ser transmitido por:
mestres;
famílias;
templos;
academias;
ordens;
tradição oral.
Cada cultura valoriza formas diferentes de aprendizado.

11. Justiça
Toda sociedade precisa responder:
o que é crime;
quem julga;
quais punições existem;
como conflitos são resolvidos.
A aplicação dessas regras varia conforme a cultura.

12. Economia
Cada civilização produz mais facilmente determinados recursos.
Isso cria dependência do comércio.
Nenhum reino deve ser completamente autossuficiente.

13. Arquitetura
A arquitetura deve refletir:
materiais disponíveis;
clima;
tecnologia;
religião;
história.
Construções contam a história de um povo.

14. Alimentação
A culinária deriva dos recursos locais.
Ela influencia:
festividades;
comércio;
profissões;
identidade regional.

15. Vestimentas
As roupas refletem:
clima;
profissão;
riqueza;
tradição;
religião.
Vestimenta comunica pertencimento cultural.

16. Arte
Toda cultura produz arte.
Exemplos:
pintura;
escultura;
música;
poesia;
teatro;
tapeçaria.
A arte preserva memória e identidade.

17. Música
Cada região possui identidade musical.
O jogador deve reconhecer uma cultura apenas pela trilha sonora.

18. Símbolos
Toda sociedade possui símbolos próprios.
Exemplos:
brasões;
bandeiras;
selos;
moedas;
monumentos.

19. Calendário
Cada povo pode utilizar calendários locais.
Porém existe um calendário oficial utilizado para:
comércio;
diplomacia;
registros históricos.

20. Conhecimento Histórico
Nenhuma sociedade conhece toda a história do mundo.
Cada povo preserva apenas parte da memória da Criação.
A verdade completa permanece fragmentada.

21. Migrações
Povos mudam de lugar.
Fronteiras mudam.
Culturas se misturam.
A diversidade é resultado da história.

22. Guerras
Guerras transformam sociedades.
Elas alteram:
fronteiras;
economia;
arquitetura;
memória coletiva.
Mesmo séculos depois, seus efeitos permanecem.

23. Diplomacia
Conflitos não são resolvidos apenas pela força.
Tratados.
Casamentos políticos.
Acordos comerciais.
Alianças religiosas.
Tudo influencia a estabilidade do mundo.

24. Povos Minoritários
Nem toda cultura forma um reino.
Existem:
tribos;
comunidades isoladas;
povos nômades;
ordens itinerantes.
Esses grupos enriquecem o mundo.

25. Urbanização
Nem todos vivem em cidades.
Também existem:
fazendas;
vilarejos;
mosteiros;
acampamentos;
postos militares.

26. Memória Coletiva
Cada sociedade escolhe o que lembrar.
E o que esquecer.
Lendas podem preservar acontecimentos reais de forma distorcida.

27. Patrimônio
Monumentos.
Ruínas.
Templos.
Pontes.
Fortalezas.
Representam a herança histórica de um povo.

28. Sociedade Viva
NPCs trabalham.
Dormem.
Comemoram.
Viajam.
Negociam.
Rezam.
O mundo não permanece congelado esperando o jogador.

29. Evolução Cultural
Nenhuma cultura permanece estática.
Ao longo dos anos:
costumes mudam;
cidades crescem;
tecnologias evoluem;
crenças se transformam.

30. Filosofia Oficial das Civilizações
Civilizações são personagens coletivos.
Cada povo possui identidade, memória, valores e conflitos.
Explorar Elysia significa conhecer sociedades diferentes, não apenas mapas diferentes.

APÊNDICE — DEZ PRINCÍPIOS DAS CULTURAS DE ELYSIA
Toda nova civilização criada para o jogo deve obedecer aos seguintes princípios:
A geografia influencia a cultura.
A história influencia a identidade.
Nenhum povo conhece toda a verdade.
Arquitetura comunica valores.
Economia nasce dos recursos locais.
Religião nasce da interpretação da cosmologia.
Guerras deixam cicatrizes permanentes.
A diversidade é consequência da história, não da raça.
As sociedades continuam evoluindo ao longo do tempo.
O mundo deve parecer habitado mesmo quando nenhum jogador está presente.

O que este lote resolve
Este capítulo estabelece a base para todas as futuras culturas, reinos, cidades e povos de Elysia. Quando chegarmos ao conteúdo específico (por exemplo, um reino humano, uma cidade portuária ou uma tribo nas montanhas), não precisaremos mais decidir como uma sociedade funciona, apenas quem ela é.
Depois deste lote, o próximo passo natural é um dos maiores capítulos do projeto: Religiões e Ordens Religiosas, fechando as pendências restantes da cosmologia e preparando definitivamente a criação das civilizações.
Perfeito. Registrado como APROVADO.
✔ Cosmologia Definitiva
✔ Atlas Oficial
✔ Civilizações, Culturas e Sociedade

Agora chegamos em um dos capítulos mais importantes de toda a Lore.
Na minha opinião, este documento define a personalidade do universo tanto quanto a própria cosmologia.
O GDD ainda deixa como pendentes:
funcionamento completo das religiões;
principais religiões;
ordens religiosas;
símbolos;
profetas;
natureza dos milagres;
relação entre fé e magia.
Vamos fechar tudo de uma vez.

LOTE CANÔNICO 4 — RELIGIÕES, FÉ E ORDENS DA CRIAÇÃO
PROPOSTA

1. Filosofia da Fé
A fé em Elysia não nasce da certeza.
Nasce da interpretação.
Nenhum povo possui acesso completo à Verdade Absoluta.
Cada religião representa uma tentativa sincera — ou deliberadamente distorcida — de compreender a Criação.

2. O Criador
Todas as grandes religiões reconhecem, direta ou indiretamente, a existência de um Criador.
Entretanto:
utilizam nomes diferentes;
possuem símbolos diferentes;
contam histórias diferentes;
interpretam a Criação de maneiras distintas.
Não existe uma religião idêntica à Lore Bible.

3. Fragmentação da Verdade
Após milhares de anos,
guerras,
migrações,
perda de documentos,
queda de civilizações
e interpretações sucessivas,
o conhecimento original tornou-se fragmentado.
Cada religião preserva apenas parte da verdade.

4. Fé e Conhecimento
Conhecimento e fé são coisas diferentes.
Um mago pode compreender profundamente o Aether.
Isso não significa possuir fé.
Da mesma forma,
um sacerdote pode possuir enorme fé sem compreender a natureza do Aether.

5. Milagres
Milagres existem.
São extremamente raros.
Nunca contradizem as Leis Fundamentais da Criação.
Sua origem permanece misteriosa para os habitantes do mundo.
A Lore Bible estabelece apenas que não representam uma quebra da realidade, permanecendo coerentes com a cosmologia aprovada.

6. Fé e Magia
Magia e fé não são a mesma coisa.
A magia manipula o Aether.
A fé busca viver segundo uma interpretação da Ordem da Criação.
Em situações extraordinárias, ambas podem produzir efeitos semelhantes por caminhos diferentes.

7. Nenhuma Religião é Onisciente
Mesmo a religião mais próxima da verdade contém:
lacunas;
interpretações;
simbolismos;
erros históricos.
Isso impede dogmas absolutamente corretos dentro do mundo.

8. Religião e Política
Religião influencia política.
Política influencia religião.
Ao longo da história,
reis utilizaram religiões.
Religiões influenciaram reis.
Essa relação nunca é completamente simples.

9. Diversidade Religiosa
Diferentes povos podem:
venerar aspectos diferentes da Criação;
enfatizar virtudes distintas;
possuir calendários próprios;
celebrar datas diferentes.

10. Intolerância e Convivência
Nem todas as religiões convivem em paz.
Algumas competem.
Outras cooperam.
Outras ignoram umas às outras.
Os conflitos devem surgir de diferenças históricas e filosóficas, não de caricaturas.

11. Ordens Religiosas
Ordens representam organizações dedicadas a preservar uma tradição específica.
Nem toda Ordem controla templos.
Algumas atuam como:
estudiosos;
curadores;
peregrinos;
guardiões;
copistas;
arqueólogos.

12. Monges e Ascetas
Algumas tradições valorizam:
disciplina;
silêncio;
contemplação;
serviço.
Esses grupos exercem influência espiritual sem necessariamente participar da política.

13. Profetas
Profetas são personagens históricos.
Nunca possuem conhecimento absoluto.
São lembrados porque marcaram uma época.
Não porque receberam toda a Verdade.

14. Santos e Mártires
Algumas religiões veneram pessoas exemplares.
Outras rejeitam essa prática.
Não existe uma regra universal.

15. Lugares Sagrados
Determinados locais tornam-se sagrados devido a:
acontecimentos históricos;
peregrinações;
milagres;
tradição.
Sua importância deriva da cultura.

16. Relíquias Sagradas
Uma Relíquia pode ser considerada sagrada por uma religião.
Outra religião pode enxergá-la apenas como um artefato histórico.
O significado depende da interpretação cultural.

17. Peregrinações
Peregrinações fortalecem:
comércio;
intercâmbio cultural;
narrativas;
exploração.
São parte importante da vida religiosa.

18. Ritos Funerários
Cada religião desenvolve seus próprios ritos funerários.
Todos compartilham um objetivo:
honrar os mortos
e desejar que a alma encontre seu caminho.
A forma como isso é feito varia entre culturas, tema ainda aberto para detalhamento específico no GDD.

19. Corrupção e Heresia
A Corrupção pode distorcer religiões.
Não apenas indivíduos.
Textos.
Símbolos.
Rituais.
Instituições.
Tudo pode ser gradualmente deformado.

20. Cultos
Cultos diferem das religiões estabelecidas.
Costumam:
ocultar objetivos;
operar em segredo;
restringir conhecimento.
Nem todo culto é maligno.
Mas todos possuem acesso limitado e controlado ao conhecimento.

21. Liberdade Religiosa
A maioria dos reinos permite diferentes interpretações religiosas.
Outros adotam religiões oficiais.
Essa escolha pertence à história de cada civilização.

22. Educação Religiosa
Templos podem atuar como:
bibliotecas;
escolas;
hospitais;
abrigos.
Sua função social varia conforme a tradição.

23. Virtudes
As religiões tendem a incentivar virtudes como:
humildade;
justiça;
coragem;
misericórdia;
esperança;
disciplina;
honestidade.
Cada tradição enfatiza algumas delas.

24. Pecado
O conceito de pecado não é universal.
Cada religião interpreta de maneira diferente aquilo que considera uma ruptura da Ordem da Criação.

25. Conversão
Mudanças de crença são possíveis.
Elas devem ocorrer por:
convivência;
estudo;
experiências;
acontecimentos históricos.
Nunca apenas por conveniência mecânica.

26. Templos
Templos não são apenas locais de oração.
Podem oferecer:
abrigo;
alimentação;
ensino;
cuidados;
preservação histórica.

27. Arquivos Sagrados
As religiões preservam:
manuscritos;
mapas;
genealogias;
relatos;
crônicas.
Muitas informações sobre a história antiga sobrevivem graças a esses arquivos.

28. Debates Teológicos
Mesmo dentro de uma mesma religião podem existir correntes diferentes.
Isso evita instituições monolíticas.

29. A Busca Pela Verdade
Nenhuma religião alcança completamente a Verdade.
Mas todas contribuem para que o jogador monte esse grande quebra-cabeça ao longo da exploração.

30. Filosofia Oficial das Religiões
As religiões de Elysia existem para enriquecer:
a narrativa;
as culturas;
a política;
a exploração;
a filosofia do mundo.
Elas não existem para confirmar ao jogador toda a cosmologia.
O conhecimento absoluto permanece exclusivo da Lore Bible.

APÊNDICE — DEZ PRINCÍPIOS DA FÉ EM ELYSIA
A fé nasce da interpretação.
Nenhuma religião possui toda a verdade.
Milagres não quebram as leis da Criação.
Magia e fé são conceitos distintos.
Religiões evoluem com a história.
Ordens preservam tradições específicas.
Lugares sagrados possuem contexto histórico.
Arquivos religiosos preservam parte da memória do mundo.
A Corrupção pode deformar instituições religiosas.
O jogador descobre a verdade reunindo fragmentos espalhados pelo mundo.

O que este lote resolve
Este capítulo consolida a arquitetura de todas as religiões, ordens e tradições espirituais de Elysia sem definir ainda as denominações específicas. Com ele, ficam resolvidas conceitualmente as pendências sobre funcionamento das religiões, relação entre fé e magia, natureza dos milagres e papel das ordens religiosas, restando como conteúdo futuro apenas a criação de religiões individuais, seus símbolos, profetas, textos sagrados e ritos particulares.
Perfeito. Registrado como APROVADO.
✔ Cosmologia Definitiva
✔ Atlas Oficial
✔ Civilizações
✔ Religiões

Na minha visão, agora chegamos ao documento que realmente transforma Elysia em um universo "vivo".
Até agora definimos:
como o universo funciona;
como o mundo funciona;
como as sociedades funcionam.
Agora precisamos definir como a história acontece.
Este será um dos documentos mais importantes do GDD.

LOTE CANÔNICO 5 — HISTÓRIA, TEMPO E MEMÓRIA DO MUNDO
PROPOSTA
Este capítulo estabelece como o tempo, a história e a memória coletiva funcionam em Elysia. Ele complementa diretamente a cosmologia, a exploração e a Crônica do Mundo já aprovadas.

1. O Tempo
O tempo é uma das Leis Fundamentais da Criação.
Ele segue apenas uma direção.
Não existem viagens temporais capazes de alterar acontecimentos históricos.
A história não pode ser reescrita.

2. A História é Única
Existe apenas uma História Verdadeira.
Entretanto,
ninguém conhece essa história completamente.
Cada povo preserva apenas parte dela.

3. A História é Fragmentada
Os acontecimentos antigos chegaram ao presente através de:
livros;
ruínas;
inscrições;
tradições orais;
artefatos;
religiões;
canções;
monumentos.
Nenhuma fonte é perfeita.

4. Fontes Históricas
Toda informação histórica pertence a uma categoria.
Registro oficial.
Crônica.
Relato oral.
Lenda.
Mito.
Diário.
Inscrição.
Memória do Aether.
Cada uma possui diferentes níveis de confiabilidade.

5. Mitos
Todo mito pode conter:
verdade;
exagero;
erro;
simbolismo.
O jogador nunca deve assumir que um mito é totalmente verdadeiro ou totalmente falso.

6. Lendas
Lendas normalmente descrevem pessoas reais.
Porém,
ao longo dos séculos,
seus feitos tendem a ser exagerados.

7. Memória Coletiva
Sociedades escolhem o que preservar.
Também escolhem o que esquecer.
O esquecimento pode ser:
natural;
político;
religioso;
cultural.

8. Destruição da História
Bibliotecas queimam.
Templos caem.
Impérios desaparecem.
A perda de conhecimento faz parte da evolução do mundo.

9. Descobertas
Novas escavações,
ruínas
ou manuscritos
podem alterar a compreensão histórica das civilizações.
Sem alterar a Verdade Absoluta.

10. Memórias do Aether
Em circunstâncias extremamente raras,
o Aether pode preservar ecos de acontecimentos passados.
Essas memórias não são viagens no tempo.
São registros residuais da própria Criação.
Seu alcance permanece limitado, em linha com a pendência existente sobre o tema.

11. Cronologia
Toda narrativa oficial utiliza uma cronologia única.
Ela organiza:
Eras;
Grandes Guerras;
Fundação de Reinos;
Descobertas;
Catástrofes.

12. Eras
A história divide-se em grandes períodos.
Cada Era representa uma mudança profunda na evolução do mundo.
A quantidade, nomes e duração das Eras serão definidos posteriormente.

13. Eventos Históricos
Um evento torna-se histórico quando altera permanentemente o mundo.
Exemplos:
nascimento de um reino;
queda de um império;
descoberta de uma Relíquia;
fim de uma guerra.

14. Personagens Históricos
Alguns indivíduos tornam-se referência para gerações futuras.
Eles influenciam:
política;
religião;
cultura;
ciência;
guerra.
Sua importância decorre de seus atos, não de um destino predeterminado.

15. Civilizações Perdidas
Nem todas as civilizações sobrevivem.
Algumas desaparecem completamente.
Outras deixam apenas:
ruínas;
artefatos;
inscrições;
lendas.

16. Conhecimento Perdido
Nem todo conhecimento antigo permanece acessível.
Algumas técnicas,
rituais
e construções
foram definitivamente perdidos.
Isso abre espaço para arqueologia e redescobertas.

17. Bibliotecas
Bibliotecas são centros de preservação histórica.
Podem guardar:
mapas;
manuscritos;
tratados;
genealogias;
registros políticos.

18. Arquivistas
Cronistas,
monges,
escribas
e estudiosos dedicam suas vidas à preservação da memória.

19. Monumentos
Monumentos existem para lembrar.
Cada monumento responde:
quem;
quando;
por quê.

20. História e Exploração
Explorar significa recuperar partes esquecidas da história.
A narrativa não está concentrada apenas nas Quests.
Ela também está distribuída pelo próprio mundo.

21. História e Gameplay
Conhecimento histórico pode desbloquear:
regiões;
diálogos;
missões;
artefatos;
Relíquias.
Aprender também representa progressão.

22. Verdades Inconvenientes
Algumas descobertas entram em conflito com crenças estabelecidas.
Essas revelações podem alterar:
relações entre facções;
religiões;
reputações;
políticas.

23. Reescrita Histórica
Governantes podem tentar apagar acontecimentos.
Isso altera documentos.
Não altera a Verdade.

24. Arqueologia
A arqueologia busca compreender o passado.
Seu objetivo principal não é encontrar tesouros.
É reconstruir a história.

25. Memória dos Jogadores
As ações dos jogadores também integram a história do servidor.
Grandes acontecimentos entram para a Crônica do Mundo.
Esse princípio complementa o sistema já aprovado.

26. História Viva
O mundo continua produzindo história.
Ela não terminou antes do lançamento do jogo.
Cada servidor continua escrevendo novos capítulos.

27. A História Nunca Termina
Mesmo após grandes expansões,
a cronologia permanece aberta.
Novos eventos ampliam a história.
Nunca substituem o passado.

28. Coerência Histórica
Nenhum conteúdo futuro pode contradizer eventos já estabelecidos.
Quando novas informações surgirem,
elas devem ampliar a compreensão,
não reescrever acontecimentos.

29. Filosofia da Memória
A memória é um recurso precioso.
Conhecer o passado ajuda a compreender o presente
e prepara o futuro.

30. Filosofia Oficial da História
A história de Elysia deve ser descoberta,
não simplesmente explicada.
Cada ruína,
livro,
Relíquia,
personagem
e monumento representa uma peça de um enorme quebra-cabeça.

APÊNDICE — DEZ PRINCÍPIOS DA HISTÓRIA DE ELYSIA
Existe uma Verdade Histórica única.
Nenhum povo conhece toda essa verdade.
A história é preservada por fragmentos.
Mitos podem conter fatos reais.
O tempo não pode ser reescrito.
Exploração revela conhecimento.
Arqueologia reconstrói o passado.
Jogadores também produzem história.
Novas descobertas ampliam a compreensão do mundo.
O universo continua evoluindo sem perder sua coerência.

LOTE CANÔNICO 6 — FILOSOFIA DA NARRATIVA
PROPOSTA
Como complemento, este capítulo define como todas as histórias de Elysia devem ser escritas.
Princípios Narrativos
O mundo é o protagonista; o jogador é um de seus agentes.
Toda Quest deve revelar algo sobre pessoas, lugares ou acontecimentos.
NPCs possuem objetivos próprios, independentemente do jogador.
Antagonistas acreditam que suas ações têm justificativa.
O bem e o mal existem na cosmologia, mas muitos conflitos mortais surgem de interesses, medo, ambição ou diferenças culturais.
Pequenas histórias são tão importantes quanto grandes guerras.
Humor existe, mas não deve quebrar a identidade do mundo.
Tragédias devem ter consequências duradouras.
Esperança deve existir mesmo diante da Corrupção.
A exploração narrativa deve ser recompensada com conhecimento, não apenas com itens.
Filosofia Oficial da Narrativa
As histórias de Elysia não existem para conduzir o jogador por um roteiro fixo.
Elas existem para fazer o jogador sentir que entrou em um mundo antigo, complexo e vivo, onde cada descoberta amplia sua compreensão do universo, mas nunca revela todos os seus mistérios.

O que este lote resolve
Com estes dois capítulos, ficam consolidados os princípios de história, memória, cronologia e narrativa do universo. Permanecem para desenvolvimento posterior apenas os conteúdos específicos, como a cronologia detalhada das Eras, a sequência completa da Primeira Rebelião, os grandes impérios e personagens históricos individuais, todos já identificados como pendências de conteúdo no GDD.
VIDA EM ELYSIA (VERSÃO DEFINITIVA)
1. NPCs são fixos
Cada NPC possui um local definido.
Ele permanece ali permanentemente.
Não existem rotinas complexas.

2. Cada NPC possui uma função
Exemplos:
Ferreiro
Comerciante
Banco
Estalajadeiro
Alquimista
Carpinteiro
Capitão
Guarda
Sacerdote
Nada além disso é obrigatório.

3. Cidades possuem identidade
Cada cidade deve ser conhecida por alguma característica.
Exemplos:
cidade mineradora;
cidade portuária;
cidade agrícola;
cidade religiosa;
cidade militar.

4. NPCs importantes
Somente NPCs ligados à história possuem:
nome;
personalidade;
pequena biografia.
NPCs comuns apenas cumprem sua função.

5. Ambientação
A sensação de mundo vivo vem principalmente de:
arquitetura;
decoração;
música;
iluminação;
vegetação;
sons ambientes;
diálogos.
Não de IA complexa.

6. Diálogos
Cada NPC importante possui alguns diálogos próprios.
Eles ajudam a contar a história da cidade.
Não precisam mudar com frequência.

7. Comércio
Lojas são permanentes.
Os comerciantes sempre vendem os mesmos tipos de produtos.
Sem economia dinâmica.

8. Eventos
Durante eventos sazonais (Natal, Halloween, etc.) alguns NPCs podem receber decoração ou falas diferentes.
Fora isso, permanecem iguais.

9. Filosofia
O objetivo é criar um mundo consistente.
Não um simulador de vida.

10. Regra Oficial
Sempre que possível, utilizar sistemas fixos e previsíveis.
A complexidade deve estar na exploração, no combate, nas dungeons, nos bosses e na progressão do personagem, e não no comportamento dos NPCs.

Eu iria além.
Depois dessa conversa, eu criaria uma regra para o GDD inteiro:
Princípio da Implementação Simples
Sempre que uma funcionalidade puder ser implementada de forma fixa, ela deve ser preferida em relação a sistemas dinâmicos. O desenvolvimento deve priorizar robustez, facilidade de manutenção e baixo custo de implementação. Sistemas complexos só serão adotados quando trouxerem um ganho significativo de gameplay.
Acho que essa regra combina muito com um MMORPG feito por duas pessoas. Ela evita que o projeto cresça em complexidade sem entregar uma experiência proporcional ao jogador.
MORTE (VERSÃO DEFINITIVA)
1. Todo ser vivo possui uma alma.
2. A morte separa corpo e alma.
3. O destino da alma permanece um mistério.
Nenhuma civilização conhece essa resposta com certeza.
4. Espíritos e mortos-vivos existem.
São fenômenos raros e excepcionais.
5. A Corrupção pode afetar tanto vivos quanto mortos.
6. Não existe ressurreição.

Isso ocupa meia página em vez de vinte e deixa muito mais espaço para o jogador interpretar o mundo.
Na minha opinião, essa versão é mais forte narrativamente justamente porque não responde tudo. O desconhecido costuma ser mais interessante do que uma explicação rígida sobre o pós-vida.
LOTE CANÔNICO 9 — O REINO DE ASTERIA
PROPOSTA
Este capítulo define apenas o reino onde o jogador inicia a aventura. Não precisamos criar todos os reinos do continente agora.

1. Reino Inicial
Asteria é o reino inicial de Elysia Online.
É nele que a maior parte dos novos jogadores começa sua jornada.

2. Reino Humano
Asteria é um reino predominantemente humano.
Outras raças podem existir como visitantes, comerciantes ou habitantes específicos, mas os humanos são maioria.

3. Governo
Asteria é governada por um Rei.
Abaixo dele existem:
Governadores;
Capitães da Guarda;
Prefeitos das cidades.
Estrutura simples e fácil de expandir.

4. Lei
As cidades seguem as leis do reino.
Crimes são combatidos pela Guarda.
Fora das cidades, o mundo é mais perigoso e a proteção é limitada.

5. Economia
A economia baseia-se em:
agricultura;
mineração;
comércio;
artesanato.
Não existe simulação econômica complexa.

6. Defesa
A Guarda protege:
cidades;
estradas principais;
fortalezas.
Regiões remotas dependem dos aventureiros.

7. Religião
Asteria permite diferentes religiões reconhecidas pelo reino.
Nenhuma controla o governo.

8. Magia
A magia é conhecida e aceita.
Não é proibida, mas seu uso indevido pode ser tratado como crime.

9. Aventureiros
Os aventureiros fazem parte da sociedade.
Exploram ruínas, enfrentam monstros e ajudam a manter as fronteiras seguras.

10. Filosofia
Asteria deve transmitir a sensação de um reino estável, mas cercado por perigos.
É um ponto de partida, não o centro do mundo.

PRINCÍPIOS DE ASTERIA
É o reino inicial.
É predominantemente humano.
Possui governo simples.
Possui leis claras.
A Guarda protege as cidades.
A magia é aceita.
A religião não governa o reino.
A economia é tradicional.
Os aventureiros fazem parte da sociedade.
O reino é apenas uma parte do mundo de Elysia.

O que este lote resolve
Ele responde às principais pendências sobre o papel de Asteria e a organização política básica dos humanos, sem criar dezenas de cargos, nobres ou sistemas administrativos desnecessários. O restante — capital, regiões, exércitos, ordens de classe e culturas regionais — pode ser desenvolvido depois, quando cada área do mapa for construída.

LOTE CANÔNICO 10 — O CONTINENTE DE ASTERIA
PROPOSTA
1. Continente Inicial
Asteria é o único continente disponível no lançamento do jogo.

2. Mundo Contínuo
Todo o continente é conectado.
Não existem telas de carregamento entre regiões.

3. Exploração
O jogador deve viajar pelo mundo.
Explorar faz parte da progressão.

4. Biomas
O continente possui diferentes biomas, como:
florestas;
planícies;
montanhas;
pântanos;
desertos;
regiões geladas;
litoral.
Cada bioma possui identidade própria.

5. Estradas
As principais cidades são ligadas por estradas.
Sair delas torna a viagem mais perigosa, mas pode revelar recursos, monstros e locais secretos.

6. Cidades e Vilas
O continente é formado por:
cidades;
vilas;
castelos;
dungeons;
pontos de interesse.
Cada local possui uma função própria.

7. Exploração recompensa
O jogador deve ser recompensado por explorar.
Locais escondidos podem conter:
baús;
cavernas;
chefes;
recursos;
quests;
passagens secretas.

8. Expansões
Novos continentes poderão ser adicionados futuramente.
Nenhuma expansão substituirá Asteria.

9. Filosofia
O mundo deve incentivar viagens e descobertas.
O mapa é parte do gameplay.

PRINCÍPIOS DE ASTERIA
Um continente no lançamento.
Mundo contínuo.
Exploração é essencial.
Biomas distintos.
Estradas conectam as regiões.
Cidades e vilas possuem funções diferentes.
Explorar sempre vale a pena.
Expansões adicionam novos continentes.
Asteria continua relevante durante toda a vida do jogo.

Esse capítulo é pequeno, mas serve como base para os próximos, que serão:
Reinos de Asteria;
Cidades;
Vilas;
Biomas;
Estradas;
Dungeons.
Assim cada sistema fica independente e fácil de implementar, sem precisar redesenhar o mapa depois.
Perfeito. Aprovado.
Agora começamos a descer um nível na construção do mundo. Como Asteria já está definida como continente inicial, o próximo passo natural é definir como os reinos funcionam. O próprio material deixa isso como uma etapa separada.

LOTE CANÔNICO 11 — OS REINOS DE ASTERIA
PROPOSTA
1. Organização
O continente de Asteria é dividido em vários reinos independentes.
Nenhum reino controla todo o continente.

2. Governo
Cada reino possui seu próprio governo.
A forma de governo pode variar entre os reinos.

3. Identidade
Todo reino deve possuir uma identidade clara.
Exemplos:
militar;
comercial;
agrícola;
minerador;
religioso.
Evitar reinos que pareçam iguais.

4. Capital
Cada reino possui apenas uma capital.
É nela que ficam:
governo;
principais serviços;
comércio.

5. Cidades
As cidades pertencem a um reino.
Cada cidade possui uma função econômica ou estratégica.

6. Vilas
As vilas dão suporte às cidades.
São menores e voltadas para produção, descanso e exploração.

7. Castelos
Os castelos protegem regiões importantes.
Alguns podem ser conquistados por guildas.

8. Relações
Os reinos podem manter:
alianças;
rivalidades;
comércio.
Essas relações fazem parte da história do mundo.

9. Filosofia
Cada reino deve parecer único.
O jogador deve reconhecer um reino por sua arquitetura, cultura e ambiente.

PRINCÍPIOS DOS REINOS
Asteria possui vários reinos.
Nenhum domina todo o continente.
Cada reino possui identidade própria.
Cada reino possui uma capital.
Cidades têm funções específicas.
Vilas apoiam as cidades.
Castelos protegem regiões estratégicas.
Relações entre reinos fazem parte da lore.
Todo reino deve ser diferente dos demais.

O que este lote resolve
Ele estabelece a estrutura política do continente sem definir nomes, fronteiras ou histórias individuais. Isso permite criar cada reino futuramente, mantendo um padrão único de documentação e evitando retrabalho. Essa separação também está alinhada com a estrutura prevista na documentação dos reinos de Asteria.

LOTE CANÔNICO 12 — AS CIDADES DE ELYSIA
PROPOSTA
1. Função
As cidades são os principais centros urbanos de Elysia.
Elas concentram serviços, comércio e segurança.

2. Identidade
Cada cidade deve possuir uma identidade própria.
Exemplos:
cidade portuária;
cidade mineradora;
cidade agrícola;
cidade comercial;
cidade militar.
Evitar cidades genéricas.

3. Serviços
Cada cidade pode oferecer apenas os serviços compatíveis com sua importância.
Nem toda cidade precisa possuir todos os NPCs ou edifícios.

4. Segurança
As cidades são protegidas por guardas.
A ordem é mantida dentro dos seus limites.

5. Comércio
Cada cidade participa da economia do continente.
Sua produção depende da região onde está localizada.

6. Arquitetura
Cada cidade deve possuir arquitetura própria, coerente com:
clima;
cultura;
recursos locais;
história.

7. Expansão
Novas cidades poderão ser adicionadas em futuras expansões.
Sempre respeitando a geografia e a cronologia do mundo.

8. Filosofia
As cidades devem parecer vivas pela sua arquitetura, localização e função, e não pela quantidade de NPCs.

PRINCÍPIOS DAS CIDADES
São centros urbanos.
Cada cidade possui identidade própria.
Nem toda cidade oferece todos os serviços.
Guardas mantêm a ordem.
A economia depende da região.
A arquitetura reflete a cultura local.
Novas cidades podem surgir em expansões.
Qualidade é mais importante que quantidade.

Regra de Design
Adicionaria uma regra baseada nas decisões que já tomamos durante o projeto:
Poucas cidades, bem construídas.
É preferível possuir um número reduzido de cidades memoráveis, com personalidade própria e boa distribuição de serviços, do que dezenas de cidades semelhantes. A sensação de um mundo grande deve vir da exploração, das estradas, dos biomas e dos jogadores, não da quantidade de centros urbanos.
Essa regra combina com outra decisão já aprovada anteriormente: limitar a quantidade de NPCs (por exemplo, cerca de 15 NPCs na vila inicial e 60 NPCs na principal cidade), fazendo com que cada NPC tenha uma função real em vez de existir apenas para preencher espaço.

LOTE CANÔNICO 13 — AS VILAS DE ELYSIA
PROPOSTA
1. Função
As vilas servem como pontos de apoio para os aventureiros.

2. Tamanho
São menores que as cidades.
Possuem apenas os serviços essenciais.

3. Economia
Cada vila possui uma atividade principal.
Exemplos:
agricultura;
pesca;
mineração;
madeira;
pecuária.

4. Segurança
Possuem poucos guardas.
Regiões afastadas são naturalmente mais perigosas.

5. Descanso
As vilas permitem ao jogador:
descansar;
negociar;
reabastecer;
organizar a próxima viagem.

6. Identidade
Cada vila deve refletir o bioma onde está localizada.

PRINCÍPIOS DAS VILAS
São pequenas.
Possuem poucos NPCs.
Oferecem apenas serviços essenciais.
Têm uma economia própria.
Servem como apoio à exploração.

LOTE CANÔNICO 14 — ESTRADAS
PROPOSTA
1. Conexão
As estradas ligam vilas, cidades, portos e castelos.

2. Segurança
As estradas principais são relativamente seguras.
Quanto mais distante delas, maior o perigo.

3. Exploração
Atalhos, cavernas e locais secretos podem existir fora das estradas.

4. Filosofia
Seguir a estrada é mais seguro.
Explorar fora dela é mais recompensador.

PRINCÍPIOS DAS ESTRADAS
Ligam os principais locais.
São as rotas mais seguras.
Incentivam exploração ao redor.

LOTE CANÔNICO 15 — PONTOS DE INTERESSE
PROPOSTA
1. Definição
São locais que despertam curiosidade durante a exploração.

2. Exemplos
ruínas;
cavernas;
torres;
pontes antigas;
templos;
lagos;
cachoeiras;
acampamentos;
cemitérios;
monumentos.

3. Conteúdo
Podem conter:
NPCs;
monstros;
chefes;
recursos;
baús;
quests.
Nem todo ponto precisa ter combate.

4. Descoberta
O jogador deve encontrar esses locais explorando, e não apenas seguindo missões.

PRINCÍPIOS
Recompensam a curiosidade.
Tornam o mapa memorável.
Nem todo local precisa ter combate.
Devem incentivar exploração.

Esses três capítulos formam a base da World Bible. Depois deles, começamos a entrar na parte mais divertida do projeto:
Biomas;
Recursos naturais;
Fauna e flora;
Famílias de monstros;
Dungeons;
Chefes regionais.
É a partir daí que o mundo realmente começa a ganhar personalidade.

LOTE CANÔNICO 16 — BIOMAS
PROPOSTA
1. Função
Os biomas definem a identidade natural de cada região.

2. Identidade
Cada bioma deve possuir:
clima próprio;
vegetação própria;
recursos próprios;
fauna própria;
monstros próprios.

3. Progressão
Os biomas não precisam seguir obrigatoriamente uma ordem de dificuldade.
Uma floresta pode ser muito mais perigosa que um deserto.

4. Transição
A passagem entre biomas deve acontecer de forma natural.
Evitar mudanças bruscas de ambiente.

5. Exploração
Cada bioma deve possuir locais únicos para incentivar novas explorações.

BIOMAS OFICIAIS
Florestas
Planícies
Montanhas
Pântanos
Desertos
Regiões Geladas
Litoral
Ilhas
Novos biomas poderão ser adicionados em futuras expansões.

PRINCÍPIOS
Cada bioma possui identidade própria.
Recursos exclusivos incentivam exploração.
Monstros devem combinar com o ambiente.
A dificuldade depende do conteúdo, não do bioma.
As transições devem ser naturais.

LOTE CANÔNICO 17 — RECURSOS NATURAIS
PROPOSTA
1. Distribuição
Os recursos naturais são distribuídos pelo continente de forma desigual.

2. Objetivo
A distribuição incentiva:
exploração;
comércio;
profissões;
viagens.

3. Categorias
Os principais recursos são:
madeira;
pedra;
minérios;
ervas;
peixes;
couros;
cristais.

4. Exclusividade
Alguns recursos existem apenas em determinados biomas.

PRINCÍPIOS
Nenhuma região possui tudo.
Explorar vale a pena.
O comércio faz parte da economia.
Recursos seguem a lógica do ambiente.

LOTE CANÔNICO 18 — FAUNA E FLORA
PROPOSTA
1. Coerência
Animais e plantas devem existir onde fariam sentido.

2. Variedade
Cada bioma possui sua própria fauna e flora.

3. Utilidade
Animais e plantas podem fornecer materiais para:
profissões;
culinária;
alquimia;
equipamentos.

4. Imersão
Nem toda criatura precisa existir apenas para combate.
O mundo deve conter vida além dos monstros.

PRINCÍPIOS
Coerência ecológica.
Variedade entre biomas.
Utilidade para gameplay.
Mundo vivo sem sistemas complexos.

Esses três capítulos fecham praticamente toda a base ambiental do jogo. Depois disso começamos a construir o conteúdo que o jogador realmente enfrenta:
Famílias de criaturas (feras, mortos-vivos, insetos, demônios, etc.);
Elementos;
Resistências e fraquezas;
Dungeons;
Chefes regionais.
Na minha visão, é aí que o Elysia começa a ganhar sua identidade como MMORPG.