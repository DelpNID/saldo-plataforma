import { NaoEncontrado } from "@/components/NaoEncontrado";

// 404 dentro da moldura: o notFound() da Tarefa (código que não existe na carga) cai aqui e a
// barra lateral e o topo continuam no lugar (design §6.4).
export default function NaoEncontradoNoApp() {
  return (
    <div className="rounded-card border border-subtle bg-bg shadow-subtle">
      <NaoEncontrado />
    </div>
  );
}
