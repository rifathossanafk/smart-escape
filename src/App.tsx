import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapCanvas from '@/components/MapCanvas'
import ControlPanel from '@/components/ControlPanel'
import StatusPanel from '@/components/StatusPanel'
import { validateBuilding } from '@/lib/validate'
import { computeRoute } from '@/lib/routing'
import { SAMPLE_BUILDING } from '@/lib/sample'
import { makeT, type Lang, type TKey } from '@/lib/i18n'
import type { BuildingData, LogEntry } from '@/lib/types'

type Mode = 'navigate' | 'hazards'

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const t = useMemo(() => makeT(lang), [lang])

  const [data, setData] = useState<BuildingData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [blockedNodes, setBlockedNodes] = useState<Set<string>>(new Set())
  const [blockedEdges, setBlockedEdges] = useState<Set<string>>(new Set())
  const [closedExits, setClosedExits] = useState<Set<string>>(new Set())
  const [startId, setStartId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('navigate')
  const [mobileTab, setMobileTab] = useState<'route' | 'control' | 'file'>('route')
  const [log, setLog] = useState<LogEntry[]>([])

  const pushLog = useCallback((text: string) => {
    setLog((prev) => [{ time: now(), text }, ...prev].slice(0, 50))
  }, [])

  const loadData = useCallback(
    (d: BuildingData, message: string) => {
      setData(d)
      setErrors([])
      setBlockedNodes(new Set(d.initial_state.blocked_nodes))
      setBlockedEdges(new Set(d.initial_state.blocked_edges))
      setClosedExits(new Set(d.initial_state.closed_exits))
      setStartId(null)
      pushLog(`${message}: ${d.building}`)
    },
    [pushLog],
  )

  const onImport = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result))
          const res = validateBuilding(raw)
          if (res.ok) loadData(res.data, t('logImport'))
          else setErrors(res.errors)
        } catch {
          setErrors([t('parseError')])
        }
      }
      reader.readAsText(file)
    },
    [loadData, t],
  )

  const onSample = useCallback(() => loadData(SAMPLE_BUILDING, t('logSample')), [loadData, t])

  const onReset = useCallback(() => {
    if (!data) return
    setBlockedNodes(new Set(data.initial_state.blocked_nodes))
    setBlockedEdges(new Set(data.initial_state.blocked_edges))
    setClosedExits(new Set(data.initial_state.closed_exits))
    pushLog(t('logReset'))
  }, [data, pushLog, t])

  const onToggleNode = useCallback(
    (id: string) => {
      setBlockedNodes((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          pushLog(`${t('logUnblock')} ${id}`)
        } else {
          next.add(id)
          pushLog(`${t('logBlock')} ${id}`)
        }
        return next
      })
    },
    [pushLog, t],
  )

  const onToggleEdge = useCallback(
    (id: string) => {
      setBlockedEdges((prev) => {
        const e = data?.edges.find((x) => x.id === id)
        const name = e ? `${e.from}↔${e.to}` : id
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          pushLog(`${t('logUnblock')} ${name}`)
        } else {
          next.add(id)
          pushLog(`${t('logBlock')} ${name}`)
        }
        return next
      })
    },
    [data, pushLog, t],
  )

  const onToggleExit = useCallback(
    (id: string) => {
      setClosedExits((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          pushLog(`${t('logReopen')} ${id}`)
        } else {
          next.add(id)
          pushLog(`${t('logClose')} ${id}`)
        }
        return next
      })
    },
    [pushLog, t],
  )

  const onSelectStart = useCallback(
    (id: string) => {
      setStartId(id)
      pushLog(`${t('logStart')} ${id}`)
    },
    [pushLog, t],
  )

  const onNodeClick = useCallback(
    (id: string) => {
      const n = data?.nodes.find((x) => x.id === id)
      if (!n) return
      if (mode === 'navigate') {
        if (n.type !== 'exit') onSelectStart(id)
      } else {
        if (n.type === 'exit') onToggleExit(id)
        else onToggleNode(id)
      }
    },
    [data, mode, onSelectStart, onToggleExit, onToggleNode],
  )

  const onEdgeClick = useCallback(
    (id: string) => {
      if (mode === 'hazards') onToggleEdge(id)
    },
    [mode, onToggleEdge],
  )

  const route = useMemo(() => {
    if (!data) return { status: 'no-data' as const, path: [], cost: 0, exitId: null }
    return computeRoute(data, blockedNodes, blockedEdges, closedExits, startId)
  }, [data, blockedNodes, blockedEdges, closedExits, startId])

  // Log route outcomes (side effect lives in an effect, not in render)
  const sig = `${route.status}|${route.path.join('>')}|${route.cost}`
  const prevSig = useRef('')
  useEffect(() => {
    if (!data || sig === prevSig.current) return
    prevSig.current = sig
    if (route.status === 'ok') {
      pushLog(`${t('logReroute')}: ${route.path.join(' → ')} (${t('totalCost')} ${route.cost})`)
    } else if (route.status === 'no-route' && startId) {
      pushLog(t('logNoRoute'))
    }
  }, [sig, data, route, startId, pushLog, t])

  const tk = (k: TKey) => t(k)

  const controlPanel = (
    <ControlPanel
      data={data}
      errors={errors}
      blockedNodes={blockedNodes}
      blockedEdges={blockedEdges}
      closedExits={closedExits}
      startId={startId}
      onImport={onImport}
      onSample={onSample}
      onReset={onReset}
      onSelectStart={onSelectStart}
      onToggleNode={onToggleNode}
      onToggleEdge={onToggleEdge}
      onToggleExit={onToggleExit}
      t={tk}
    />
  )
  const statusPanel = (
    <StatusPanel
      data={data}
      route={route}
      startId={startId}
      blockedNodes={blockedNodes}
      blockedEdges={blockedEdges}
      closedExits={closedExits}
      log={log}
      t={tk}
    />
  )

  return (
    <div className="se-scanlines min-h-screen bg-[#050810] flex flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-[#1a2540] bg-[#050810]/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 sm:px-5 h-[54px]">
          {/* radar mark */}
          <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
            <circle cx="13" cy="13" r="11.5" fill="none" stroke="#22d3ee" strokeWidth="1.4" opacity="0.8" />
            <circle cx="13" cy="13" r="6.5" fill="none" stroke="#22d3ee" strokeWidth="0.9" opacity="0.4" />
            <line x1="13" y1="13" x2="13" y2="2.5" stroke="#22d3ee" strokeWidth="1.6" className="se-radar-sweep" />
            <circle cx="13" cy="13" r="1.8" fill="#22d3ee" />
          </svg>
          <div className="min-w-0 leading-tight">
            <div className="font-mono2 text-[15px] font-bold tracking-wide text-[#dbe4f0] truncate">
              {t('appTitle')}
            </div>
            <div className="hidden sm:block text-[10.5px] text-[#6b7a94] truncate">{t('tagline')}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 font-mono2 text-[10px] uppercase tracking-[0.18em] text-[#34d399]">
              <span className="se-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#34d399]" />
              {data ? data.building : t('statusIdle')}
            </span>
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="min-h-[36px] rounded border border-[#1a2540] bg-[#0c1220] px-3 font-mono2 text-[11.5px] font-semibold text-[#9fb2cc] hover:border-[#22d3ee]/50 hover:text-[#22d3ee] transition-colors"
            >
              {t('langName')}
            </button>
          </div>
        </div>
      </header>

      {/* desktop layout */}
      <div className="mx-auto hidden w-full max-w-[1600px] flex-1 lg:grid lg:grid-cols-[290px_minmax(0,1fr)_330px] gap-0">
        <aside className="border-r border-[#1a2540] bg-[#0a0f1c] px-4 py-4 overflow-y-auto max-h-[calc(100vh-54px)]">
          {controlPanel}
        </aside>
        <main className="relative min-h-[420px]">
          <MapArea data={data} route={route} blockedNodes={blockedNodes} blockedEdges={blockedEdges}
            closedExits={closedExits} startId={startId} mode={mode} setMode={setMode}
            onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onSample={onSample} t={tk} />
        </main>
        <aside className="border-l border-[#1a2540] bg-[#0a0f1c] px-4 py-4 overflow-y-auto max-h-[calc(100vh-54px)]">
          {statusPanel}
        </aside>
      </div>

      {/* mobile layout */}
      <div className="flex flex-1 flex-col lg:hidden">
        <main className="relative h-[52vh] min-h-[340px] border-b border-[#1a2540]">
          <MapArea data={data} route={route} blockedNodes={blockedNodes} blockedEdges={blockedEdges}
            closedExits={closedExits} startId={startId} mode={mode} setMode={setMode}
            onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onSample={onSample} t={tk} />
        </main>
        <div className="flex border-b border-[#1a2540] bg-[#0a0f1c]">
          {(['route', 'control', 'file'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 min-h-[46px] font-mono2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                mobileTab === tab
                  ? 'text-[#22d3ee] border-b-2 border-[#22d3ee] bg-[#22d3ee]/5'
                  : 'text-[#6b7a94] hover:text-[#9fb2cc]'
              }`}
            >
              {tab === 'route' ? t('tabRoute') : tab === 'control' ? t('hazards') : t('tabFile')}
            </button>
          ))}
        </div>
        <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {mobileTab === 'route' && statusPanel}
          {mobileTab === 'control' && data && (
            <ControlPanel
              data={data} errors={[]} blockedNodes={blockedNodes} blockedEdges={blockedEdges}
              closedExits={closedExits} startId={startId} onImport={onImport} onSample={onSample}
              onReset={onReset} onSelectStart={onSelectStart} onToggleNode={onToggleNode}
              onToggleEdge={onToggleEdge} onToggleExit={onToggleExit} t={tk}
            />
          )}
          {mobileTab === 'file' && (
            <ControlPanel
              data={null} errors={errors} blockedNodes={blockedNodes} blockedEdges={blockedEdges}
              closedExits={closedExits} startId={startId} onImport={onImport} onSample={onSample}
              onReset={onReset} onSelectStart={onSelectStart} onToggleNode={onToggleNode}
              onToggleEdge={onToggleEdge} onToggleExit={onToggleExit} t={tk}
            />
          )}
        </div>
      </div>

      <footer className="border-t border-[#1a2540] px-4 py-2.5 text-center">
        <span className="text-[10.5px] text-[#43536f]">{t('simBadge')}</span>
      </footer>
    </div>
  )
}

/* Map area with mode toggle toolbar */
function MapArea(props: {
  data: BuildingData | null
  route: ReturnType<typeof computeRoute>
  blockedNodes: Set<string>
  blockedEdges: Set<string>
  closedExits: Set<string>
  startId: string | null
  mode: Mode
  setMode: (m: Mode) => void
  onNodeClick: (id: string) => void
  onEdgeClick: (id: string) => void
  onSample: () => void
  t: (k: TKey) => string
}) {
  const { data, mode, setMode, t } = props
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center gap-1.5 px-3 pt-2.5">
        {(['navigate', 'hazards'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`min-h-[34px] rounded border px-3 font-mono2 text-[10.5px] font-bold uppercase tracking-[0.16em] transition-all ${
              mode === m
                ? m === 'navigate'
                  ? 'border-[#22d3ee]/70 bg-[#22d3ee]/12 text-[#22d3ee]'
                  : 'border-[#f87171]/70 bg-[#f87171]/12 text-[#f87171]'
                : 'border-[#1a2540] bg-transparent text-[#6b7a94] hover:text-[#9fb2cc]'
            }`}
          >
            {m === 'navigate' ? t('modeNavigate') : t('modeHazards')}
          </button>
        ))}
      </div>
      <div className="relative flex-1 p-1">
        {data ? (
          <MapCanvas
            data={data}
            route={props.route}
            blockedNodes={props.blockedNodes}
            blockedEdges={props.blockedEdges}
            closedExits={props.closedExits}
            startId={props.startId}
            mode={mode}
            onNodeClick={props.onNodeClick}
            onEdgeClick={props.onEdgeClick}
            t={t}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" opacity="0.9">
              <rect x="8" y="8" width="24" height="24" rx="5" stroke="#3b4d75" strokeWidth="2" />
              <rect x="40" y="40" width="24" height="24" rx="5" stroke="#34d399" strokeWidth="2" transform="rotate(45 52 52)" />
              <circle cx="52" cy="20" r="11" stroke="#3b4d75" strokeWidth="2" />
              <path d="M32 20h9M20 32v18q0 4 4 4h8" stroke="#2b3a5c" strokeWidth="2.5" strokeDasharray="5 5" />
            </svg>
            <p className="max-w-[300px] text-[13px] leading-relaxed text-[#6b7a94]">{t('importing')}</p>
            <button
              onClick={props.onSample}
              className="min-h-[40px] rounded border border-[#22d3ee]/60 bg-[#22d3ee]/10 px-5 font-mono2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#22d3ee] hover:bg-[#22d3ee]/20 transition-colors"
            >
              {t('loadSample')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
