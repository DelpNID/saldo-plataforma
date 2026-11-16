// Origem: delp-visto@f66a6c3 tailwind.config.js
// Desvios: `content` aponta só para src/ (não há index.html no Next); saem as
//   cores sem uso no Ascent (`tinta`, `mesa`, `marca-fundo`) — ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// tailwind.config.js — tokens de design DELP no Tailwind
//
// Este arquivo espelha as CSS variables do src/index.css em classes utilitárias
// (ex.: text-delp-red, bg-bg-2, rounded-card). Regra do projeto: nas telas,
// usar SEMPRE estas classes — nunca hex solto no JSX (exceção única: o SVG da
// marca em HexLogo.tsx).
// -----------------------------------------------------------------------------

/** @type {import('tailwindcss').Config} */
export default {
  // O tema não usa a variante `dark:`: ele troca as CSS vars em
  // :root[data-tema='escuro'] (src/index.css), e as classes das telas
  // continuam as mesmas.
  darkMode: [],
  // Onde o Tailwind procura classes usadas, para gerar só o CSS necessário.
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // screens COMPLETO (não extend): a ordem das media queries importa, e os
    // dois breakpoints do produto entram no meio da escala padrão do Tailwind.
    screens: {
      sm: '640px',
      md: '768px',
      // A sidebar fixa existe a partir daqui — substitui o min-[900px]:
      // que estava repetido como string em 5 arquivos de shell.
      shell: '900px',
      lg: '1024px',
      xl: '1280px',
      // Página densa abre a segunda coluna (é o xl com nome de produto).
      // Declarado DEPOIS do xl de propósito: a media query é idêntica, então o
      // token do produto é o que vence quando as duas mexem na mesma
      // propriedade.
      duascol: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Todo token vem das CSS vars de src/index.css como TRIPLA RGB, para
        // o tema escuro ser uma troca de valores em vez de uma variante em
        // cada classe. O `<alpha-value>` é o que preserva `bg-delp-red/10`.
        delp: {
          red: 'rgb(var(--delp-red) / <alpha-value>)',
          'red-dark': 'rgb(var(--delp-red-dark) / <alpha-value>)',
          'red-deep': 'rgb(var(--delp-red-deep) / <alpha-value>)',
        },
        // Fundos: superfície (cartão), fundo da página e realce.
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          2: 'rgb(var(--bg-2) / <alpha-value>)',
          3: 'rgb(var(--bg-3) / <alpha-value>)',
        },
        // Textos: principal, secundário e apagado.
        txt: {
          DEFAULT: 'rgb(var(--txt) / <alpha-value>)',
          2: 'rgb(var(--txt-2) / <alpha-value>)',
          muted: 'rgb(var(--muted) / <alpha-value>)',
        },
        // Cores semânticas de estado.
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          // O par do botão sólido de ação positiva: fundo e texto trocam
          // JUNTOS no escuro (lá o fundo clareia e o texto escurece).
          forte: 'rgb(var(--success-forte) / <alpha-value>)',
          'forte-texto': 'rgb(var(--success-forte-texto) / <alpha-value>)',
        },
        info: 'rgb(var(--info) / <alpha-value>)',
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          forte: 'rgb(var(--warning-forte) / <alpha-value>)',
          texto: 'rgb(var(--warning-texto) / <alpha-value>)',
        },
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'border-med': 'rgb(var(--border-med) / <alpha-value>)',
        // A escala dos gráficos (--vermelho-1..6) NÃO entra aqui como classe:
        // cor de gráfico sai do catálogo ESCALA_VERMELHOS/COR_ASCENT
        // (src/lib/cores.ts) e chega por prop ou por `style`, nunca por
        // utilitário do Tailwind. Ela chegou a existir aqui em 22/09/2026, por
        // causa do sparkline dos tiles de KPI, e saiu no mesmo dia: a escala
        // passaria a viver em DOIS lugares, e uma classe nova só aparece
        // depois de reiniciar o dev server — o tile ficou preto na tela do
        // Lucas enquanto o config antigo estava carregado.
        // Cores oficiais das unidades de negócio Delp (padrão visual) —
        // usadas em selos/legendas ligados a uma unidade, nunca como neutros.
        unidade: {
          subsea: 'rgb(var(--unidade-subsea) / <alpha-value>)',
          industria: 'rgb(var(--unidade-industria) / <alpha-value>)',
          servicos: 'rgb(var(--unidade-servicos) / <alpha-value>)',
          mooring: 'rgb(var(--unidade-mooring) / <alpha-value>)',
        },
      },
      // Bordas: "med" para campos de formulário, "subtle" para cartões.
      borderColor: {
        subtle: 'rgb(var(--border-subtle) / var(--border-subtle-a))',
        med: 'rgb(var(--border-med) / <alpha-value>)',
      },
      fontFamily: {
        // Barlow é a tipografia do padrão visual Delp (fallback Inter) —
        // app inteiro migrado em 11/07/2026 (antes: Space Grotesk).
        sans: ['Barlow', 'Inter', 'system-ui', 'sans-serif'],
        // Mono é usada em TODO número, data e código (regra do design system).
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Raios padronizados por tipo de elemento.
      borderRadius: { card: '16px', btn: '10px', badge: '8px', pill: '30px' },
      // Teto da faixa de indicadores e de blocos de leitura larga.
      // Consome a var --faixa-conteudo do index.css — o valor muda SÓ lá.
      maxWidth: { faixa: 'var(--faixa-conteudo)' },
      boxShadow: {
        subtle: '0 2px 8px rgba(0,0,0,.04)', // cartões em repouso
        medium: '0 6px 20px rgba(204,15,16,.15)', // CTAs (sombra avermelhada)
        strong: '0 25px 50px -12px rgba(0,0,0,.25)', // destaque máximo (painel do login)
      },
      backgroundImage: {
        'grad-delp': 'linear-gradient(135deg,#CC0F10,#A00D24)',
        'grad-deep': 'linear-gradient(135deg,#A00D24,#8B0000)',
      },
      // Transições padrão de 300ms (limite do design system).
      transitionDuration: { DEFAULT: '300ms' },
      // Animações da tela de login (o CSS global as desliga inteiras quando
      // o sistema pede para reduzir movimento).
      keyframes: {
        // Zoom lento "Ken Burns" do banner ativo do carrossel.
        kenburns: {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.08)' },
        },
        // Entrada suave ao trocar de etapa no formulário de login.
        etapa: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Tremor de reforço quando usuário/senha são recusados.
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        // Confirmação de decisão no meio da tela (AvisoFlutuante). São quatro
        // animações encadeadas por atraso, e TODAS partem de um estado inicial
        // para o valor de repouso do elemento — nunca o contrário. É o que faz
        // o bloco global de prefers-reduced-motion (que zera as animações)
        // deixar o aviso legível em vez de congelá-lo meio desenhado.
        //
        // O cartão sobe ao entrar, segura e sai flutuando. A duração casa com
        // DURACAO_MS de lá.
        confirmacao: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '8%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '82%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
        },
        // O selo dá um salto curto e passa um pouco do tamanho antes de assentar.
        selo: {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // O traço do certo se desenha: o dash começa todo deslocado e volta a
        // zero, que é o valor de repouso (ícone inteiro).
        //
        // O deslocamento parte do COMPRIMENTO do traço, que muda com o
        // desenho (o certo mede ~21 unidades do viewBox; o X, ~31) — por isso
        // vem em variável, posta pelo componente junto do dasharray. Um valor
        // maior que o comprimento gastaria o começo da animação com o traço
        // ainda fora da vista, e o risco sairia atrasado e apressado; um menor
        // deixaria o desenho incompleto em repouso.
        risco: { from: { strokeDashoffset: 'var(--traco)' } },
        // Um pulso só, saindo de trás do selo.
        pulso: {
          from: { opacity: '.35', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(1.9)' },
        },
      },
      animation: {
        kenburns: 'kenburns 7s ease-out forwards',
        etapa: 'etapa 200ms ease-out',
        shake: 'shake 400ms ease-in-out',
        confirmacao: 'confirmacao 1.9s ease-out forwards',
        selo: 'selo 380ms cubic-bezier(.34,1.56,.64,1) 40ms both',
        risco: 'risco 600ms ease-out 240ms both',
        pulso: 'pulso 700ms ease-out 240ms both',
      },
    },
  },
}
