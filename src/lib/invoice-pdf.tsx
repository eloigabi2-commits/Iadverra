import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatBRL, formatPct, MONTHS } from "@/lib/format";
import type { AjusteDTO, LancamentoDTO } from "@/lib/finance";

const logoDataUri = (() => {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-tile.png");
    return `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
})();

const GREEN = "#1B4D2E";
const ROSE = "#B23A55";
const INK = "#1B1C20";
const INK_SOFT = "#5B5D63";
const LINE = "#E6E5E0";
const PAPER_TINT = "#F5F6F5";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  logo: { width: 34, height: 34, borderRadius: 6, marginRight: 10 },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 13, color: INK },
  brandSub: { fontSize: 8.5, color: INK_SOFT, marginTop: 1 },
  headerRight: { marginLeft: "auto", alignItems: "flex-end" },
  docTitle: { fontFamily: "Helvetica-Bold", fontSize: 14, color: GREEN },
  docSub: { fontSize: 8.5, color: INK_SOFT, marginTop: 2 },

  summaryBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    marginBottom: 18,
  },
  summaryCell: {
    width: "20%",
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: LINE,
  },
  summaryCellLast: { borderRightWidth: 0 },
  summaryLabel: { fontSize: 7.5, color: INK_SOFT, textTransform: "uppercase" },
  summaryValue: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 3 },

  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 6,
    marginTop: 14,
  },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: PAPER_TINT,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 5,
  },
  tableRowLast: { borderBottomWidth: 0 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: INK_SOFT, paddingHorizontal: 6 },
  td: { fontSize: 8.5, paddingHorizontal: 6 },
  colData: { width: "12%" },
  colCategoria: { width: "20%" },
  colDescricao: { width: "34%" },
  colValor: { width: "17%", textAlign: "right" },
  colStatus: { width: "17%", textAlign: "right" },
  colMes: { width: "20%" },
  colReceitas: { width: "20%", textAlign: "right" },
  colDespesas: { width: "20%", textAlign: "right" },
  colLucro: { width: "20%", textAlign: "right" },
  colSaldo: { width: "20%", textAlign: "right" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: INK_SOFT,
  },
  empty: { fontSize: 8.5, color: INK_SOFT, paddingVertical: 10, textAlign: "center" },
});

function SummaryCell({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryCell, ...(last ? [styles.summaryCellLast] : [])]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, ...(color ? [{ color }] : [])]}>{value}</Text>
    </View>
  );
}

export interface InvoiceMensalData {
  tipo: "mensal";
  nomeEmpresa: string;
  year: number;
  month: number;
  geradoEm: string;
  saldoInicial: number;
  receitas: number;
  despesas: number;
  lucroLiquido: number;
  margem: number;
  saldoFinal: number;
  lancamentos: LancamentoDTO[];
  ajustes: AjusteDTO[];
}

export interface InvoiceAnualData {
  tipo: "anual";
  nomeEmpresa: string;
  year: number;
  geradoEm: string;
  saldoInicial: number;
  receitas: number;
  despesas: number;
  lucroLiquido: number;
  margem: number;
  saldoFinal: number;
  meses: { month: number; receitas: number; despesas: number; lucroLiquido: number; saldoFinal: number }[];
}

export type InvoiceData = InvoiceMensalData | InvoiceAnualData;

function Header({ data }: { data: InvoiceData }) {
  const periodo =
    data.tipo === "mensal" ? `${MONTHS[data.month - 1]} de ${data.year}` : `Ano de ${data.year}`;
  return (
    <View style={styles.headerRow}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
      {logoDataUri && <Image src={logoDataUri} style={styles.logo} />}
      <View>
        <Text style={styles.brand}>Contabilidade Conforme</Text>
        {data.nomeEmpresa ? <Text style={styles.brandSub}>{data.nomeEmpresa}</Text> : null}
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.docTitle}>Resumo financeiro</Text>
        <Text style={styles.docSub}>{periodo}</Text>
        <Text style={styles.docSub}>Gerado em {data.geradoEm}</Text>
      </View>
    </View>
  );
}

function Summary({ data }: { data: InvoiceData }) {
  return (
    <View style={styles.summaryBox}>
      <SummaryCell label="Saldo inicial" value={formatBRL(data.saldoInicial)} />
      <SummaryCell label="Receitas" value={formatBRL(data.receitas)} color={GREEN} />
      <SummaryCell label="Despesas" value={formatBRL(data.despesas)} color={ROSE} />
      <SummaryCell
        label="Lucro líquido"
        value={`${formatBRL(data.lucroLiquido)}  (${formatPct(data.margem)})`}
      />
      <SummaryCell label="Saldo final" value={formatBRL(data.saldoFinal)} last />
    </View>
  );
}

function LancamentosTable({ title, itens }: { title: string; itens: LancamentoDTO[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colData]}>Data</Text>
          <Text style={[styles.th, styles.colCategoria]}>Categoria</Text>
          <Text style={[styles.th, styles.colDescricao]}>Descrição</Text>
          <Text style={[styles.th, styles.colValor]}>Valor</Text>
          <Text style={[styles.th, styles.colStatus]}>Status</Text>
        </View>
        {itens.length === 0 ? (
          <Text style={styles.empty}>Nenhum lançamento.</Text>
        ) : (
          itens.map((l, i) => (
            <View
              key={l.id}
              style={i === itens.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}
            >
              <Text style={[styles.td, styles.colData]}>{l.data.split("-").reverse().join("/")}</Text>
              <Text style={[styles.td, styles.colCategoria]}>{l.categoriaNome}</Text>
              <Text style={[styles.td, styles.colDescricao]}>{l.descricao || "-"}</Text>
              <Text style={[styles.td, styles.colValor]}>{formatBRL(l.valor)}</Text>
              <Text style={[styles.td, styles.colStatus]}>
                {l.status === "CONFIRMADO" ? "OK" : "Pendente"}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function MesesTable({ meses }: { meses: InvoiceAnualData["meses"] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Mês a mês</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colMes]}>Mês</Text>
          <Text style={[styles.th, styles.colReceitas]}>Receitas</Text>
          <Text style={[styles.th, styles.colDespesas]}>Despesas</Text>
          <Text style={[styles.th, styles.colLucro]}>Lucro líquido</Text>
          <Text style={[styles.th, styles.colSaldo]}>Saldo final</Text>
        </View>
        {meses.map((m, i) => (
          <View
            key={m.month}
            style={i === meses.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}
          >
            <Text style={[styles.td, styles.colMes]}>{MONTHS[m.month - 1]}</Text>
            <Text style={[styles.td, styles.colReceitas]}>{formatBRL(m.receitas)}</Text>
            <Text style={[styles.td, styles.colDespesas]}>{formatBRL(m.despesas)}</Text>
            <Text style={[styles.td, styles.colLucro]}>{formatBRL(m.lucroLiquido)}</Text>
            <Text style={[styles.td, styles.colSaldo]}>{formatBRL(m.saldoFinal)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <Summary data={data} />

        {data.tipo === "mensal" ? (
          <>
            <LancamentosTable
              title="Receitas"
              itens={data.lancamentos.filter((l) => l.tipo === "RECEITA")}
            />
            <LancamentosTable
              title="Despesas"
              itens={data.lancamentos.filter((l) => l.tipo === "DESPESA")}
            />
            {data.ajustes.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Retiradas e distribuições</Text>
                <View style={styles.table}>
                  {data.ajustes.map((a, i) => (
                    <View
                      key={a.id}
                      style={
                        i === data.ajustes.length - 1
                          ? [styles.tableRow, styles.tableRowLast]
                          : styles.tableRow
                      }
                    >
                      <Text style={[styles.td, styles.colData]}>
                        {a.data.split("-").reverse().join("/")}
                      </Text>
                      <Text style={[styles.td, { width: "63%" }]}>
                        {a.tipo === "RETIRADA" ? "Retirada para aplicações" : "Distribuição de lucros"}
                      </Text>
                      <Text style={[styles.td, styles.colValor]}>{formatBRL(a.valor)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <MesesTable meses={data.meses} />
        )}

        <View style={styles.footer} fixed>
          <Text>Contabilidade Conforme — gerado automaticamente</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buildInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
