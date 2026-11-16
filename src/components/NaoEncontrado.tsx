import Link from "next/link";
import { SimboloAscent } from "./marca/LogoAscent";
import { buttonVariants } from "./ui/Button";

/** O conteúdo das duas 404 (dentro da moldura e fora dela): o símbolo, o aviso e a volta ao Painel. */
export function NaoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <SimboloAscent className="w-16" />
      <h1 className="text-xl font-bold text-txt">Não encontrado</h1>
      <p className="max-w-sm text-sm text-txt-2">Esse código não existe na planilha carregada.</p>
      <Link className={buttonVariants.primary} href="/">
        Voltar ao painel
      </Link>
    </div>
  );
}
