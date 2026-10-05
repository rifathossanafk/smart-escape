import { useMemo } from 'react'
import type { BuildingData, RouteResult } from '@/lib/types'
import type { TKey } from '@/lib/i18n'

interface Props {
  data: BuildingData
  route: RouteResult
  blockedNodes: Set<string>
  blockedEdges: Set<string>
  closedExits: Set<string>
  startId: string | null
  mode: 'navigate' | 'hazards'
  onNodeClick: (id: string) => void
  onEdgeClick: (id: string) => void
  t: (k: TKey) => string
}

const PAD = 90

export default function MapCanvas({
  data, route, blockedNodes, blockedEdges, closedExits, startId, mode, onNodeClick, onEdgeClick, t,
}: Props) {
  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data])

  const view = useMemo(() => {
    const xs = data.nodes.map((n) => n.x)
    const ys = data.nodes.map((n) => n.y)
    const minX = Math.min(...xs) - PAD
    const minY = Math.min(...ys) - PAD
    const w = Math.max(...xs) - Math.min(...xs) + PAD * 2
    const h = Math.max(...ys) - Math.min(...ys) + PAD * 2
    return { minX, minY, w: Math.max(w, 200), h: Math.max(h, 200) }
  }, [data])

  const routePath = useMemo(() => {
    if (route.status !== 'ok') return ''
    return route.path
      .map((id, i) => {
        const n = nodeById.get(id)!
        return `${i === 0 ? 'M' : 'L'} ${n.x} ${n.y}`
      })
      .join(' ')
  }, [route, nodeById])

  const routeNodeSet = useMemo(() => new Set(route.path), [route])

  return (
    <svg
      viewBox={`${view.minX} ${view.minY} ${view.w} ${view.h}`}
      className="h-full w-full select-none"
      role="application"
      aria-label="Building map"
    >
      <defs>
        <pattern id="se-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="rgba(248,113,113,0.10)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(248,113,113,0.45)" strokeWidth="1.6" />
        </pattern>
        <filter id="se-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* faint grid backdrop */}
      <GridBackdrop view={view} />

      {/* corridors */}
      {data.edges.map((e) => {
        const a = nodeById.get(e.from)!
        const b = nodeById.get(e.to)!
        const isBlocked = blockedEdges.has(e.id)
        const endBlocked = blockedNodes.has(e.from) || blockedNodes.has(e.to)
        const dimmed = isBlocked || endBlocked
        const midX = (a.x + b.x) / 2
        const midY = (a.y + b.y) / 2
        return (
          <g key={e.id} className={mode === 'hazards' ? 'cursor-pointer' : ''} onClick={() => onEdgeClick(e.id)}>
            {/* fat invisible hit area */}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={26} />
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isBlocked ? 'rgba(248,113,113,0.55)' : endBlocked ? 'rgba(107,122,148,0.25)' : '#2b3a5c'}
              strokeWidth={isBlocked ? 2.5 : 3.5}
              strokeDasharray={isBlocked ? '7 6' : undefined}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.25s ease' }}
            />
            {/* cost chip */}
            <g transform={`translate(${midX} ${midY})`} style={{ transition: 'opacity 0.25s ease' }} opacity={dimmed ? 0.45 : 1}>
              <rect x={-16} y={-10} width={32} height={20} rx={4}
                fill={isBlocked ? 'rgba(60,18,22,0.92)' : 'rgba(12,18,32,0.92)'}
                stroke={isBlocked ? 'rgba(248,113,113,0.6)' : '#1a2540'} />
              <text textAnchor="middle" dy={4} fontSize={12}
                className="font-mono2"
                fill={isBlocked ? '#f87171' : '#9fb2cc'}
                style={{ textDecoration: isBlocked ? 'line-through' : 'none' }}>
                {e.cost}
              </text>
            </g>
          </g>
        )
      })}

      {/* active route: glow + draw + flow */}
      {route.status === 'ok' && routePath && (
        <g key={route.path.join('>')} pointerEvents="none">
          <path d={routePath} fill="none" stroke="rgba(34,211,238,0.16)" strokeWidth={16}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#se-glow)" />
          <path d={routePath} fill="none" stroke="#22d3ee" strokeWidth={4.5}
            strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="se-route-line" />
          <path d={routePath} fill="none" stroke="rgba(224,254,255,0.9)" strokeWidth={1.6}
            strokeLinecap="round" className="se-route-flow" />
        </g>
      )}

      {/* nodes */}
      {data.nodes.map((n) => {
        const isBlocked = blockedNodes.has(n.id)
        const isClosed = n.type === 'exit' && closedExits.has(n.id)
        const isHazard = isBlocked || isClosed
        const isStart = n.id === startId
        const onRoute = routeNodeSet.has(n.id)
        const size = n.type === 'exit' ? 20 : n.type === 'room' ? 19 : 14
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}
            className="cursor-pointer"
            onClick={() => onNodeClick(n.id)}
            style={{ transition: 'opacity 0.25s ease' }}>
            {isStart && (
              <circle r={size + 13} fill="none" stroke="#fbbf24" strokeWidth={1.6} className="se-node-pulse" />
            )}
            {isStart && <circle r={size + 8} fill="none" stroke="#fbbf24" strokeWidth={2.4} />}
            {onRoute && !isStart && (
              <circle r={size + 7} fill="none" stroke="rgba(34,211,238,0.65)" strokeWidth={2} className="se-live-dot" />
            )}

            {n.type === 'room' && (
              <rect x={-size} y={-size} width={size * 2} height={size * 2} rx={5}
                fill={isHazard ? 'url(#se-hatch)' : onRoute ? 'rgba(34,211,238,0.18)' : '#0c1220'}
                stroke={isHazard ? '#f87171' : onRoute ? '#22d3ee' : '#3b4d75'}
                strokeWidth={isHazard || onRoute ? 2.4 : 1.8}
                style={{ transition: 'stroke 0.25s ease, fill 0.25s ease' }} />
            )}
            {n.type === 'junction' && (
              <circle r={size}
                fill={isHazard ? 'url(#se-hatch)' : onRoute ? 'rgba(34,211,238,0.18)' : '#0c1220'}
                stroke={isHazard ? '#f87171' : onRoute ? '#22d3ee' : '#3b4d75'}
                strokeWidth={isHazard || onRoute ? 2.4 : 1.8}
                style={{ transition: 'stroke 0.25s ease, fill 0.25s ease' }} />
            )}
            {n.type === 'exit' && (
              <>
                {!isClosed && <circle r={size + 6} fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth={1.2} className="se-live-dot" />}
                <rect x={-size * 0.78} y={-size * 0.78} width={size * 1.56} height={size * 1.56}
                  transform="rotate(45)"
                  fill={isClosed ? 'url(#se-hatch)' : onRoute ? 'rgba(52,211,153,0.9)' : 'rgba(52,211,153,0.14)'}
                  stroke={isClosed ? '#f87171' : '#34d399'}
                  strokeWidth={2.2}
                  style={{ transition: 'stroke 0.25s ease, fill 0.25s ease' }} />
                {onRoute && !isClosed && (
                  <text textAnchor="middle" dy={4.5} fontSize={13} fontWeight={700} fill="#052014" className="font-mono2">✓</text>
                )}
              </>
            )}
            {isHazard && (
              <g stroke="#f87171" strokeWidth={2.6} strokeLinecap="round">
                <line x1={-7} y1={-7} x2={7} y2={7} />
                <line x1={7} y1={-7} x2={-7} y2={7} />
              </g>
            )}

            {/* id + label */}
            <text y={-size - 12} textAnchor="middle" fontSize={13.5} fontWeight={600}
              className="font-mono2"
              fill={isHazard ? '#f87171' : isStart ? '#fbbf24' : onRoute ? '#22d3ee' : '#dbe4f0'}
              style={{ transition: 'fill 0.25s ease' }}>
              {n.id}
            </text>
            <text y={size + 20} textAnchor="middle" fontSize={11.5} fill={isHazard ? 'rgba(248,113,113,0.75)' : '#6b7a94'}>
              {n.label}
            </text>
          </g>
        )
      })}

      {/* empty helper */}
      <text x={view.minX + 14} y={view.minY + view.h - 12} fontSize={11} fill="#43536f" className="font-mono2">
        {mode === 'navigate' ? t('modeNavigateHint') : t('modeHazardsHint')}
      </text>
    </svg>
  )
}

function GridBackdrop({ view }: { view: { minX: number; minY: number; w: number; h: number } }) {
  const lines = []
  const step = 40
  const x0 = Math.floor(view.minX / step) * step
  const y0 = Math.floor(view.minY / step) * step
  for (let x = x0; x < view.minX + view.w; x += step) {
    lines.push(<line key={`v${x}`} x1={x} y1={view.minY} x2={x} y2={view.minY + view.h} stroke="rgba(26,37,64,0.4)" strokeWidth={0.6} />)
  }
  for (let y = y0; y < view.minY + view.h; y += step) {
    lines.push(<line key={`h${y}`} x1={view.minX} y1={y} x2={view.minX + view.w} y2={y} stroke="rgba(26,37,64,0.4)" strokeWidth={0.6} />)
  }
  return <g pointerEvents="none">{lines}</g>
}
