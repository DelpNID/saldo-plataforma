import { NaoEncontrado } from "@/components/NaoEncontrado";

// 404 de endereço desconhecido: fora da moldura (design §6.1). O código de tarefa que não existe
// na carga usa a 404 de dentro da moldura (src/app/(app)/not-found.tsx).
export default function NaoEncontradoRaiz() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-2 p-4">
      <div className="w-full max-w-md rounded-card border border-subtle bg-bg shadow-subtle">
        <NaoEncontrado />
      </div>
    </div>
  );
}
