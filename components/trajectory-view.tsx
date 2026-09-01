import { Crosshair, MoveUpRight } from "lucide-react"
import type { AutoMinerConfig, Telemetry } from "@/lib/autominer-types"

export function TrajectoryView({ config, telemetry }: { config: AutoMinerConfig; telemetry: Telemetry }) {
  if (!telemetry.online || !telemetry.player || !telemetry.camera) return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border bg-card text-center">
      <Crosshair className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="font-mono text-xs">TRAJETÓRIA INDISPONÍVEL</p>
      <p className="text-sm text-muted-foreground">Aguardando dados do Minecraft</p>
    </div>
  )
  return (
    <div className="trajectory-grid relative min-h-72 overflow-hidden rounded-xl border bg-card">
      <div className="absolute inset-x-0 top-4 flex items-center justify-between px-5 font-mono text-xs text-muted-foreground">
        <span>ÁREA FIXA / CORREDOR {telemetry.corridor ?? '—'}/{telemetry.corridorCount ?? '—'}</span><span>{config.movement.searchDistance}.0 BLOCOS</span>
      </div>
      <div className="absolute bottom-0 left-1/2 h-[78%] w-40 -translate-x-1/2 [clip-path:polygon(42%_100%,58%_100%,96%_0,4%_0)] bg-primary/8 ring-1 ring-primary/30" />
      <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-primary">
        <MoveUpRight className="size-5" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-widest">TRAJETÓRIA BASE</span>
      </div>
      {telemetry.target ? (
        <div className="absolute left-[62%] top-[36%] flex items-center gap-2 text-accent">
          <Crosshair className="size-5" aria-hidden="true" /><span className="font-mono text-xs">ALVO {telemetry.target.distance.toFixed(1)}m</span>
        </div>
      ) : (
        <div className="absolute left-[62%] top-[36%] flex items-center gap-2 text-muted-foreground">
          <Crosshair className="size-5" aria-hidden="true" /><span className="font-mono text-xs">SEM ALVO</span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 font-mono text-[10px] text-muted-foreground">{telemetry.areaPhase ?? 'CORREDOR'} · LATERAL ±{config.movement.lateralRange} · VERTICAL +{config.movement.verticalUp}/-{config.movement.verticalDown}</div>
    </div>
  )
}
