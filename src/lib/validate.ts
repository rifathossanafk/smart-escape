import type { BuildingData, BuildingEdge, BuildingNode, InitialState } from './types'

const NODE_TYPES = new Set(['room', 'junction', 'exit'])

/**
 * Validates a raw parsed JSON value against the Smart Escape schema.
 * Returns a normalized BuildingData on success, or a list of human-readable errors.
 */
export function validateBuilding(raw: unknown): { ok: true; data: BuildingData } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['Root value must be a JSON object.'] }
  }
  const obj = raw as Record<string, unknown>

  // building
  if (typeof obj.building !== 'string' || obj.building.trim() === '') {
    errors.push('Field "building" must be a non-empty string.')
  }

  // nodes
  const nodes: BuildingNode[] = []
  const nodeIds = new Set<string>()
  if (!Array.isArray(obj.nodes)) {
    errors.push('Field "nodes" must be an array.')
  } else {
    if (obj.nodes.length < 2 || obj.nodes.length > 60) {
      errors.push(`"nodes" must contain 2-60 entries (got ${obj.nodes.length}).`)
    }
    obj.nodes.forEach((n, i) => {
      const where = `nodes[${i}]`
      if (typeof n !== 'object' || n === null) {
        errors.push(`${where}: must be an object.`)
        return
      }
      const node = n as Record<string, unknown>
      if (typeof node.id !== 'string' || node.id === '') {
        errors.push(`${where}: "id" must be a non-empty string.`)
      } else if (nodeIds.has(node.id)) {
        errors.push(`${where}: duplicate node id "${node.id}".`)
      } else {
        nodeIds.add(node.id)
      }
      if (typeof node.label !== 'string' || node.label.trim() === '') {
        errors.push(`${where}: "label" must be a non-empty string.`)
      }
      if (typeof node.type !== 'string' || !NODE_TYPES.has(node.type)) {
        errors.push(`${where}: "type" must be "room", "junction" or "exit".`)
      }
      if (typeof node.x !== 'number' || !Number.isFinite(node.x) || typeof node.y !== 'number' || !Number.isFinite(node.y)) {
        errors.push(`${where}: "x" and "y" must be numeric coordinates.`)
      }
      if (
        typeof node.id === 'string' && node.id !== '' &&
        typeof node.label === 'string' && node.label.trim() !== '' &&
        typeof node.type === 'string' && NODE_TYPES.has(node.type) &&
        typeof node.x === 'number' && Number.isFinite(node.x) &&
        typeof node.y === 'number' && Number.isFinite(node.y)
      ) {
        nodes.push({ id: node.id, label: node.label, type: node.type as BuildingNode['type'], x: node.x, y: node.y })
      }
    })
    const hasNonExit = nodes.some((n) => n.type === 'room' || n.type === 'junction')
    const hasExit = nodes.some((n) => n.type === 'exit')
    if (!hasNonExit) errors.push('At least one room or junction node is required.')
    if (!hasExit) errors.push('At least one exit node is required.')
  }

  // edges
  const edges: BuildingEdge[] = []
  const edgeIds = new Set<string>()
  const pairs = new Set<string>()
  if (!Array.isArray(obj.edges)) {
    errors.push('Field "edges" must be an array.')
  } else {
    if (obj.edges.length < 1 || obj.edges.length > 150) {
      errors.push(`"edges" must contain 1-150 entries (got ${obj.edges.length}).`)
    }
    obj.edges.forEach((e, i) => {
      const where = `edges[${i}]`
      if (typeof e !== 'object' || e === null) {
        errors.push(`${where}: must be an object.`)
        return
      }
      const edge = e as Record<string, unknown>
      const idOk = typeof edge.id === 'string' && edge.id !== ''
      if (!idOk) {
        errors.push(`${where}: "id" must be a non-empty string.`)
      } else if (edgeIds.has(edge.id as string)) {
        errors.push(`${where}: duplicate edge id "${edge.id}".`)
      } else {
        edgeIds.add(edge.id as string)
      }
      const fromOk = typeof edge.from === 'string' && nodeIds.has(edge.from)
      const toOk = typeof edge.to === 'string' && nodeIds.has(edge.to)
      if (typeof edge.from !== 'string' || !fromOk) errors.push(`${where}: "from" must reference an existing node id.`)
      if (typeof edge.to !== 'string' || !toOk) errors.push(`${where}: "to" must reference an existing node id.`)
      if (fromOk && toOk) {
        if (edge.from === edge.to) {
          errors.push(`${where}: self-loops are not allowed ("${edge.from}").`)
        }
        const key = [edge.from as string, edge.to as string].sort().join('||')
        if (pairs.has(key)) {
          errors.push(`${where}: repeated node pair "${edge.from}" <-> "${edge.to}".`)
        }
        pairs.add(key)
      }
      const costOk = typeof edge.cost === 'number' && Number.isInteger(edge.cost) && edge.cost > 0
      if (!costOk) errors.push(`${where}: "cost" must be a positive integer.`)
      if (idOk && fromOk && toOk && costOk && edge.from !== edge.to) {
        edges.push({ id: edge.id as string, from: edge.from as string, to: edge.to as string, cost: edge.cost as number })
      }
    })
  }

  // initial_state
  let initial: InitialState = { blocked_nodes: [], blocked_edges: [], closed_exits: [] }
  const is = obj.initial_state
  if (typeof is !== 'object' || is === null || Array.isArray(is)) {
    errors.push('Field "initial_state" must be an object with blocked_nodes, blocked_edges and closed_exits arrays.')
  } else {
    const state = is as Record<string, unknown>
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    const checkIds = (field: 'blocked_nodes' | 'blocked_edges' | 'closed_exits'): string[] => {
      const v = state[field]
      if (!Array.isArray(v)) {
        errors.push(`initial_state."${field}" must be an array.`)
        return []
      }
      const out: string[] = []
      v.forEach((id, i) => {
        const where = `initial_state."${field}"[${i}]`
        if (typeof id !== 'string') {
          errors.push(`${where}: must be a string id.`)
          return
        }
        if (field === 'blocked_nodes') {
          const n = nodeById.get(id)
          if (!n) errors.push(`${where}: unknown node id "${id}".`)
          else if (n.type === 'exit') errors.push(`${where}: "${id}" is an exit; only rooms/junctions can be blocked nodes.`)
          else out.push(id)
        } else if (field === 'blocked_edges') {
          if (!edgeIds.has(id)) errors.push(`${where}: unknown edge id "${id}".`)
          else out.push(id)
        } else {
          const n = nodeById.get(id)
          if (!n) errors.push(`${where}: unknown node id "${id}".`)
          else if (n.type !== 'exit') errors.push(`${where}: "${id}" is not an exit; only exits can be closed.`)
          else out.push(id)
        }
      })
      return out
    }
    initial = {
      blocked_nodes: checkIds('blocked_nodes'),
      blocked_edges: checkIds('blocked_edges'),
      closed_exits: checkIds('closed_exits'),
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    data: { building: (obj.building as string).trim(), nodes, edges, initial_state: initial },
  }
}
