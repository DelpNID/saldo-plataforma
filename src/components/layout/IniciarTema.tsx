"use client";

// Liga o tema uma vez por carregamento: aplica a escolha e passa a seguir o
// sistema quando ela é "Automático". No Visto isso é uma linha do main.tsx;
// no Next, o lugar é um componente cliente montado pelo layout raiz.
import { useEffect } from 'react';
import { iniciarTema } from '../../lib/tema';

export function IniciarTema() {
  useEffect(() => {
    iniciarTema();
  }, []);
  return null;
}
