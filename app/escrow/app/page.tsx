import NavHeader from "@/components/header";
import Transactions from "@/components/transactions";
import EscrowList from "@/components/escrow-list";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Transactions />
          </div>
          <div>
            <EscrowList />
          </div>
        </div>
      </main>
    </div>
  );
}
