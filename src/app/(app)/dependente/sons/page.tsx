"use client";

import { PageHeader } from "@/components/ui/page-header";
import { SoundPlayer } from "@/components/sound-player";

export default function SoundsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sons para acalmar"
        title="Um som para cada momento"
        description="Escolha um som que traga conforto. Ele fica tocando até você pausar ou parar — no seu tempo, do seu jeito."
      />
      <SoundPlayer />
    </div>
  );
}
