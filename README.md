# Ecossistema Center Ônibus

Portal da Center Ônibus, por Commet. Cartão de visita, crachá, validação pública,
editor de e-mail e assistente de conteúdo com pesquisa na web.

## Login e equipe (v3.1)

Blog e agendamento ficam em `/marketing/assistente/`. A conexão do catálogo do
Mercado Livre tem tela independente em `/marketing/mercado-livre/`, acessível
pelo cartão da categoria Comercial. Os controles e scripts são separados.

A entrada é `/login/`, com Netlify Identity oficial, recuperação de senha e
aceitação de convite. O cadastro deve permanecer **Invite only**, com confirmação
de e-mail obrigatória, no painel Identity do Netlify. Convites e recuperações
são concluídos pela própria pessoa; nenhuma senha deve ser enviada pela equipe.

`CENTER_MEMBERS_JSON`, no ambiente privado production, contém nome, e-mail,
`roles` e `active` dos usuários autorizados. O servidor confere a lista em cada
requisição: autenticação válida de um e-mail não cadastrado não dá acesso ao app.
Administradores também podem ser definidos em `CENTER_ADMIN_EMAILS` (e-mails
separados por vírgula, somente no contexto production). Essa configuração inclui
ou reativa os e-mails explicitamente informados com papel `admin`, preservando a
lista privada da equipe. Não cria login e não dispensa confirmação do e-mail:
a pessoa precisa aceitar um convite do Identity e definir a própria senha.
Para revogar esse acesso adicional, remova o e-mail dessa variável; confira
também se a lista `CENTER_MEMBERS_JSON` concede acesso ou papel administrativo.
Papéis gravados no JWT pelo evento de signup entram em vigor no próximo login
ou refresh do token; o app não confia em permissões de `user_metadata`.

As páginas internas são servidas por uma função autenticada com `Cache-Control:
private, no-store`, inclusive acesso direto ao HTML. `/v/` e `/blog/` permanecem
públicos. A sessão oficial renova o token automaticamente. Acesso técnico Commet
continua disponível com a credencial administrativa existente e cookie HttpOnly,
Secure, SameSite=Strict, com validade de uma hora e revogação pelo registro do
operador. Ela não deve ser compartilhada com a equipe.

Impressões, inclusão/remoção na lista, exportações, emissões e ações de IA ficam
na auditoria com pessoa, data/hora e IP observado pelo Netlify. Cada QR novo contém uma referência aleatória única que aponta para o registro
daquela emissão, inclusive quando os dados do funcionário se repetem. Crachás
antigos sem referência continuam sendo validados. A emissão também
exige coordenadas e precisão do navegador. Eventos de impressão/exportação
registram a solicitação, não comprovam a impressão física ou o download concluído.
O app ainda não implementa cadastro permanente de funcionários nem revogação
individual de crachás. A localização registra um ponto, não acompanha trajetos.

Para build completo: `npm ci` e `npm run build`. Em Windows sem alias python3,
rode `node build/assets.mjs` e `python build/build.py`. Identity deve ser validado
em um deploy real; não funciona no servidor estático local.

## Produção no Netlify

O autodeploy usa a branch `main`. O domínio do portal é
`https://intranet.centeronibus.com.br`. O build publica `dist/` e as funções em
`netlify/functions/`, com Node 24 e a biblioteca oficial `@netlify/blobs`.

As funções oferecem emissão rastreada, auditoria, configuração de IA e blog.
Os dados ficam no Netlify Blobs com consistência forte, separados de previews.
Configure `BADGE_SECRET_B64`, `OPERATORS_JSON`, `SETTINGS_KEY`, `PUBLIC_ORIGIN`
e `CENTER_ENV=production` como variáveis privadas do site no contexto production.
Nunca coloque esses valores no repositório ou na pasta `dist`.

A pesquisa de IA roda em uma Background Function. O painel acompanha o trabalho;
se fechar a aba, o processamento continua e o artigo aparece ao atualizar a lista.
A função agendada verifica a hora de Brasília a cada hora e inicia no máximo uma
geração diária, com trava atômica contra duplicação. A agenda fica desativada até
o administrador conectar a API e habilitá-la. Trabalhos falhos não são repetidos
automaticamente; consulte a auditoria antes de tentar novamente. Execuções manuais
são limitadas a uma por minuto por operador. A busca também evita títulos repetidos.

No Netlify, não se usa o SQLite local nem um processo Node sempre ligado. O modo
local descrito abaixo continua disponível para desenvolvimento. Os limites de
instância única/disco do modo local não se aplicam ao adaptador do Netlify.

## Executar

Requer Node.js 24 ou superior e Python 3 para gerar as páginas. Para as funções
do Netlify, instale as dependências com `npm ci`.

```sh
python build/build.py
node server/create-access.mjs rafa admin
```

O segundo comando gera uma credencial individual e seu hash, além de uma chave
para criptografar a configuração da IA. Entregue a credencial por canal privado;
coloque somente o registro com hash em `OPERATORS_JSON`. Copie `.env.example`
para `.env`, preencha os valores e execute:

```sh
node --env-file=.env server/index.mjs
```

Abra http://localhost:8000. Em produção, configure `PUBLIC_ORIGIN`, use HTTPS,
um processo supervisionado e armazenamento persistente privado para `DATA_DIR`.
A API e as páginas devem ficar na mesma origem. O servidor só disponibiliza
as páginas e os ativos permitidos; `.env`, servidor, fontes e banco ficam privados.

## Chave do crachá

A chave **pública de validação** está em `build/chave-publica.json`:

`3wl9XPhQhpsfGkBQan0wfHKDCknCGqxFeKiQJ5jw0mc`

Ela valida assinaturas Ed25519 e não permite emitir. A **privada de emissão** é
o campo `sec_b64` do arquivo `chave-emissao.json`, entregue ao RH fora do
repositório. O repositório versionado não contém esse arquivo, e a privada não pode ser
recuperada a partir da pública. Configure seu valor em `BADGE_SECRET_B64` no
servidor, nunca no HTML ou GitHub. O servidor verifica se o par corresponde.

O módulo Crachá agora usa uma credencial por operador, com papel `issuer` ou
`admin`. A assinatura acontece exclusivamente na API, antes da impressão. Cada
emissão registra horário UTC do servidor, operador, IP observado, navegador,
latitude, longitude, precisão e hash dos dados assinados. O CPF e a foto não são
enviados. A localização exige permissão e HTTPS (localhost também funciona);
se for recusada, a emissão é bloqueada. O painel de auditoria exibe Brasília.

IP é o endereço observado pelo servidor, normalmente público/NAT, não o IP da
rede local do computador. Coordenadas do navegador podem ser simuladas: são
rastros, não prova de identidade. A autorização vem da credencial individual.
Remova o operador de `OPERATORS_JSON` e reinicie para revogar acesso. Credenciais
são equivalentes a senhas; não compartilhe. Não ficam em armazenamento local.

`TRUST_PROXY=true` só é seguro quando o proxy sobrescreve `X-Real-IP` e impede
conexões diretas ao Node. Por padrão, cabeçalhos enviados pelo cliente são ignorados.

Crachás CO1 existentes continuam válidos. A validação é pública, local, sem
chave privada e sem rastrear visitantes. A assinatura não comprova vínculo
atual nem implementa revogação por funcionário. **Quem ainda tiver a antiga
chave privada consegue assinar por fora da API.** Para encerrar esse acesso,
rotacione o par, atualize `build/chave-publica.json`, configure a nova privada,
reconstrua e reemita os crachás. A rotação invalida assinaturas antigas; não foi
feita automaticamente. O arquivo privado nunca deve voltar ao navegador.

O QR novo aponta para `/v/` da origem atual. Para outro domínio, defina
`VALIDATOR_URL=https://seu-dominio/v/` durante o build. Preserve no domínio antigo
a rota de validação dos crachás já impressos.

## Assistente de conteúdo

Abra `/marketing/assistente/`. Um administrador conecta a chave OpenAI ou
Google AI Studio, escolhe o identificador de um modelo com pesquisa web,
define o tema e a hora diária em Brasília. A chave é criptografada com AES-256-GCM
no banco; `SETTINGS_KEY` é o segredo de 32 bytes base64 do servidor. Faça backup
dessa chave e do banco; perder a chave impede abrir as configurações antigas.

Papéis: `admin` configura e consulta auditoria; `editor` gera, lê e publica
artigos; `issuer` emite crachás. Um operador pode ter mais de um papel.

A integração usa [Responses + web_search da OpenAI](https://developers.openai.com/api/docs/guides/tools-web-search)
ou [Google Search grounding do Gemini](https://ai.google.dev/gemini-api/docs/google-search).
A conta de API é sua: o login do ChatGPT/Codex não fornece uma chave para o site.
O custo de pesquisas e geração será cobrado pelo provedor escolhido.

O agente pesquisa e salva título, descrição, parágrafos e fontes retornadas
pelo provedor. Sem fontes, a geração falha. Dados retornados são tratados como
texto e escapados na publicação. Conteúdo com alegações técnicas fica em
rascunho; a detecção depende do modelo, então não substitui revisão humana.
Não inventa estoque, preços, certificações ou compatibilidades no prompt.

A geração diária fica desativada até ser habilitada. A publicação automática
também é opcional; quando ativa, publica artigos classificados pelo modelo como
sem afirmações técnicas. O editor pode revisar e publicar rascunhos pelo painel.

O agendador verifica a cada minuto e reivindica uma execução por dia no banco.
Roda a partir da hora configurada, inclusive após reinício no mesmo dia. Falhas
ficam na auditoria e não são repetidas automaticamente naquele dia, para evitar
cobranças duplicadas; use “Pesquisar e criar agora” para tentar novamente.
A instância precisa permanecer ligada. Use apenas **uma instância** com disco
persistente; não é um serviço para múltiplas réplicas ou hospedagem serverless.

As publicações são HTML no servidor, em `/blog/`, com título, descrição,
canonical, Article JSON-LD, fontes, `/sitemap.xml` e `/robots.txt`.
Este repositório não contém o CMS do site principal da Center. Para que os
artigos estejam em centeronibus.com.br, instale este servidor no domínio ou
encaminhe `/blog/`, `/sitemap.xml` e `/robots.txt` para ele, adaptando robots e
sitemap existentes. Não há integração automática com outro CMS. SEO depende da
qualidade, descoberta e indexação; não há garantia de posicionamento.

## Build e publicação estática

As páginas são geradas em Python. Edite `build/` e rode `python build/build.py`.
O build escreve páginas na raiz e copia só páginas e ativos para `dist/`.
No Netlify, `dist` contém apenas páginas e ativos; o código de servidor é
empacotado separadamente nas funções, e os dados ficam no Blobs.
Uma publicação puramente estática oferece os materiais e a validação pública,
mas **não oferece emissão, auditoria, assistente nem blog dinâmico**.
Não publique a raiz do checkout em um servidor de arquivos genérico depois de
configurar segredos. Para todos os módulos, use o adaptador do Netlify ou o servidor Node local.

## Verificação

```sh
npm test
```

Os testes cobrem autenticação/revogação, assinatura Ed25519, obrigatoriedade de
localização, auditoria e IP, bloqueio de arquivos privados, configuração sem
exposição da chave, fontes de IA, sintaxe de páginas e validade dos crachás.
As integrações externas são simuladas: um teste real requer sua chave e saldo.

## Impressão e ativos

Cartões: 90 × 50 mm; crachás: 54 × 86 mm. Modos peça única e A4, com frente e
verso e marcas de corte. Imprima em 100%, sem margens, com fundos habilitados.
Fotos são mantidas por item da lista; aguarda fontes e imagens antes de imprimir.

As artes oficiais em `assets/marca/` são preservadas. Fontes Archivo Condensed
+ Inter (SIL OFL); QRCode (MIT), TweetNaCl (domínio público), jsQR (Apache 2.0).

## Operação e limites

Faça backup do SQLite e proteja o acesso ao disco. Auditoria é persistente, mas
não é imutável contra administradores do servidor. Defina a retenção dos registros
de IP/localização conforme a política da empresa. Não há MFA, geofencing,
revogação por funcionário ou integração com o CMS externo nesta versão.

Rotação realizada em 13/10/2026, autorizada por Rafa antes de qualquer emissão.
O novo par está configurado no `.env` local; publique as páginas regeneradas
e configure `BADGE_SECRET_B64` no ambiente de produção para efetivar a troca.
