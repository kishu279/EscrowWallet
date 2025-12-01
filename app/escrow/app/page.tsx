import NavHeader from "@/components/header";
import Transactions from "@/components/transactions";
import MyEscrow from "@/components/my-escrow";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 p-8">
        <div className="space-y-12">
          {/* Transactions Section */}
          <div>
            <Transactions />
          </div>

          {/* My Escrow PDA Section */}
          <div>
            <MyEscrow />
          </div>
        </div>
      </main>
    </div>
  );
}
