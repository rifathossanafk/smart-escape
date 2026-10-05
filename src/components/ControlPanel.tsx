import { useRef } from 'react'
import type { BuildingData } from '@/lib/types'
import type { TKey } from '@/lib/i18n'

interface Props {
  data: BuildingData | null
  errors: string[]
  blockedNodes: Set<string>
  blockedEdges: Set<string>
  closedExits: Set<string>
  startId: string | null
  onImport: (file: File) => void
  onSample: () => void
  onReset: () => void
  onSelectStart: (id: string) => void
  onToggleNode: (id: string) => void
  onToggleEdge: (id: string) => void
  onToggleExit: (id: string) => void
  t: (k: TKey) => string
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b7a94] pt-4 pb-2 border-t border-[#1a2540] first:border-t-0 first:pt-0">
      {children}
    </div>
  )
}

function ToggleRow(props: {
  id: string
  sub: string
  active: boolean
  activeLabel: string
  idleLabel: string
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-[#111a2b] transition-colors">
      <div className="min-w-0">
        <span className={`font-mono2 text-[13px] font-semibold ${props.active ? 'text-[#f87171]' : 'text-[#dbe4f0]'}`}>
          {props.id}
        </span>
        <span className="ml-2 text-[11px] text-[#6b7a94] truncate">{props.sub}</span>
      </div>
      <button
        onClick={props.onClick}
        data-hazard={props.id}
        className={`shrink-0 min-h-[30px] px-2.5 rounded border font-mono2 text-[10.5px] font-semibold uppercase tracking-wider transition-all duration-200 ${
          props.active
            ? 'border-[#f87171]/70 bg-[#f87171]/15 text-[#f87171] hover:bg-[#f87171]/25'
            : 'border-[#1a2540] bg-transparent text-[#6b7a94] hover:border-[#22d3ee]/50 hover:text-[#22d3ee]'
        }`}
      >
        {props.active ? props.activeLabel : props.idleLabel}
      </button>
    </div>
  )
}

export default function ControlPanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { t, data } = p

  return (
    <div className="flex flex-col gap-1">
      <SectionTitle>{t('tabFile')}</SectionTitle>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) p.onImport(f)
          e.target.value = ''
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 min-h-[38px] rounded border border-[#22d3ee]/50 bg-[#22d3ee]/10 px-3 font-mono2 text-[11.5px] font-semibold uppercase tracking-wider text-[#22d3ee] hover:bg-[#22d3ee]/20 transition-colors"
        >
          {t('importFile')}
        </button>
        <button
          onClick={p.onSample}
          className="flex-1 min-h-[38px] rounded border border-[#1a2540] bg-[#0c1220] px-3 font-mono2 text-[11.5px] font-semibold uppercase tracking-wider text-[#9fb2cc] hover:border-[#34d399]/50 hover:text-[#34d399] transition-colors"
        >
          {t('loadSample')}
        </button>
      </div>

      {p.errors.length > 0 && (
        <div className="mt-2 rounded border border-[#f87171]/50 bg-[#f87171]/8 p-3 se-fade-up">
          <div className="font-mono2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f87171] mb-1.5">
            ⚠ {t('invalidFile')}
          </div>
          <ul className="space-y-1">
            {p.errors.slice(0, 8).map((e, i) => (
              <li key={i} className="text-[11.5px] leading-snug text-[#fca5a5]">• {e}</li>
            ))}
            {p.errors.length > 8 && (
              <li className="text-[11.5px] text-[#fca5a5]">… +{p.errors.length - 8}</li>
            )}
          </ul>
        </div>
      )}

      {data && (
        <>
          <div className="mt-2 flex items-center justify-between rounded border border-[#1a2540] bg-[#0c1220] px-3 py-2">
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-[#dbe4f0] truncate">{data.building}</div>
              <div className="font-mono2 text-[10.5px] text-[#6b7a94]">
                {data.nodes.length} {t('nodes')} · {data.edges.length} {t('edges')}
              </div>
            </div>
            <button
              onClick={p.onReset}
              title={t('resetHint')}
              className="shrink-0 min-h-[34px] rounded border border-[#fbbf24]/50 bg-[#fbbf24]/10 px-3 font-mono2 text-[10.5px] font-semibold uppercase tracking-wider text-[#fbbf24] hover:bg-[#fbbf24]/20 transition-colors"
            >
              ⟲ {t('reset')}
            </button>
          </div>

          <SectionTitle>{t('startLocation')}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {data.nodes.filter((n) => n.type !== 'exit').map((n) => {
              const blocked = p.blockedNodes.has(n.id)
              const sel = p.startId === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => p.onSelectStart(n.id)}
                  className={`min-h-[36px] min-w-[52px] rounded border px-2.5 font-mono2 text-[12px] font-semibold transition-all duration-200 ${
                    sel
                      ? 'border-[#fbbf24] bg-[#fbbf24]/15 text-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : blocked
                        ? 'border-[#f87171]/40 bg-transparent text-[#f87171]/60 line-through'
                        : 'border-[#1a2540] bg-[#0c1220] text-[#9fb2cc] hover:border-[#fbbf24]/60 hover:text-[#fbbf24]'
                  }`}
                >
                  {n.id}
                </button>
              )
            })}
          </div>

          <SectionTitle>{t('hazards')} — {t('roomsJunctions')}</SectionTitle>
          <div>
            {data.nodes.filter((n) => n.type !== 'exit').map((n) => (
              <ToggleRow
                key={n.id}
                id={n.id}
                sub={n.label}
                active={p.blockedNodes.has(n.id)}
                activeLabel={t('blocked')}
                idleLabel={t('clear')}
                onClick={() => p.onToggleNode(n.id)}
              />
            ))}
          </div>

          <SectionTitle>{t('hazards')} — {t('corridors')}</SectionTitle>
          <div>
            {data.edges.map((e) => (
              <ToggleRow
                key={e.id}
                id={`${e.from}↔${e.to}`}
                sub={`${t('totalCost')} ${e.cost}`}
                active={p.blockedEdges.has(e.id)}
                activeLabel={t('blocked')}
                idleLabel={t('clear')}
                onClick={() => p.onToggleEdge(e.id)}
              />
            ))}
          </div>

          <SectionTitle>{t('hazards')} — {t('exits')}</SectionTitle>
          <div className="pb-2">
            {data.nodes.filter((n) => n.type === 'exit').map((n) => (
              <ToggleRow
                key={n.id}
                id={n.id}
                sub={n.label}
                active={p.closedExits.has(n.id)}
                activeLabel={t('closed')}
                idleLabel={t('open')}
                onClick={() => p.onToggleExit(n.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
