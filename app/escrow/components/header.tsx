"use client";

import React from "react";
import WalletButton from "./WalletButton";

export default function NavHeader() {
  return (
    <section className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between h-20 px-8 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-gray-200">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
          Escrow
        </h1>

        <WalletButton />
      </div>
    </section>
  );
}
