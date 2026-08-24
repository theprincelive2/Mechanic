"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full border border-graphite-line text-sm rounded py-2 hover:border-amber/50"
    >
      Print / Save PDF
    </button>
  );
}
