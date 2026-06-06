"use client";

import { useRouter } from "next/navigation";
import LawSelector from "@/components/LawSelector";

export default function Home() {
  const router = useRouter();
  return <LawSelector onSelect={(id) => router.push(`/study/${id}`)} />;
}
