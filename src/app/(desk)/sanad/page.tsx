import { SanadDesk } from "@/components/sanad-desk";
import { getDeskData } from "@/server/queries";

export default async function SanadPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const data = await getDeskData();
  return <SanadDesk data={data} tab={params.tab ?? "in"} />;
}
