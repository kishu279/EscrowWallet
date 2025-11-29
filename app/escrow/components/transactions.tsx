import React from "react";
import TransactBttn from "./transaction-buttons";

export default function Transactions() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center justify-center space-y-8">
        <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Transactions
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <TransactBttn logo="Initialize" type="initialize" />
          <TransactBttn logo="Claim" type="claim" />
        </div>
      </div>
    </div>
  );
}
