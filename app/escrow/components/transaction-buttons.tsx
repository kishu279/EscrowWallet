import { cn } from "@/lib/utils";
import React from "react";

interface TransactBttnProps {
  logo: string;
  type: "initialize" | "claim";
}

const classProperties = {
  initialize: {
    backgroundColor: "bg-green-200",
    color: "text-green-500",
    border: "border-green-500",
  },
  claim: {
    backgroundColor: "bg-sky-200",
    color: "text-sky-500",
    border: "border-sky-500",
  },
};

export default function TransactBttn(props: TransactBttnProps) {
  const styles = classProperties[props.type || "initialize"];
  return (
    <button
      className={cn(
        "h-32 w-full rounded-xl font-semibold text-lg border-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105",
        styles.backgroundColor,
        styles.color,
        styles.border
      )}
    >
      {props.logo}
    </button>
  );
}
