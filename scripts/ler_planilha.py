"""Lê a planilha de saldo e grava um JSON com os valores já calculados pelo Excel.

Uso: python ler_planilha.py "<planilha.xlsx>" "<saida.json>"

Lê três abas:
  - Resumo Geral: uma linha por código de tarefa e a linha 1 com os totais.
  - Componentes: uma linha por componente de cada OP.
  - Dados: atividades das OPs, resumidas aqui por OP.
A aba Arvore não é lida: a plataforma recalcula a árvore a partir de Componentes.
"""
import json
import sys
from collections import Counter

import openpyxl

ABAS = ("Resumo Geral", "Componentes", "Dados")

COLS_RESUMO = {
    "DESENHO": "desenho",
    "CODTAREFA": "codTarefa",
    "DESCRIÇÃO": "descricao",
    "EXECUÇÕES": "execucoes",
    "EXEC. PEND": "execPend",
    "QTD PREVISTO": "qtdPrevisto",
    "QTD REALIZADA": "qtdRealizada",
    "% AVANÇO SALDO": "avanco",
    "PRIORIDADE": "prioridade",
}

COLS_COMP = {
    "CODORDEM": "codOrdem",
    "CODESTRUTURA": "codEstrutura",
    "IDATVORDEM": "idAtvOrdem",
    "QTDUSADA": "qtdUsada",
    "APONTADO": "apontado",
    "CODIGOPRD": "codigoPrd",
    "NOMEFANTASIA": "nome",
    "CODUNDCONTROLE": "unidade",
    "CODCCUSTO": "centroCusto",
    "RESPONSAVEL": "responsavel",
    "Cod.Tar Pai": "tarPai",
    "EXEC": "exec",
    "Cod.Tar Filho": "tarFilho",
    "COD2": "grupo",
    "PREVISTO": "previsto",
    "APONTADO2": "apontado2",
    "LOTE": "lote",
}

COLS_DADOS = {
    "OP": "op",
    "TAG": "tag",
    "DESCRIÇÃOOP": "descricao",
    "DESENHO": "desenho",
    "STATUS": "status",
    "HORAS PREVISTA": "horasPrevistas",
    "HORAS APONTADAS": "horasApontadas",
    "QTDE PLANEJADA": "qtdPlanejada",
    "QTDE EFETIVADA": "qtdEfetivada",
}


def falhar(msg):
    print("ERRO: " + msg, file=sys.stderr)
    sys.exit(2)


def valor(v):
    """Converte o valor da célula para algo que cabe em JSON."""
    if v is None:
        return None
    if isinstance(v, (int, float, str, bool)):
        return v
    return str(v)


def mapa_colunas(cabecalho, esperadas, aba):
    pos = {}
    for i, nome in enumerate(cabecalho):
        if isinstance(nome, str) and nome.strip() in esperadas and nome.strip() not in pos:
            pos[nome.strip()] = i
    faltando = [c for c in esperadas if c not in pos]
    if faltando:
        falhar(f"a aba '{aba}' está sem as colunas: {', '.join(faltando)}")
    return {esperadas[k]: i for k, i in pos.items()}


def ler_resumo(ws):
    linhas = ws.iter_rows(values_only=True)
    total = next(linhas)
    cab = next(linhas)
    m = mapa_colunas(cab, COLS_RESUMO, "Resumo Geral")
    tarefas = []
    for r in linhas:
        cod = r[m["codTarefa"]] if len(r) > m["codTarefa"] else None
        if cod in (None, ""):
            continue
        tarefas.append({k: valor(r[i]) if i < len(r) else None for k, i in m.items()})
    # A linha 1 traz os totais da tabela nas mesmas colunas
    totais = {k: valor(total[m[k]]) for k in ("execucoes", "execPend", "qtdPrevisto", "qtdRealizada")}
    return tarefas, totais


def ler_componentes(ws):
    linhas = ws.iter_rows(values_only=True)
    m = mapa_colunas(next(linhas), COLS_COMP, "Componentes")
    saida = []
    for r in linhas:
        if r[m["codOrdem"]] in (None, ""):
            continue
        saida.append({k: valor(r[i]) for k, i in m.items()})
    return saida


def ler_dados(ws):
    linhas = ws.iter_rows(values_only=True)
    m = mapa_colunas(next(linhas), COLS_DADOS, "Dados")
    ops = {}
    for r in linhas:
        op = r[m["op"]]
        if op in (None, ""):
            continue
        op = str(op)
        o = ops.get(op)
        if o is None:
            o = ops[op] = {
                "op": op,
                "descricao": valor(r[m["descricao"]]),
                "desenho": valor(r[m["desenho"]]),
                "tag": valor(r[m["tag"]]),
                "qtdPlanejada": valor(r[m["qtdPlanejada"]]),
                "qtdEfetivada": valor(r[m["qtdEfetivada"]]),
                "horasPrevistas": 0.0,
                "horasApontadas": 0.0,
                "atividades": 0,
                "ativApontadas": 0,
                "ativParciais": 0,
            }
        for campo in ("horasPrevistas", "horasApontadas"):
            v = r[m[campo]]
            if isinstance(v, (int, float)):
                o[campo] += v
        o["atividades"] += 1
        st = str(r[m["status"]] or "").strip().upper()
        if st == "APONTADA":
            o["ativApontadas"] += 1
        elif st == "PARCIALMENTE APONTADA":
            o["ativParciais"] += 1
    return list(ops.values())


def main():
    if len(sys.argv) != 3:
        falhar('uso: python ler_planilha.py "<planilha.xlsx>" "<saida.json>"')
    origem, destino = sys.argv[1], sys.argv[2]
    try:
        wb = openpyxl.load_workbook(origem, read_only=True, data_only=True)
    except FileNotFoundError:
        falhar(f"arquivo não encontrado: {origem}")
    except PermissionError:
        falhar("a planilha está bloqueada. Feche o arquivo no Excel e rode de novo.")
    faltando = [a for a in ABAS if a not in wb.sheetnames]
    if faltando:
        falhar(f"abas não encontradas: {', '.join(faltando)}")

    tarefas, totais = ler_resumo(wb["Resumo Geral"])
    componentes = ler_componentes(wb["Componentes"])
    ordens = ler_dados(wb["Dados"])
    centros = Counter(str(c["centroCusto"]) for c in componentes if c.get("centroCusto"))

    saida = {
        "arquivo": origem.replace("\\", "/").split("/")[-1],
        "centroCusto": centros.most_common(1)[0][0] if centros else "",
        "totais": totais,
        "tarefas": tarefas,
        "componentes": componentes,
        "ordens": ordens,
    }
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Lido: {len(tarefas)} códigos de tarefa, {len(componentes)} componentes, {len(ordens)} OPs.")


if __name__ == "__main__":
    main()
