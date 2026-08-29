'use client'

import { useEffect, useState } from 'react'
import { Activity, Box, Boxes, Crosshair, Gauge, Pause, Play, RefreshCw, Save, Settings2, Shuffle, Square, Terminal, Wifi, WifiOff } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { autoMinerApi } from '@/lib/autominer-api'
import { DEFAULT_CONFIG, OFFLINE_TELEMETRY, type AutoMinerConfig, type Telemetry } from '@/lib/autominer-types'
import { isTauri, managerApi } from '@/lib/tauri-manager'
import { TrajectoryView } from './trajectory-view'

const nav = [
  ['Visão geral', Gauge], ['Blocos', Boxes], ['Movimento', Activity], ['Mira', Crosshair],
  ['Aleatoriedade', Shuffle], ['Mineração', Box], ['Avançado', Settings2],
] as const

function formatTime(seconds: number) { return new Date(seconds * 1000).toISOString().slice(11, 19) }

export function AutoMinerDashboard({ gameDir = '' }: { gameDir?: string }) {
  const [section, setSection] = useState('Visão geral')
  const [config, setConfig] = useState<AutoMinerConfig>(DEFAULT_CONFIG)
  const [telemetry, setTelemetry] = useState<Telemetry>(OFFLINE_TELEMETRY)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let events: EventSource | undefined
    let retry: ReturnType<typeof setTimeout>
    const connect = async () => {
      try {
        const [status, remoteConfig] = await Promise.all([autoMinerApi.status(), autoMinerApi.config()])
        setTelemetry({ ...status, online: true }); setConfig(remoteConfig)
        events = new EventSource(autoMinerApi.eventsUrl)
        events.onmessage = (event) => setTelemetry({ ...(JSON.parse(event.data) as Telemetry), online: true })
        events.onerror = () => { events?.close(); setTelemetry((value) => ({ ...value, online: false })); retry = setTimeout(connect, 2500) }
      } catch { setTelemetry((value) => ({ ...value, online: false })) }
    }
    void connect()
    if (gameDir && isTauri()) {
      void managerApi.loadConfig(gameDir).then((value) => setConfig(value as AutoMinerConfig)).catch(() => undefined)
    }
    return () => { events?.close(); clearTimeout(retry) }
  }, [gameDir])

  const patch = <K extends keyof AutoMinerConfig>(group: K, values: Partial<AutoMinerConfig[K]>) => {
    setConfig((current) => ({ ...current, [group]: { ...current[group], ...values } })); setDirty(true)
  }
  const command = async (value: 'start' | 'pause' | 'resume' | 'stop' | 'reload') => {
    try { setTelemetry({ ...(await autoMinerApi.command(value)), online: true }); toast.success(`Comando ${value} enviado`) } catch { toast.error('Mod offline — comando não enviado') }
  }
  const save = async () => {
    try {
      if (telemetry.online) setConfig(await autoMinerApi.saveConfig(config))
      else if (gameDir && isTauri()) await managerApi.saveConfig(gameDir, config)
      else throw new Error('offline')
      setDirty(false)
      toast.success(telemetry.online ? 'Configuração aplicada no mod' : 'Configuração salva no Minecraft')
    } catch { toast.error('Conecte o mod ou selecione uma instalação válida') }
  }

  return <main className="min-h-screen bg-background font-sans text-foreground">
    <Toaster theme="dark" />
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Terminal className="size-5" /></div><div><p className="font-mono text-sm font-semibold tracking-wider">AUTOMINER</p><p className="font-mono text-[10px] text-muted-foreground">CONTROL NODE / 1.21.1</p></div></div>
      <div className="flex items-center gap-3"><Badge variant={telemetry.online ? 'default' : 'secondary'}>{telemetry.online ? <Wifi /> : <WifiOff />}{telemetry.online ? 'MOD ONLINE' : 'MODO OFFLINE'}</Badge><Button size="sm" onClick={save}><Save data-icon="inline-start" />{dirty ? 'Salvar alterações' : 'Salvo'}</Button></div>
    </header>
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r bg-card p-3 md:flex">
        <nav className="flex flex-col gap-1" aria-label="Configurações">{nav.map(([label, Icon]) => <Button key={label} variant={section === label ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setSection(label)}><Icon data-icon="inline-start" />{label}</Button>)}</nav>
        <div className="rounded-lg border bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground"><p>API LOCAL</p><p className="text-foreground">127.0.0.1:{config.advanced.apiPort}</p><p className="mt-2">ATALHO GLOBAL</p><p className="text-foreground">F6 / TOGGLE</p></div>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">{nav.map(([label]) => <Button key={label} size="sm" variant={section === label ? 'secondary' : 'ghost'} onClick={() => setSection(label)}>{label}</Button>)}</div>
        {section === 'Visão geral' ? <Overview config={config} telemetry={telemetry} command={command} /> : <SettingsSection section={section} config={config} setConfig={setConfig} patch={patch} />}
      </div>
    </div>
  </main>
}

function Overview({ config, telemetry, command }: { config: AutoMinerConfig; telemetry: Telemetry; command: (v: 'start'|'pause'|'resume'|'stop'|'reload') => void }) {
  const disabled = !telemetry.online
  return <div className="flex flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="font-mono text-xs text-primary">SISTEMA / VISÃO GERAL</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Operação de mineração</h1><p className="text-sm text-muted-foreground">Telemetria local, trajetória e controle em tempo real.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => command('start')} disabled={disabled}><Play data-icon="inline-start" />Iniciar</Button><Button variant="outline" onClick={() => command(telemetry.state === 'PAUSED' ? 'resume' : 'pause')} disabled={disabled}><Pause data-icon="inline-start" />{telemetry.state === 'PAUSED' ? 'Retomar' : 'Pausar'}</Button><Button variant="outline" onClick={() => command('stop')} disabled={disabled}><Square data-icon="inline-start" />Parar</Button><Button variant="ghost" onClick={() => command('reload')} disabled={disabled}><RefreshCw data-icon="inline-start" />Recarregar</Button></div></div>
    {!telemetry.online && <div className="border-l-2 border-accent bg-accent/8 px-4 py-3 text-sm"><strong>Mod não detectado.</strong> Você ainda pode editar a configuração; comandos e telemetria estarão disponíveis quando o Minecraft conectar.</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["ESTADO", telemetry.state], ["BLOCOS QUEBRADOS", telemetry.blocksBroken], ["TEMPO ATIVO", formatTime(telemetry.activeSeconds)], ["VELOCIDADE", `${telemetry.speed.toFixed(2)} b/s`]].map(([label,value]) => <Card key={label}><CardHeader className="pb-2"><CardDescription className="font-mono text-[10px] tracking-wider">{label}</CardDescription><CardTitle className="font-mono text-xl">{value}</CardTitle></CardHeader></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><TrajectoryView config={config} telemetry={telemetry}/><Card><CardHeader><CardTitle className="text-base">Ciclo atual</CardTitle><CardDescription>Estado da máquina e validação do alvo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div><div className="mb-2 flex justify-between font-mono text-xs"><span>PROGRESSO</span><span>{telemetry.state === 'MINING' ? '72%' : '0%'}</span></div><Progress value={telemetry.state === 'MINING' ? 72 : 0}/></div><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Alvo</dt><dd className="mt-1 font-mono text-xs">{telemetry.target?.id ?? '—'}</dd></div><div><dt className="text-muted-foreground">Distância</dt><dd className="mt-1 font-mono">{telemetry.target ? `${telemetry.target.distance.toFixed(2)}m` : '—'}</dd></div><div><dt className="text-muted-foreground">Yaw</dt><dd className="mt-1 font-mono">{telemetry.camera.yaw.toFixed(1)}°</dd></div><div><dt className="text-muted-foreground">Pitch</dt><dd className="mt-1 font-mono">{telemetry.camera.pitch.toFixed(1)}°</dd></div></dl></CardContent></Card></div>
  </div>
}

function Control({ label, value, min, max, step=1, onChange }: { label:string; value:number; min:number; max:number; step?:number; onChange:(v:number)=>void }) { return <div className="flex flex-col gap-3"><div className="flex items-center justify-between text-sm"><label>{label}</label><Input className="h-8 w-24 font-mono" type="number" value={value} min={min} max={max} step={step} onChange={(e)=>onChange(Number(e.target.value))}/></div><Slider value={[value]} min={min} max={max} step={step} onValueChange={(v)=>onChange(Array.isArray(v) ? v[0] : v)}/></div> }
function Toggle({ label, description, checked, onChange }: {label:string;description:string;checked:boolean;onChange:(v:boolean)=>void}) { return <div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChange}/></div> }

function SettingsSection({ section, config, setConfig, patch }: { section:string; config:AutoMinerConfig; setConfig:React.Dispatch<React.SetStateAction<AutoMinerConfig>>; patch:<K extends keyof AutoMinerConfig>(g:K,v:Partial<AutoMinerConfig[K]>)=>void }) {
  if (section === 'Blocos') return <div className="flex flex-col gap-5"><Heading title="Allowlist de blocos" copy="Somente estes IDs podem ser selecionados e quebrados."/><div className="grid gap-3 lg:grid-cols-2">{config.enabledBlocks.map((block,index)=><Card key={block.id}><CardContent className="flex items-center gap-3 pt-6"><Switch checked={block.enabled} onCheckedChange={(enabled)=>{const enabledBlocks=[...config.enabledBlocks];enabledBlocks[index]={...block,enabled};setConfig({...config,enabledBlocks})}}/><div className="min-w-0 flex-1"><p className="truncate font-mono text-sm">{block.id}</p><p className="text-xs text-muted-foreground">Prioridade {block.priority}/10</p></div><Badge variant="outline">P{block.priority}</Badge></CardContent></Card>)}</div></div>
  const content: Record<string, React.ReactNode> = {
    Movimento: <><Toggle label="Sprint contínuo" description="Mantém apenas avanço e sprint durante a execução." checked={config.movement.sprint} onChange={(v)=>patch('movement',{sprint:v})}/><Control label="Distância de busca" value={config.movement.searchDistance} min={2} max={12} onChange={(v)=>patch('movement',{searchDistance:v})}/><Control label="Alcance lateral" value={config.movement.lateralRange} min={1} max={8} onChange={(v)=>patch('movement',{lateralRange:v})}/><Control label="Limite vertical acima" value={config.movement.verticalUp} min={0} max={6} onChange={(v)=>patch('movement',{verticalUp:v})}/></>,
    Mira: <><Control label="Velocidade horizontal" value={config.camera.yawSpeed} min={1} max={15} step={0.5} onChange={(v)=>patch('camera',{yawSpeed:v})}/><Control label="Velocidade vertical" value={config.camera.pitchSpeed} min={1} max={15} step={0.5} onChange={(v)=>patch('camera',{pitchSpeed:v})}/><Control label="Suavização" value={config.camera.smoothing} min={0.1} max={0.98} step={0.01} onChange={(v)=>patch('camera',{smoothing:v})}/><Control label="Limite horizontal" value={config.camera.horizontalLimit} min={15} max={120} onChange={(v)=>patch('camera',{horizontalLimit:v})}/></>,
    Aleatoriedade: <><Toggle label="Controlled Randomness" description="Adiciona variação limitada sem alterar as regras de segurança." checked={config.randomness.enabled} onChange={(v)=>patch('randomness',{enabled:v})}/><Control label="Ruído de seleção" value={config.randomness.targetNoise} min={0} max={0.5} step={0.01} onChange={(v)=>patch('randomness',{targetNoise:v})}/><Control label="Penalidade de histórico" value={config.randomness.historyPenalty} min={0} max={5} step={0.1} onChange={(v)=>patch('randomness',{historyPenalty:v})}/></>,
    Mineração: <><Toggle label="Exigir ferramenta adequada" description="Pausa a mineração se a ferramenta não for apropriada." checked={config.mining.requireTool} onChange={(v)=>patch('mining',{requireTool:v})}/><Toggle label="Salto automático" description="Salta somente quando há um alvo válido acima." checked={config.mining.autoJump} onChange={(v)=>patch('mining',{autoJump:v})}/><Control label="Delay de quebra (ms)" value={config.mining.breakDelayMs} min={0} max={1000} step={10} onChange={(v)=>patch('mining',{breakDelayMs:v})}/><Control label="Cooldown de salto (ms)" value={config.mining.jumpCooldownMs} min={200} max={3000} step={50} onChange={(v)=>patch('mining',{jumpCooldownMs:v})}/></>,
    Avançado: <><Toggle label="HUD no jogo" description="Mostra estado, alvo, contador e conexão no Minecraft." checked={config.advanced.hud} onChange={(v)=>patch('advanced',{hud:v})}/><Control label="Tamanho do histórico" value={config.advanced.historySize} min={4} max={32} onChange={(v)=>patch('advanced',{historySize:v})}/><div className="rounded-lg border p-4"><p className="text-sm font-medium">API local</p><p className="mt-1 font-mono text-xs text-muted-foreground">http://127.0.0.1:{config.advanced.apiPort}/api</p></div></>,
  }
  return <div className="flex flex-col gap-5"><Heading title={section} copy="Ajustes aplicados ao próximo ciclo do AutoMiner."/><Card><CardContent className="flex flex-col gap-6 pt-6">{content[section]}</CardContent></Card></div>
}
function Heading({title,copy}:{title:string;copy:string}) { return <div><p className="font-mono text-xs text-primary">CONFIGURAÇÃO / {title.toUpperCase()}</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{copy}</p></div> }
