// O script inline do <head> que aplica o tema ANTES da primeira pintura — sem ele,
// quem escolheu o escuro vê um lampejo branco a cada carregamento.
// Origem: delp-visto@f66a6c3 index.html (o <script> logo depois do #root).
// Fica inline e minúsculo de propósito: um arquivo separado seria mais uma
// requisição na frente da pintura.
//
// A CHAVE mora aqui, e o src/lib/tema.ts a importa daqui: este arquivo é lido pelo
// layout raiz, que é componente de SERVIDOR, e não pode puxar um módulo com hooks.

/** A chave do localStorage com a escolha de tema. */
export const CHAVE_TEMA = "ascent.tema";

export const SCRIPT_TEMA = `(function () {
  try {
    var t = localStorage.getItem('${CHAVE_TEMA}') || 'sistema';
    if (t === 'sistema') {
      t = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    }
    document.documentElement.setAttribute('data-tema', t);
  } catch (e) {
    document.documentElement.setAttribute('data-tema', 'claro');
  }
})();`;
