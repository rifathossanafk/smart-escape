import type { BuildingData, LogEntry, RouteResult } from '@/lib/types'
import type { TKey } from '@/lib/i18n'

interface Props {
  data: BuildingData | null
  route: RouteResult
  startId: string | null
  blockedNodes: Set<string>
  blockedEdges: Set<string>
  closedExits: Set<string>
  log: LogEntry[]
  t: (k: TKey) => string
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b7a94] pt-4 pb-2 border-t border-[#1a2540] first:border-t-0 first:pt-0">
      {children}
    </div>
  )
}

export default function StatusPanel(p: Props) {
  const { route, t } = p

  const statusConfig = {
    'no-data': { label: t('statusIdle'), cls: 'text-[#6b7a94] border-[#1a2540]', dot: '#6b7a94' },
    'no-start': { label: t('statusIdle'), cls: 'text-[#6b7a94] border-[#1a2540]', dot: '#6b7a94' },
    ok: { label: t('statusOk'), cls: 'text-[#34d399] border-[#34d399]/60', dot: '#34d399' },
    'no-route': { label: t('statusNoRoute'), cls: 'text-[#f87171] border-[#f87171]/60', dot: '#f87171' },
    'start-blocked': { label: t('statusBlocked'), cls: 'text-[#fbbf24] border-[#fbbf24]/60', dot: '#fbbf24' },
  }[route.status]

  const hazardCount = p.blockedNodes.size + p.blockedEdges.size + p.closedExits.size

  return (
    <div className="flex flex-col">
      <SectionTitle>{t('routeStatus')}</SectionTitle>

      {/* status banner */}
      <div key={route.status + route.path.join('')} className={`rounded border ${statusConfig.cls} bg-[#0c1220] px-3 py-2.5 flex items-center gap-2.5 se-fade-up`}>
        <span className="se-live-dot inline-block h-2 w-2 rounded-full" style={{ background: statusConfig.dot }} />
        <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.18em]">{statusConfig.label}</span>
      </div>

      {/* message / route detail */}
      <div className="mt-2.5">
        {route.status === 'no-start' && (
          <p className="text-[12.5px] text-[#6b7a94] leading-relaxed">{t('pickStart')}</p>
        )}
        {route.status === 'no-route' && (
          <div className="rounded border border-[#f87171]/40 bg-[#f87171]/8 px-3 py-3">
            <div className="text-[14px] font-bold text-[#f87171]">{t('noRoute')}</div>
          </div>
        )}
        {route.status === 'start-blocked' && (
          <div className="rounded border border-[#fbbf24]/40 bg-[#fbbf24]/8 px-3 py-3">
            <div className="text-[14px] font-bold text-[#fbbf24]">{t('startBlocked')}</div>
          </div>
        )}
        {route.status === 'ok' && (
          <div className="rounded border border-[#1a2540] bg-[#0c1220] p-3 se-fade-up">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="font-mono2 text-[9.5px] uppercase tracking-[0.2em] text-[#6b7a94]">{t('totalCost')}</div>
                <div className="font-mono2 text-[26px] font-bold text-[#22d3ee] leading-tight">{route.cost}</div>
              </div>
              <div>
                <div className="font-mono2 text-[9.5px] uppercase tracking-[0.2em] text-[#6b7a94]">{t('exit')}</div>
                <div className="font-mono2 text-[26px] font-bold text-[#34d399] leading-tight">{route.exitId}</div>
              </div>
            </div>
            <div className="font-mono2 text-[9.5px] uppercase tracking-[0.2em] text-[#6b7a94] mb-1.5">
              {t('path')} · {route.path.length - 1} {t('corridorCount')}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {route.path.map((id, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className={`font-mono2 text-[12px] font-semibold rounded px-1.5 py-0.5 border ${
                      i === 0
                        ? 'border-[#fbbf24]/60 bg-[#fbbf24]/12 text-[#fbbf24]'
                        : i === route.path.length - 1
                          ? 'border-[#34d399]/60 bg-[#34d399]/12 text-[#34d399]'
                          : 'border-[#22d3ee]/40 bg-[#22d3ee]/8 text-[#22d3ee]'
                    }`}
                  >
                    {id}
                  </span>
                  {i < route.path.length - 1 && <span className="text-[#43536f] text-[10px]">→</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <SectionTitle>{t('hazardSummary')}</SectionTitle>
      {hazardCount === 0 ? (
        <p className="text-[12px] text-[#34d399]/80">✓ {t('noHazards')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[...p.blockedNodes].map((id) => (
            <span key={`n${id}`} className="font-mono2 text-[11px] rounded border border-[#f87171]/50 bg-[#f87171]/10 text-[#f87171] px-1.5 py-0.5">{id} ✕</span>
          ))}
          {[...p.blockedEdges].map((id) => {
            const e = p.data?.edges.find((x) => x.id === id)
            return (
              <span key={`e${id}`} className="font-mono2 text-[11px] rounded border border-[#f87171]/50 bg-[#f87171]/10 text-[#f87171] px-1.5 py-0.5">
                {e ? `${e.from}↔${e.to}` : id} ✕
              </span>
            )
          })}
          {[...p.closedExits].map((id) => (
            <span key={`x${id}`} className="font-mono2 text-[11px] rounded border border-[#fbbf24]/50 bg-[#fbbf24]/10 text-[#fbbf24] px-1.5 py-0.5">{id} ⊘</span>
          ))}
        </div>
      )}

      <SectionTitle>{t('legend')}</SectionTitle>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] text-[#9fb2cc]">
        <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-[3px] border-[1.8px] border-[#3b4d75] bg-[#0c1220]" />{t('legendRoom')}</span>
        <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-[1.8px] border-[#3b4d75] bg-[#0c1220]" />{t('legendJunction')}</span>
        <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rotate-45 border-[1.8px] border-[#34d399] bg-[#34d399]/20" />{t('legendExit')}</span>
        <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-[1.8px] border-[#f87171] bg-[#f87171]/15" />{t('legendBlocked')}</span>
        <span className="flex items-center gap-2"><i className="inline-block h-[3px] w-4 rounded bg-[#22d3ee]" />{t('legendRoute')}</span>
        <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-2 border-[#fbbf24]" />{t('legendStart')}</span>
      </div>

      <SectionTitle>{t('eventLog')}</SectionTitle>
      {p.log.length === 0 ? (
        <p className="text-[11.5px] text-[#43536f] pb-2">{t('logEmpty')}</p>
      ) : (
        <div className="space-y-1 pb-2 max-h-[180px] overflow-y-auto pr-1">
          {p.log.slice(0, 30).map((l, i) => (
            <div key={i} className="flex gap-2 font-mono2 text-[10.5px] leading-relaxed se-fade-up">
              <span className="text-[#43536f] shrink-0">{l.time}</span>
              <span className="text-[#9fb2cc]">{l.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
