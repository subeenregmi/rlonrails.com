import type { Metadata } from "next";
import { Journey } from "@/components/Journey";

export const metadata: Metadata = {
  title: "Your journey",
  description: "Your reinforcement learning progress, saved in this browser.",
  robots: { index: false, follow: true },
};

export default function JourneyPage() {
  return <Journey />;
}
