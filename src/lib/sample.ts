import type { BuildingData } from './types'

/**
 * The sample dataset from the problem statement.
 * Baseline: R1 -> C1 -> C2 -> E1 (cost 7).
 * After blocking C2: R1 -> C1 -> C3 -> C4 -> E2 (cost 11).
 * From R2: R2 -> C3 -> C4 -> E2 (cost 7).
 */
export const SAMPLE_BUILDING: BuildingData = {
  building: 'DevFest Demo Hall',
  nodes: [
    { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
    { id: 'C1', label: 'Junction C1', type: 'junction', x: 160, y: 0 },
    { id: 'C2', label: 'Junction C2', type: 'junction', x: 320, y: 0 },
    { id: 'E1', label: 'Exit 1', type: 'exit', x: 480, y: 0 },
    { id: 'R2', label: 'Room 2', type: 'room', x: 0, y: 180 },
    { id: 'C3', label: 'Junction C3', type: 'junction', x: 160, y: 180 },
    { id: 'C4', label: 'Junction C4', type: 'junction', x: 320, y: 180 },
    { id: 'E2', label: 'Exit 2', type: 'exit', x: 480, y: 180 },
  ],
  edges: [
    { id: 'e1', from: 'R1', to: 'C1', cost: 2 },
    { id: 'e2', from: 'C1', to: 'C2', cost: 2 },
    { id: 'e3', from: 'C2', to: 'E1', cost: 3 },
    { id: 'e4', from: 'R2', to: 'C3', cost: 2 },
    { id: 'e5', from: 'C3', to: 'C4', cost: 2 },
    { id: 'e6', from: 'C4', to: 'E2', cost: 3 },
    { id: 'e7', from: 'R1', to: 'R2', cost: 6 },
    { id: 'e8', from: 'C1', to: 'C3', cost: 4 },
    { id: 'e9', from: 'C2', to: 'C4', cost: 5 },
    { id: 'e10', from: 'E1', to: 'E2', cost: 9 },
  ],
  initial_state: {
    blocked_nodes: [],
    blocked_edges: [],
    closed_exits: [],
  },
}

export const SAMPLE_JSON_STRING = JSON.stringify(SAMPLE_BUILDING, null, 2)
