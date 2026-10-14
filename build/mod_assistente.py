import core as C

def build():
    corpo = '''<main class="portal" style="display:block">
<h1>Assistente de conteúdo</h1><p>Pesquisa com fontes para criar artigos úteis sobre peças de carroceria de ônibus. A geração automática segue o horário de Brasília. O posicionamento nas buscas depende da qualidade e da indexação do site.</p>
<div class="panel" style="width:100%;max-width:none"><h2>Acesso individual</h2>
<label for="access">Credencial autorizada</label><input id="access" type="password" autocomplete="off">
<div class="row"><button id="connect">Conectar</button><button id="logout" class="ghost">Sair</button></div>
<p id="ai-status" role="status" aria-live="polite">Conecte seu acesso para começar.</p>
<h2>Provedor e programação · administrador</h2>
<label for="provider">Provedor</label><select id="provider"><option value="openai">OpenAI</option><option value="google">Google AI Studio / Gemini</option></select>
<label for="model">Modelo com suporte a pesquisa</label><input id="model" placeholder="Identificador do modelo na API">
<label for="key">Chave de API (deixe vazio para manter a atual)</label><input id="key" type="password" autocomplete="off">
<label for="topic">Direção editorial e tema</label><textarea id="topic" rows="4" style="width:100%" placeholder="Ex.: critérios para escolher componentes de carroceria de ônibus"></textarea>
<label for="hour">Gerar diariamente a partir de (0–23h, Brasília)</label><input id="hour" type="number" min="0" max="23" value="9">
<p><label><input id="enabled" type="checkbox"> Ativar geração diária</label></p>
<p><label><input id="autoPublish" type="checkbox"> Publicar automaticamente artigos sem afirmações técnicas</label></p>
<p>Artigos com especificações ou compatibilidades ficam em rascunho para conferência. As chaves ficam criptografadas no servidor. O blog é publicado em <a href="/blog/">/blog/ deste domínio</a>.</p>
<div class="row"><button id="save">Salvar configuração</button><button id="load" class="ghost">Carregar configuração</button></div>
<h2>Artigos · editor</h2><div class="row"><button id="generate">Pesquisar e criar agora</button><button id="refresh" class="ghost">Atualizar lista</button></div><div id="articles"></div>
<h2>Rastreabilidade · administrador</h2><button id="audit">Consultar registros</button><pre id="audit-output" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
</div></main>'''
    C.escrever('marketing/assistente/index.html', C.pagina('Assistente de conteúdo — Center Ônibus', '../../', corpo, modulo_nome='Assistente de conteúdo', js='''
const accessScript=document.createElement('script');accessScript.src=BASE+'assets/access.js';accessScript.onload=()=>{const script=document.createElement('script');script.src=BASE+'assets/assistant.js';document.body.append(script);};document.body.append(accessScript);
'''))
