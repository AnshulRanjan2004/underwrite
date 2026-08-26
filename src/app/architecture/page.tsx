import type { Metadata } from "next";
import { ArchitectureOverview } from "@/components/architecture-overview";

export const metadata: Metadata = {
  title: "How Underwrite Works | System Architecture",
  description:
    "See how Underwrite turns a financial question into an auditable, evidence-grounded research report.",
};

export default function ArchitecturePage() {
  return <ArchitectureOverview />;
}
