import core as C

def build():
    with open(C.os.path.join(C.RAIZ, 'assets', 'marketplace.js'), 'rb') as source:
        version = C.hashlib.sha256(source.read()).hexdigest()[:12]
    corpo = '''<main class="portal" style="display:block">
<h1>Catálogo do Mercado Livre</h1>
<p>Conecte a conta vendedora para atualizar os produtos exibidos no site da Center Ônibus.</p>
<div class="panel" style="width:100%;max-width:none">
<p id="market-access" role="status" aria-live="polite">Carregando seu acesso…</p>
<section id="mercado-livre" data-role="admin" style="scroll-margin-top:90px" hidden>
<h2>Conexão e sincronização</h2>
<p>Conecte o aplicativo com a pessoa dona da conta vendedora. O site recebe fotos, preços e disponibilidade dos anúncios ativos a cada 15 minutos.</p>
<p id="meli-status" role="status" aria-live="polite">Carregando conexão…</p>
<p>URL de retorno para cadastrar no aplicativo: <code id="meli-callback"></code></p>
<label for="meli-client">App ID</label><input id="meli-client" inputmode="numeric" autocomplete="off">
<label for="meli-secret">Client Secret</label><input id="meli-secret" type="password" autocomplete="off">
<label for="meli-seller">ID do vendedor Center Ônibus</label><input id="meli-seller" inputmode="numeric" autocomplete="off">
<div class="row"><button id="meli-save">Salvar aplicativo</button><button id="meli-connect">Autorizar conta vendedora</button><button id="meli-refresh" class="ghost">Atualizar situação</button></div>
</section>
</div></main>'''
    C.escrever('marketing/mercado-livre/index.html', C.pagina('Catálogo do Mercado Livre — Center Ônibus', '../../', corpo, modulo_nome='Catálogo do Mercado Livre', js='''
const marketScript=document.createElement('script');marketScript.src=BASE+'assets/marketplace.js?v=MARKET_VERSION';document.body.append(marketScript);
'''.replace('MARKET_VERSION', version)))
