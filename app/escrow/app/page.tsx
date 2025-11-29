import NavHeader from "@/components/header";
import Transactions from "@/components/transactions";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 flex items-center justify-center">
        <Transactions />
      </main>
    </div>
  );
}
