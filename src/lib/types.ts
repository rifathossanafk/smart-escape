export type NodeType = 'room' | 'junction' | 'exit'

export interface BuildingNode {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
}

export interface BuildingEdge {
  id: string
  from: string
  to: string
  cost: number
}

export interface InitialState {
  blocked_nodes: string[]
  blocked_edges: string[]
  closed_exits: string[]
}

export interface BuildingData {
  building: string
  nodes: BuildingNode[]
  edges: BuildingEdge[]
  initial_state: InitialState
}

export type RouteStatus = 'no-data' | 'no-start' | 'start-blocked' | 'ok' | 'no-route'

export interface RouteResult {
  status: RouteStatus
  path: string[]
  cost: number
  exitId: string | null
}

export interface LogEntry {
  time: string
  text: string
}
