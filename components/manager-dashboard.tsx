'use client'

import { useCallback, useEffect, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { ArchiveRestore, Check, ChevronRight, CircleAlert, Download, ExternalLink, Folder, Gauge, HardDrive, LoaderCircle, PackageCheck, Play, RefreshCw, Settings2, ShieldCheck, Trash2, Wrench, X } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AutoMinerDashboard } from '@/components/autominer-dashboard'
import { EMPTY_DETECTION } from '@/lib/manager-defaults'
import { isTauri, managerApi, type BackupInfo, type DetectionReport, type ModRelease } from '@/lib/tauri-manager'

const sections = [
  ['Visão geral', Gauge], ['Minecraft', HardDrive], ['Configuração', Settings2], ['Backups', ArchiveRestore], ['Diagnóstico', Wrench],
] as const

type Stage = 'idle' | 'detecting' | 'fabric' | 'installing' | 'done' | 'error'

export function ManagerDashboard() {
  const [section, setSection] = useState('Visão geral')
  const [report, setReport] = useState<DetectionReport>(EMPTY_DETECTION)
  const [gameDir, setGameDir] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [release, setRelease] = useState<ModRelease | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const desktop = isTauri()

  const detect = useCallback(async (selected?: string) => {
    if (!desktop) return
    setStage('detecting')
    try {
      const next = await managerApi.detect(selected || gameDir || undefined)
      setReport(next)
      if (next.gameDir) setGameDir(next.gameDir)
      setStage('idle')
    } catch (error) {
      setStage('error'); toast.error(String(error))
    }
  }, [desktop, gameDir])

  useEffect(() => { void detect() }, []) // a detecção inicial ocorre uma única vez ao abrir o Manager
  useEffect(() => {
    if (!desktop) return
    void managerApi.checkRelease().then(setRelease).catch(() => undefined)
  }, [desktop])

  const chooseDirectory = async () => {
    if (!desktop) { toast.info('A seleção de pasta está disponível no aplicativo Windows.'); return }
    const value = await open({ directory: true, multiple: false, title: 'Selecione a pasta .minecraft' })
    if (typeof value === 'string') await detect(value)
  }

  const install = async () => {
    if (!gameDir) { toast.error('Selecione uma instalação válida do Minecraft.'); return }
    try {
      if (!report.fabricInstalled) { setStage('fabric'); await managerApi.installFabric(gameDir) }
      setStage('installing')
      const result = await managerApi.installAll(gameDir)
      setStage('done'); toast.success(`AutoMiner ${result.modVersion} instalado com segurança.`)
      await detect(gameDir)
    } catch (error) { setStage('error'); toast.error(String(error)) }
  }

  const refreshBackups = async () => {
    if (!gameDir || !desktop) return
    try { setBackups(await managerApi.listBackups(gameDir)) } catch (error) { toast.error(String(error)) }
  }

  const allReady = report.fabricInstalled && report.fabricApiInstalled && report.autominerInstalled && report.configFound
  const progress = stage === 'fabric' ? 35 : stage === 'installing' ? 72 : stage === 'done' || allReady ? 100 : report.minecraftFound ? 18 : 0

  return <main className="min-h-screen bg-background font-sans text-foreground">
    <Toaster theme="dark" />
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><PackageCheck className="size-5" /></div>
        <div><p className="font-mono text-sm font-semibold tracking-wider">AUTOMINER MANAGER</p><p className="font-mono text-[10px] text-muted-foreground">WINDOWS / MINECRAFT 1.21.1</p></div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={desktop ? 'default' : 'secondary'}>{desktop ? 'DESKTOP ATIVO' : 'PREVIEW WEB'}</Badge>
        <Button size="sm" variant="outline" onClick={() => void detect()} disabled={!desktop || stage === 'detecting'}><RefreshCw data-icon="inline-start" />Verificar</Button>
      </div>
    </header>
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r bg-card p-3 md:flex">
        <div className="flex flex-col gap-1">
          {sections.map(([label, Icon]) => <Button key={label} variant={section === label ? 'secondary' : 'ghost'} className="justify-start" onClick={() => { setSection(label); if (label === 'Backups') void refreshBackups() }}><Icon data-icon="inline-start" />{label}</Button>)}
        </div>
        <div className="rounded-lg border bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground"><p>REPOSITÓRIO</p><p className="truncate text-foreground">GitHub Releases</p><p className="mt-2">CANAL</p><p className="text-foreground">STABLE / 1.21.1</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 overflow-x-auto border-b p-3 md:hidden">{sections.map(([label]) => <Button key={label} size="sm" variant={section === label ? 'secondary' : 'ghost'} onClick={() => setSection(label)}>{label}</Button>)}</div>
        {section === 'Configuração' ? <AutoMinerDashboard gameDir={gameDir} /> : <div className="p-4 md:p-6">
          {section === 'Visão geral' && <Overview report={report} gameDir={gameDir} stage={stage} release={release} progress={progress} allReady={allReady} desktop={desktop} onChoose={chooseDirectory} onInstall={install} onLauncher={() => void managerApi.openLauncher().catch((e) => toast.error(String(e)))}/>} 
          {section === 'Minecraft' && <MinecraftView report={report} gameDir={gameDir} onChoose={chooseDirectory} onDetect={() => void detect()} />}
          {section === 'Backups' && <BackupsView backups={backups} disabled={!desktop || !gameDir} onRefresh={refreshBackups} onRestore={(name) => void managerApi.restoreBackup(gameDir, name).then(() => toast.success('Backup restaurado.')).catch((e) => toast.error(String(e)))}/>} 
          {section === 'Diagnóstico' && <Diagnostics report={report} desktop={desktop} onUninstall={() => void managerApi.uninstall(gameDir, false).then(() => detect(gameDir)).catch((e) => toast.error(String(e)))}/>} 
        </div>}
      </div>
    </div>
  </main>
}

function Overview({ report, gameDir, stage, release, progress, allReady, desktop, onChoose, onInstall, onLauncher }: { report:DetectionReport; gameDir:string; stage:Stage; release:ModRelease|null; progress:number; allReady:boolean; desktop:boolean; onChoose:()=>void; onInstall:()=>void; onLauncher:()=>void }) {
  const busy = ['detecting','fabric','installing'].includes(stage)
  return <div className="flex flex-col gap-5">
    <div><p className="font-mono text-xs text-primary">MANAGER / VISÃO GERAL</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">Sua instalação, pronta para minerar</h1><p className="text-sm leading-6 text-muted-foreground">Detecção, dependências, atualização e rollback em um único fluxo local.</p></div>
    {!desktop && <div className="border-l-2 border-accent bg-accent/8 px-4 py-3 text-sm"><strong>Preview web.</strong> A interface é totalmente navegável; operações no sistema de arquivos são habilitadas no aplicativo Windows.</div>}
    <Card className="overflow-hidden"><CardHeader><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><CardTitle>{allReady ? 'AutoMiner está pronto' : 'Preparar AutoMiner'}</CardTitle><CardDescription>{gameDir || 'Nenhuma instalação do Minecraft selecionada'}</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onChoose}><Folder data-icon="inline-start" />Selecionar pasta</Button>{allReady ? <Button onClick={onLauncher}><Play data-icon="inline-start" />Abrir Launcher</Button> : <Button onClick={onInstall} disabled={!desktop || !report.minecraftFound || busy}>{busy ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}INSTALAR AUTOMINER</Button>}</div></div></CardHeader><CardContent className="flex flex-col gap-4"><Progress value={progress}/><div className="flex justify-between font-mono text-xs text-muted-foreground"><span>{stageLabel(stage, allReady)}</span><span>{progress}%</span></div></CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatusCard label="MINECRAFT" ok={report.minecraftFound} detail="Diretório válido"/><StatusCard label="FABRIC" ok={report.fabricInstalled} detail="Loader 1.21.1"/><StatusCard label="FABRIC API" ok={report.fabricApiInstalled} detail="Dependência do mod"/><StatusCard label="AUTOMINER" ok={report.autominerInstalled} detail={release ? `Release ${release.version}` : 'Release estável'}/></div>
    <Card><CardHeader><CardTitle className="text-base">Fluxo seguro</CardTitle><CardDescription>Nenhum mundo, perfil ou mod de terceiros é alterado.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{[['1','Detectar','Valida o diretório e a versão 1.21.1.'],['2','Instalar','Baixa apenas fontes oficiais via HTTPS.'],['3','Verificar','Confere JARs, configuração e backup.']].map(([n,t,c])=><div key={n} className="flex gap-3 rounded-lg border p-4"><span className="font-mono text-primary">{n}</span><div><p className="text-sm font-medium">{t}</p><p className="text-xs leading-5 text-muted-foreground">{c}</p></div></div>)}</CardContent></Card>
  </div>
}

function MinecraftView({ report, gameDir, onChoose, onDetect }:{report:DetectionReport;gameDir:string;onChoose:()=>void;onDetect:()=>void}) { return <div className="flex flex-col gap-5"><Heading title="Minecraft" copy="Instalação ativa e componentes detectados no disco."/><Card><CardHeader><CardTitle className="text-base">Diretório do jogo</CardTitle><CardDescription className="font-mono text-xs">{gameDir || 'Não detectado'}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button onClick={onChoose}><Folder data-icon="inline-start"/>Selecionar .minecraft</Button><Button variant="outline" onClick={onDetect}><RefreshCw data-icon="inline-start"/>Detectar novamente</Button></CardContent></Card><div className="grid gap-3 md:grid-cols-2">{[['Minecraft 1.21.1',report.version1211],['Minecraft Launcher',report.launcherFound],['Fabric Loader',report.fabricInstalled],['Configuração',report.configFound]].map(([label,ok])=><StatusRow key={String(label)} label={String(label)} ok={Boolean(ok)}/>)}</div></div> }

function BackupsView({backups,disabled,onRefresh,onRestore}:{backups:BackupInfo[];disabled:boolean;onRefresh:()=>void;onRestore:(n:string)=>void}) { return <div className="flex flex-col gap-5"><div className="flex items-end justify-between"><Heading title="Backups" copy="Versões anteriores preservadas antes de cada atualização."/><Button variant="outline" onClick={onRefresh} disabled={disabled}><RefreshCw data-icon="inline-start"/>Atualizar</Button></div>{backups.length===0?<Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><ArchiveRestore className="size-8 text-muted-foreground"/><p className="text-sm font-medium">Nenhum backup disponível</p><p className="max-w-sm text-xs leading-5 text-muted-foreground">Um backup será criado automaticamente antes da primeira atualização do AutoMiner.</p></CardContent></Card>:<div className="flex flex-col gap-2">{backups.map((b)=><Card key={b.name}><CardContent className="flex items-center justify-between gap-4 py-4"><div><p className="font-mono text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{(b.size/1024/1024).toFixed(2)} MB</p></div><Button size="sm" variant="outline" onClick={()=>onRestore(b.name)}><ArchiveRestore data-icon="inline-start"/>Restaurar</Button></CardContent></Card>)}</div>}</div> }

function Diagnostics({report,desktop,onUninstall}:{report:DetectionReport;desktop:boolean;onUninstall:()=>void}) { const entries=[['Ambiente desktop Tauri',desktop],['Diretório Minecraft',report.minecraftFound],['Launcher detectado',report.launcherFound],['Minecraft 1.21.1',report.version1211],['Fabric Loader',report.fabricInstalled],['Fabric API',report.fabricApiInstalled],['AutoMiner JAR',report.autominerInstalled],['autominer.json',report.configFound]]; return <div className="flex flex-col gap-5"><Heading title="Diagnóstico" copy="Leitura direta do ambiente local, sem telemetria externa."/><Card><CardContent className="flex flex-col gap-1 py-3">{entries.map(([l,o])=><StatusRow key={String(l)} label={String(l)} ok={Boolean(o)}/>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base text-destructive">Zona de manutenção</CardTitle><CardDescription>A remoção afeta somente JARs do AutoMiner. Mundos e outros mods são preservados.</CardDescription></CardHeader><CardContent><AlertDialog><AlertDialogTrigger render={<Button variant="destructive" disabled={!report.autominerInstalled}><Trash2 data-icon="inline-start"/>Desinstalar AutoMiner</Button>}/><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desinstalar o AutoMiner?</AlertDialogTitle><AlertDialogDescription>Somente os arquivos AutoMiner-*.jar serão removidos. A configuração e os backups serão mantidos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onUninstall}>Desinstalar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent></Card></div> }

function StatusCard({label,ok,detail}:{label:string;ok:boolean;detail:string}) { return <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription className="font-mono text-[10px] tracking-wider">{label}</CardDescription>{ok?<Check className="size-4 text-primary"/>:<X className="size-4 text-muted-foreground"/>}</div><CardTitle className="text-base">{ok?'Detectado':'Pendente'}</CardTitle><CardDescription>{detail}</CardDescription></CardHeader></Card> }
function StatusRow({label,ok}:{label:string;ok:boolean}) { return <div className="flex items-center justify-between gap-4 rounded-md px-3 py-3 hover:bg-muted/50"><div className="flex items-center gap-3">{ok?<ShieldCheck className="size-4 text-primary"/>:<CircleAlert className="size-4 text-accent"/>}<span className="text-sm">{label}</span></div><Badge variant={ok?'default':'secondary'}>{ok?'OK':'PENDENTE'}</Badge></div> }
function Heading({title,copy}:{title:string;copy:string}) { return <div><p className="font-mono text-xs text-primary">MANAGER / {title.toUpperCase()}</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{copy}</p></div> }
function stageLabel(stage:Stage,ready:boolean) { if(ready)return 'Instalação verificada'; return {idle:'Aguardando instalação',detecting:'Verificando ambiente...',fabric:'Instalando Fabric Loader...',installing:'Baixando e validando componentes...',done:'Instalação concluída',error:'Ação necessária'}[stage] }
