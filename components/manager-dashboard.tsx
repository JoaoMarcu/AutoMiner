'use client'

import { useCallback, useEffect, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import useSWR from 'swr'
import { ArchiveRestore, Check, ChevronRight, CircleAlert, Download, ExternalLink, Folder, Gauge, HardDrive, LoaderCircle, PackageCheck, Play, RefreshCw, Settings2, ShieldCheck, Trash2, Wrench, X } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AutoMinerDashboard } from '@/components/autominer-dashboard'
import { EMPTY_DETECTION } from '@/lib/manager-defaults'
import { isTauri, managerApi, type BackupInfo, type DetectionReport, type ModRelease } from '@/lib/tauri-manager'

const sections = [
  ['Dashboard', Gauge], ['Mineração', Play], ['Configurações', Settings2], ['Atualizações', RefreshCw], ['Sobre', ShieldCheck],
] as const

type Stage = 'idle' | 'detecting' | 'installing' | 'done' | 'error'
type ReleaseState = 'idle' | 'loading' | 'available' | 'notConfigured' | 'error'

export function ManagerDashboard() {
  const [section, setSection] = useState('Dashboard')
  const [report, setReport] = useState<DetectionReport>(EMPTY_DETECTION)
  const [gameDir, setGameDir] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [release, setRelease] = useState<ModRelease | null>(null)
  const [releaseState, setReleaseState] = useState<ReleaseState>('idle')
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const desktop = isTauri()
  const { data: liveReport } = useSWR(
    desktop ? ['minecraft-detection', gameDir] : null,
    () => managerApi.detect(gameDir || undefined),
    { refreshInterval: 15000, revalidateOnFocus: true, dedupingInterval: 10000 },
  )

  useEffect(() => {
    if (!liveReport) return
    setReport(liveReport)
    if (liveReport.gameDir) setGameDir(liveReport.gameDir)
  }, [liveReport])

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

  useEffect(() => {
    if (!desktop) return
    setReleaseState('loading')
    void managerApi.checkRelease().then((value) => { setRelease(value); setReleaseState('available') }).catch((error) => {
      setReleaseState(String(error).includes('não configurado') ? 'notConfigured' : 'error')
    })
  }, [desktop])

  const chooseDirectory = async () => {
    if (!desktop) { toast.info('A seleção de pasta está disponível no aplicativo Windows.'); return }
    const value = await open({ directory: true, multiple: false, title: 'Selecione a instalação ou instância do Minecraft' })
    if (typeof value === 'string') await detect(value)
  }

  const install = async () => {
    if (!gameDir) { toast.error('Selecione uma instalação válida do Minecraft.'); return }
    if (!report.version1211) { toast.error('Minecraft 1.21.1 não foi detectado nessa instalação.'); return }
    if (!report.fabricInstalled || !report.fabricApiInstalled) { toast.error('Instale o Fabric Loader e o Fabric API antes de instalar o AutoMiner.'); return }
    try {
      setStage('installing')
      const result = await managerApi.installAll(gameDir)
      setStage('done'); toast.success(`AutoMiner ${result.modVersion} instalado em ${result.modsDir}.`)
      await detect(gameDir)
    } catch (error) { setStage('error'); toast.error(String(error)) }
  }

  const refreshBackups = async () => {
    if (!gameDir || !desktop) return
    try { setBackups(await managerApi.listBackups(gameDir)) } catch (error) { toast.error(String(error)) }
  }

  const allReady = report.version1211 && report.fabricInstalled && report.fabricApiInstalled && report.autominerInstalled

  return <main className="min-h-screen bg-background font-sans text-foreground">
    <Toaster theme="dark" />
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><PackageCheck className="size-5" /></div>
        <div><p className="font-mono text-sm font-semibold tracking-wider">AUTOMINER MANAGER</p><p className="font-mono text-[10px] text-muted-foreground">WINDOWS / GERENCIAMENTO LOCAL</p></div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={desktop ? 'default' : 'secondary'}>{desktop ? 'DESKTOP ATIVO' : 'PREVIEW WEB'}</Badge>
        <Button size="sm" variant="outline" onClick={() => void detect()} disabled={!desktop || stage === 'detecting'}><RefreshCw data-icon="inline-start" />Verificar</Button>
      </div>
    </header>
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r bg-card p-3 md:flex">
        <div className="flex flex-col gap-1">
          {sections.map(([label, Icon]) => <Button key={label} variant={section === label ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setSection(label)}><Icon data-icon="inline-start" />{label}</Button>)}
        </div>
        <div className="rounded-lg border bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground"><p>REPOSITÓRIO</p><p className="truncate text-foreground">{releaseState === 'available' ? 'GitHub verificado' : releaseState === 'notConfigured' ? 'Não configurado' : releaseState === 'error' ? 'Consulta falhou' : 'Não verificado'}</p><p className="mt-2">RELEASE</p><p className="text-foreground">{release?.version ?? 'Não disponível'}</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 overflow-x-auto border-b p-3 md:hidden">{sections.map(([label]) => <Button key={label} size="sm" variant={section === label ? 'secondary' : 'ghost'} onClick={() => setSection(label)}>{label}</Button>)}</div>
        {section === 'Mineração' ? <AutoMinerDashboard gameDir={gameDir} /> : <div className="p-4 md:p-6">
          {section === 'Dashboard' && <Overview report={report} gameDir={gameDir} stage={stage} release={release} releaseState={releaseState} allReady={allReady} desktop={desktop} onChoose={chooseDirectory} onInstall={install} onLauncher={() => void managerApi.openLauncher().catch((e) => toast.error(String(e)))}/>}
          {section === 'Configurações' && <SettingsView report={report} gameDir={gameDir} backups={backups} desktop={desktop} onChoose={chooseDirectory} onDetect={() => void detect()} onRefreshBackups={refreshBackups} onRestore={(name) => void managerApi.restoreBackup(gameDir, name).then(() => toast.success('Backup restaurado.')).catch((e) => toast.error(String(e)))} onUninstall={() => void managerApi.uninstall(gameDir, false).then(() => detect(gameDir)).catch((e) => toast.error(String(e)))}/>}
          {section === 'Atualizações' && <UpdatesView release={release} releaseState={releaseState} installedVersion={report.autominerVersion}/>}
          {section === 'Sobre' && <AboutView />}
        </div>}
      </div>
    </div>
  </main>
}

function Overview({ report, gameDir, stage, release, releaseState, allReady, desktop, onChoose, onInstall, onLauncher }: { report:DetectionReport; gameDir:string; stage:Stage; release:ModRelease|null; releaseState:ReleaseState; allReady:boolean; desktop:boolean; onChoose:()=>void; onInstall:()=>void; onLauncher:()=>void }) {
  const busy = ['detecting','installing'].includes(stage)
  return <div className="flex flex-col gap-5">
    <div><p className="font-mono text-xs text-primary">MANAGER / VISÃO GERAL</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">Gerencie sua instalação do AutoMiner</h1><p className="text-sm leading-6 text-muted-foreground">Detecção por arquivos e versão, instalação somente do mod e monitoramento local do Minecraft.</p></div>
    {!desktop && <div className="border-l-2 border-accent bg-accent/8 px-4 py-3 text-sm"><strong>Preview web.</strong> A interface é totalmente navegável; operações no sistema de arquivos são habilitadas no aplicativo Windows.</div>}
    <Card className="overflow-hidden"><CardHeader><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><CardTitle>{allReady ? 'AutoMiner está pronto' : 'Preparar AutoMiner'}</CardTitle><CardDescription>{gameDir || 'Nenhuma instalação do Minecraft selecionada'}</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onChoose}><Folder data-icon="inline-start" />Selecionar pasta</Button>{allReady ? <Button onClick={onLauncher}><Play data-icon="inline-start" />Abrir Launcher</Button> : <Button onClick={onInstall} disabled={!desktop || !report.minecraftFound || busy}>{busy ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}INSTALAR AUTOMINER</Button>}</div></div></CardHeader><CardContent><p className="font-mono text-xs text-muted-foreground">{stageLabel(stage, allReady)}</p></CardContent></Card>
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard label="MINECRAFT" checked={desktop} ok={report.version1211} detail={!report.minecraftFound ? '— Não detectado' : report.version1211 ? '✓ 1.21.1' : '✕ Versão incompatível'}/>
      <StatusCard label="FABRIC" checked={desktop} ok={report.fabricInstalled && report.fabricApiInstalled && report.version1211} detail={report.fabricInstalled && report.fabricApiInstalled && report.version1211 ? '✓ Correto' : report.fabricInstalled || report.fabricApiInstalled ? '✕ Instalação incompleta' : '— Não detectado'}/>
      <StatusCard label="AUTOMINER" checked={desktop} ok={report.autominerInstalled} detail={report.autominerInstalled ? release && report.autominerVersion !== release.version ? '↑ Atualização disponível' : '✓ Instalado' : '✕ Não instalado'}/>
    </div>
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4"><div><p className="text-sm font-medium">Instalação segura e local</p><p className="text-xs leading-5 text-muted-foreground">O Manager instala somente o AutoMiner. Fabric Loader e Fabric API permanecem sob seu controle.</p></div><ChevronRight className="size-4 shrink-0 text-muted-foreground"/></div>
  </div>
}

function SettingsView({report,gameDir,backups,desktop,onChoose,onDetect,onRefreshBackups,onRestore,onUninstall}:{report:DetectionReport;gameDir:string;backups:BackupInfo[];desktop:boolean;onChoose:()=>void;onDetect:()=>void;onRefreshBackups:()=>void;onRestore:(name:string)=>void;onUninstall:()=>void}) { return <div className="flex flex-col gap-8"><MinecraftView report={report} gameDir={gameDir} onChoose={onChoose} onDetect={onDetect}/><details className="rounded-xl border bg-card"><summary className="cursor-pointer px-5 py-4 text-sm font-medium">Configurações avançadas e diagnóstico</summary><div className="flex flex-col gap-6 border-t p-5"><Diagnostics report={report} desktop={desktop} onUninstall={onUninstall}/><BackupsView backups={backups} disabled={!desktop||!gameDir} onRefresh={onRefreshBackups} onRestore={onRestore}/></div></details></div> }

function MinecraftView({ report, gameDir, onChoose, onDetect }:{report:DetectionReport;gameDir:string;onChoose:()=>void;onDetect:()=>void}) { return <div className="flex flex-col gap-5"><Heading title="Configurações" copy="Escolha a instalação do Minecraft e mantenha os detalhes técnicos fora do fluxo principal."/><Card><CardHeader><CardTitle className="text-base">Instalação selecionada</CardTitle><CardDescription className="font-mono text-xs">{gameDir || 'Nenhuma pasta selecionada'}</CardDescription>{report.modsDir&&<CardDescription className="font-mono text-xs">Destino do mod: {report.modsDir}</CardDescription>}</CardHeader><CardContent className="flex flex-wrap gap-2"><Button onClick={onChoose}><Folder data-icon="inline-start"/>Selecionar pasta</Button><Button variant="outline" onClick={onDetect}><RefreshCw data-icon="inline-start"/>Verificar instalação</Button></CardContent></Card></div> }

function BackupsView({backups,disabled,onRefresh,onRestore}:{backups:BackupInfo[];disabled:boolean;onRefresh:()=>void;onRestore:(n:string)=>void}) { return <div className="flex flex-col gap-5"><div className="flex items-end justify-between"><Heading title="Backups" copy="Versões anteriores preservadas antes de cada atualização."/><Button variant="outline" onClick={onRefresh} disabled={disabled}><RefreshCw data-icon="inline-start"/>Atualizar</Button></div>{backups.length===0?<Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><ArchiveRestore className="size-8 text-muted-foreground"/><p className="text-sm font-medium">Nenhum backup disponível</p><p className="max-w-sm text-xs leading-5 text-muted-foreground">Um backup será criado automaticamente antes da primeira atualização do AutoMiner.</p></CardContent></Card>:<div className="flex flex-col gap-2">{backups.map((b)=><Card key={b.name}><CardContent className="flex items-center justify-between gap-4 py-4"><div><p className="font-mono text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{(b.size/1024/1024).toFixed(2)} MB</p></div><Button size="sm" variant="outline" onClick={()=>onRestore(b.name)}><ArchiveRestore data-icon="inline-start"/>Restaurar</Button></CardContent></Card>)}</div>}</div> }

function Diagnostics({report,desktop,onUninstall}:{report:DetectionReport;desktop:boolean;onUninstall:()=>void}) { const entries=[['Ambiente desktop Tauri',desktop],['Instalação Minecraft válida',report.minecraftFound],['Minecraft aberto',report.minecraftRunning],['Launcher detectado',report.launcherFound],['Minecraft 1.21.1',report.version1211],['Fabric Loader',report.fabricInstalled],['Fabric API',report.fabricApiInstalled],['AutoMiner JAR',report.autominerInstalled]]; return <div className="flex flex-col gap-5"><Heading title="Diagnóstico" copy="Leitura direta do ambiente local, sem telemetria externa."/><Card><CardContent className="flex flex-col gap-1 py-3">{entries.map(([l,o])=><StatusRow key={String(l)} label={String(l)} ok={Boolean(o)}/>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base text-destructive">Zona de manutenção</CardTitle><CardDescription>A remoção afeta somente JARs do AutoMiner. Mundos e outros mods são preservados.</CardDescription></CardHeader><CardContent><AlertDialog><AlertDialogTrigger render={<Button variant="destructive" disabled={!report.autominerInstalled}><Trash2 data-icon="inline-start"/>Desinstalar AutoMiner</Button>}/><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desinstalar o AutoMiner?</AlertDialogTitle><AlertDialogDescription>Somente os arquivos AutoMiner-*.jar serão removidos. A configuração e os backups serão mantidos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onUninstall}>Desinstalar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent></Card></div> }

function UpdatesView({release,releaseState,installedVersion}:{release:ModRelease|null;releaseState:ReleaseState;installedVersion:string|null}) { const available=Boolean(release&&installedVersion&&release.version!==installedVersion); return <div className="flex max-w-3xl flex-col gap-5"><Heading title="Atualizações" copy="Versões oficiais verificadas diretamente pelo GitHub Releases."/><Card><CardHeader><CardDescription>VERSÃO INSTALADA</CardDescription><CardTitle>{installedVersion??'Não instalada'}</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{releaseState==='loading'?'Verificando atualização...':releaseState==='available'?available?`Versão ${release?.version} disponível.`:'Você está usando a versão mais recente.':'Não foi possível verificar agora.'}</p>{release?.releaseUrl&&<Button variant="outline" onClick={()=>window.open(release.releaseUrl,'_blank','noopener,noreferrer')}><ExternalLink data-icon="inline-start"/>Ver release</Button>}</CardContent></Card></div> }
function AboutView() { return <div className="flex max-w-3xl flex-col gap-5"><Heading title="Sobre" copy="Gerenciamento local, transparente e focado no AutoMiner."/><div className="rounded-xl border bg-card p-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><PackageCheck className="size-5"/></div><div><h2 className="font-semibold">AutoMiner Manager</h2><p className="text-sm text-muted-foreground">Minecraft Java 1.21.1 · Fabric</p></div></div><p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">O Manager detecta sua instalação por arquivos e versão, preserva outros mods e instala somente o AutoMiner na pasta correta.</p></div></div> }

function StatusCard({label,checked,ok,detail}:{label:string;checked:boolean;ok:boolean;detail:string}) { return <Card className="min-h-36"><CardHeader><div className="flex items-center justify-between"><CardDescription className="font-mono text-xs tracking-wider">{label}</CardDescription>{!checked?<span className="text-lg text-muted-foreground">—</span>:ok?<Check className="size-5 text-primary"/>:<X className="size-5 text-destructive"/>}</div><CardTitle className="pt-4 text-xl">{checked?detail:'— Não verificado'}</CardTitle></CardHeader></Card> }
function StatusRow({label,ok}:{label:string;ok:boolean}) { return <div className="flex items-center justify-between gap-4 rounded-md px-3 py-3 hover:bg-muted/50"><div className="flex items-center gap-3">{ok?<ShieldCheck className="size-4 text-primary"/>:<CircleAlert className="size-4 text-accent"/>}<span className="text-sm">{label}</span></div><Badge variant={ok?'default':'secondary'}>{ok?'OK':'PENDENTE'}</Badge></div> }
function Heading({title,copy}:{title:string;copy:string}) { return <div><p className="font-mono text-xs text-primary">MANAGER / {title.toUpperCase()}</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{copy}</p></div> }
function stageLabel(stage:Stage,ready:boolean) { if(ready)return 'Instalação verificada'; return {idle:'Aguardando instalação',detecting:'Verificando arquivos e processos...',installing:'Baixando e validando o AutoMiner...',done:'Instalação concluída',error:'Ação necessária'}[stage] }
