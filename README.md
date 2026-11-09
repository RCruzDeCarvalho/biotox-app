# Stocks BIOTOX

Versão instalável da app de reagentes e consumíveis do Laboratório de Biomonitorização e Ecotoxicologia (BIOTOX).

A app em si corre no Google Apps Script e lê a folha "Reagentes BIOTOX - base de dados". Esta página só a mostra em ecrã inteiro e permite instalá-la no telemóvel ou no computador.

- **Mudar o link da app**: editar `config.js`.
- **Android**: abrir no Chrome › menu ⋮ › Instalar app.
- **iPhone**: abrir no Safari › Partilhar › Adicionar ao ecrã principal.

## Código do Apps Script

A pasta `gas/` tem o código da app (Code.gs, Index.html e appsscript.json). Cada alteração enviada para esta pasta é publicada automaticamente no Apps Script, numa nova versão da implantação da app, pelo workflow "Publicar no Apps Script". Os códigos de acesso não estão no repositório: vêm dos secrets `CODIGO_LAB` e `CODIGO_CONSULTA`.
