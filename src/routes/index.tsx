import { createFileRoute } from "@tanstack/react-router";
import { CarrierApp } from "@/components/engine/CarrierApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CarrierApp />;
}
