import { notFound } from "next/navigation";
import { InvoiceDesk } from "@/components/invoice-desk";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { parseInvoicePaper } from "@/lib/invoice";
import { qrMatrix } from "@/lib/qr";
import { getInvoice } from "@/server/queries";

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string; paper?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const paper = parseInvoicePaper(query.paper, invoice.paper);
  return (
    <InvoiceDesk id={invoice.id} initialPaper={paper} autoPrintStamp={query.print ?? null} share={invoice.share}>
      <InvoiceSheet invoice={invoice} qr={qrMatrix(invoice.share.url)} />
    </InvoiceDesk>
  );
}
