# Ecossistema Center Ônibus

Portal de módulos internos da **Center Ônibus**. Cada peça da operação vira um
módulo aqui dentro. Tudo roda no navegador — site estático, sem servidor, sem
banco. Nenhum dado de funcionário ou de cliente sai do computador de quem usa.

Feito pela [Commet](https://commet.pro).

---

## O que está no ar

| Categoria | Módulo | Rota |
| :-- | :-- | :-- |
| Marca e Marketing | Cartão de visita | `/marketing/cartao/` |
| Marca e Marketing | Crachá | `/marketing/cracha/` |
| Marca e Marketing | Validador de crachá | `/marketing/validador/` |
| — | Validação pública (destino do QR) | `/v/` |

As categorias **Comercial**, **Pessoas** e **Operações** já aparecem no portal
com os módulos previstos marcados como *em breve*. O roadmap fica visível para
quem abre o site, e cada módulo novo é só uma pasta a mais.

---

## Publicar

O site é servido da **raiz do repositório**. Em *Settings → Pages*, apontar para
a branch `main`, pasta `/ (root)`. O `.nojekyll` já está lá para o GitHub não
tentar processar nada.

Para servir localmente:

```bash
python3 -m http.server 8000     # abre em http://localhost:8000
```

---

## Como isso é construído

O HTML **não é escrito à mão** — é gerado. Para mexer em qualquer página, mexa
no `build/` e rode o build de novo:

```bash
python3 build/build.py
```

```
build/
  core.py                marca, paleta, CSS e JS compartilhados, catálogo de módulos
  portal.py              a página inicial, com as categorias
  mod_cartao.py          \
  mod_cracha.py           >  um arquivo por módulo
  mod_validador.py       /
  validador_publico.py   a página /v, destino do QR
  build.py               roda todos
  chave-publica.json     só a chave pública (a privada nunca entra aqui)
  montadoras.json        os logos das carroçarias, já posicionados
```

Fonte, biblioteca e arte da marca ficam em `assets/` e **não são regeradas** —
o build só escreve o que é código. Por isso as páginas são pequenas (3 a 44 KB)
e o navegador guarda o resto em cache.

### Acrescentar um módulo

1. `build/mod_<nome>.py` com uma função `build()`
2. registrar o módulo em `CATEGORIAS`, no `core.py`
3. somar à lista `MODULOS` do `build.py` e rodar

O `base.js` já cuida de prévia, lista, margens e impressão — o módulo só
descreve os campos e as faces em SVG.

---

## A marca

Tudo segue o **Manual de Marca v1.0 (agosto/2026)**. As artes em `assets/marca/`
são **recortadas do manual**, nunca redesenhadas: o que se fez foi remover o
fundo chapado (ver `marca/prep_assinatura.py` e `marca/prep.py`).

Reduções mínimas, respeitadas em código com `assert`:

| Versão | Mínimo | Onde |
| :-- | :-- | :-- |
| assinatura completa (com descritor) | 30 mm | — |
| assinatura reduzida (sem descritor) | 20 mm | cartão 46/28 mm · crachá 32 mm no verso |
| símbolo isolado | 8 mm | crachá 13,5 mm na tarja da frente |

Regras do manual que valem para qualquer peça nova: nunca recriar a assinatura,
nunca redigitar o nome, nunca reaplicar degradê ou sombra, um vermelho por peça,
uma diagonal por peça, não aplicar sobre foto sem tarja.

**Pendência:** o manual diz que existe vetor mestre, mas o que chegou foi o PDF
raster. Para cartão e crachá sobra (a assinatura sai acima de 600 dpi). Para
bordado, serigrafia e frota, pedir o vetor à Center.

---

## A chave do crachá

O QR do verso carrega `NOME|CARGO|MM/AAAA` assinado em **Ed25519**. O validador
confere com a chave pública — a conferência é matemática e local, funciona no
modo avião e continua funcionando daqui a dez anos sem depender de servidor.

**A chave privada não está neste repositório e não pode estar.** O site é
público: se a chave estivesse aqui, qualquer pessoa emitiria crachá válido e a
validação perderia o sentido.

Como funciona na prática:

- `build/chave-publica.json` — só a pública. Pode circular à vontade.
- Quem emite recebe `chave-emissao.json` por fora e **carrega no módulo Crachá**,
  uma vez por sessão. A chave fica **só na memória da aba**: não vai para disco,
  não vai para o servidor, e some ao fechar.
- Sem chave carregada, o QR não é gerado e a impressão fica travada.
- Se o arquivo não corresponder à chave pública do site, a página recusa.

Se a privada vazar: gerar um par novo, trocar `build/chave-publica.json`,
rodar o build e reemitir os crachás.

### Os dois limites que continuam valendo

1. **Quem tem a chave emite.** Enquanto o arquivo ficar com o RH, tudo bem. O
   passo seguinte é assinar num servidor — o formato do QR não muda.
2. **Assinatura não é revogação.** Desligamento não invalida o crachá antes do
   vencimento. Mitigação hoje: validade curta. Mitigação prevista: o módulo
   *Lista de revogados*, na categoria Pessoas.

**O CPF não entra no QR, de propósito.** Fica só impresso, para facilitar acesso
onde pedem documento. Quem escaneia vê nome, cargo e validade — não vê o CPF.

---

## Impressão

Os módulos de peça imprimem em dois modos:

- **Peça única** — uma face por página no tamanho exato, para a gráfica
- **Folha A4** — 10 cartões ou 9 crachás por folha, com marcas de corte, em
  folhas de frente e de verso já espelhadas para o duplex bater

Em ambos: *Margens: Nenhuma*, *Escala: 100 %*, *Gráficos de plano de fundo*
marcado.

---

## Licenças de terceiros

`assets/vendor/` traz três bibliotecas, todas embutidas e sem CDN:

| Arquivo | O que é | Licença |
| :-- | :-- | :-- |
| `qrcode.js` | gerador de QR, de Kazuhiko Arase | MIT |
| `nacl-fast.min.js` | TweetNaCl, assinatura Ed25519 | domínio público |
| `jsQR.js` | leitura de QR pela câmera | Apache 2.0 |

Tipografia: **Archivo Condensed** e **Inter**, ambas SIL Open Font License.

Os logos das carroçarias na frente do cartão são marcas de terceiros, usadas
com autorização informada pela Center Ônibus.
