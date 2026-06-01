import React from "react";

export default function StatCard({ label, value, accent = "blue" }) {
  return (
    <div className={`card stat-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
