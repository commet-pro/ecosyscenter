import core as C

def build():
    corpo = '''<main class="portal" style="display:block">
<h1>Assistente de conteúdo</h1><p>Pesquisa com fontes para criar artigos úteis sobre peças de carroceria de ônibus. A geração automática segue o horário de Brasília. O posicionamento nas buscas depende da qualidade e da indexação do site.</p>
<div class="panel" style="width:100%;max-width:none">
<p id="ai-status" role="status" aria-live="polite">Carregando seu acesso…</p>
<section data-role="admin" hidden>
<h2>Provedor e programação · administrador</h2>
<label for="provider">Provedor</label><select id="provider"><option value="openai">OpenAI</option><option value="google">Google AI Studio / Gemini</option></select>
<label for="model">Modelo com suporte a pesquisa</label><input id="model" placeholder="Identificador do modelo na API">
<label for="key">Chave de API (deixe vazio para manter a atual)</label><input id="key" type="password" autocomplete="off">
<label for="topic">Direção editorial e tema</label><textarea id="topic" rows="4" style="width:100%" placeholder="Ex.: critérios para escolher componentes de carroceria de ônibus"></textarea>
<label for="hour">Gerar diariamente a partir de (0–23h, Brasília)</label><input id="hour" type="number" min="0" max="23" value="9">
<p><label><input id="enabled" type="checkbox"> Ativar geração diária</label></p>
<p><label><input id="autoPublish" type="checkbox"> Publicar automaticamente artigos sem afirmações técnicas</label></p>
<p>Artigos com especificações ou compatibilidades ficam em rascunho para conferência. As chaves ficam criptografadas no servidor. Os artigos publicados aparecem automaticamente no <a href="https://centerbus.netlify.app/blog/" target="_blank" rel="noopener noreferrer">blog do site</a>.</p>
<div class="row"><button id="save">Salvar configuração</button><button id="load" class="ghost">Carregar configuração</button></div>
</section><section data-role="editor" hidden><h2>Artigos · editor</h2><div class="row"><button id="generate">Pesquisar e criar agora</button><button id="refresh" class="ghost">Atualizar lista</button></div><div id="articles"></div>
</section><section data-role="admin" hidden>
<h2>Catálogo do Mercado Livre</h2>
<p>Conecte o aplicativo com a pessoa dona da conta vendedora. O site recebe fotos, preços e disponibilidade dos anúncios ativos a cada 15 minutos.</p>
<p id="meli-status" role="status" aria-live="polite">Carregando conexão…</p>
<p>URL de retorno para cadastrar no aplicativo: <code id="meli-callback"></code></p>
<label for="meli-client">App ID</label><input id="meli-client" inputmode="numeric" autocomplete="off">
<label for="meli-secret">Client Secret</label><input id="meli-secret" type="password" autocomplete="off">
<label for="meli-seller">ID do vendedor Center Ônibus</label><input id="meli-seller" inputmode="numeric" autocomplete="off">
<div class="row"><button id="meli-save">Salvar aplicativo</button><button id="meli-connect">Autorizar conta vendedora</button><button id="meli-refresh" class="ghost">Atualizar situação</button></div>
</section><section data-role="admin" hidden><h2>Rastreabilidade · administrador</h2><label for="audit-reference">Referência da emissão (opcional)</label><input id="audit-reference" maxlength="16" placeholder="Cole a referência exibida ao validar o QR"><button id="audit">Consultar registros</button><div id="audit-output" style="overflow:auto"></div></section>
</div></main>'''
    C.escrever('marketing/assistente/index.html', C.pagina('Assistente de conteúdo — Center Ônibus', '../../', corpo, modulo_nome='Assistente de conteúdo', js='''
const assistantScript=document.createElement('script');assistantScript.src=BASE+'assets/assistant.js';document.body.append(assistantScript);
'''))
