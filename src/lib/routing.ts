import type { BuildingData, RouteResult } from './types'

/**
 * Dijkstra over the allowed subgraph.
 * Returns a map of node id -> minimum cost from `start`.
 */
function dijkstra(
  adj: Map<string, { to: string; cost: number }[]>,
  start: string,
): Map<string, number> {
  const dist = new Map<string, number>()
  dist.set(start, 0)
  const visited = new Set<string>()
  // Graph limits are tiny (<= 60 nodes), a linear-scan queue is fine.
  while (true) {
    let u: string | null = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d
        u = id
      }
    }
    if (u === null) break
    visited.add(u)
    for (const { to, cost } of adj.get(u) ?? []) {
      const nd = best + cost
      if (nd < (dist.get(to) ?? Infinity)) dist.set(to, nd)
    }
  }
  return dist
}

/**
 * Computes the lowest-cost route from `startId` to an accessible exit.
 *
 * Rules (per problem statement):
 * - Blocked nodes, blocked edges and closed exits are excluded from the graph
 *   (closed exits cannot even be used as intermediate nodes).
 * - Among reachable open exits: minimum total cost; ties broken by the
 *   lexicographically smallest exit id; remaining ties broken by the
 *   lexicographically smallest sequence of node ids.
 */
export function computeRoute(
  data: BuildingData,
  blockedNodes: Set<string>,
  blockedEdges: Set<string>,
  closedExits: Set<string>,
  startId: string | null,
): RouteResult {
  const none = (status: RouteResult['status']): RouteResult => ({ status, path: [], cost: 0, exitId: null })

  if (!startId) return none('no-start')
  const startNode = data.nodes.find((n) => n.id === startId)
  if (!startNode) return none('no-start')
  if (blockedNodes.has(startId)) return none('start-blocked')

  // Build the allowed subgraph.
  const allowed = new Set<string>()
  for (const n of data.nodes) {
    if (blockedNodes.has(n.id)) continue
    if (n.type === 'exit' && closedExits.has(n.id)) continue
    allowed.add(n.id)
  }
  const adj = new Map<string, { to: string; cost: number }[]>()
  for (const e of data.edges) {
    if (blockedEdges.has(e.id)) continue
    if (!allowed.has(e.from) || !allowed.has(e.to)) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.from)!.push({ to: e.to, cost: e.cost })
    adj.get(e.to)!.push({ to: e.from, cost: e.cost })
  }

  const distS = dijkstra(adj, startId)

  // Choose target exit: min (cost, exitId).
  let target: string | null = null
  let targetCost = Infinity
  for (const n of data.nodes) {
    if (n.type !== 'exit' || closedExits.has(n.id)) continue
    const d = distS.get(n.id)
    if (d === undefined) continue
    if (d < targetCost || (d === targetCost && target !== null && n.id < target)) {
      target = n.id
      targetCost = d
    }
  }
  if (target === null) return none('no-route')

  // Lexicographically smallest shortest path from start to target.
  const distT = dijkstra(adj, target)
  const path: string[] = [startId]
  let u = startId
  const guard = data.nodes.length + 2
  for (let steps = 0; u !== target && steps < guard; steps++) {
    let next: string | null = null
    for (const { to, cost } of adj.get(u) ?? []) {
      const ds = distS.get(to)
      const dt = distT.get(to)
      if (ds === undefined || dt === undefined) continue
      if (distS.get(u)! + cost === ds && ds + dt === targetCost) {
        if (next === null || to < next) next = to
      }
    }
    if (next === null) break
    path.push(next)
    u = next
  }

  return { status: 'ok', path, cost: targetCost, exitId: target }
}
