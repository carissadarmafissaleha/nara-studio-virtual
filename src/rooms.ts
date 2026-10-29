// ===== ROOM DEFINITIONS =====
// Each room is an empty shell with positions for furniture placement
// Furniture items are placed on a grid within each room

export type RoomId =
  | 'main-office'
  | 'manager-office'
  | 'ceo-office'
  | 'meeting-room'
  | 'kitchen'
  | 'server-room'
  | 'lobby'
  | 'nap-room'
  | 'rooftop'
  | 'gym'
  | 'parking'

export interface Waypoint {
  id: string
  x: number  // percentage
  y: number
  connections: string[]  // ids of connected waypoints
}

export interface FurnitureItem {
  id: string
  type: string        // e.g. 'desk-dual', 'chair-aeron', 'plant-monstera'
  sprite: string      // sprite sheet + frame reference
  x: number           // percentage position within room (0-100)
  y: number
  zIndex?: number
  state?: string      // e.g. 'empty', 'occupied', 'brewing'
  interactive?: boolean
  label?: string
}

export type SpriteFacing = 'front-left' | 'front-right' | 'rear-left' | 'rear-right'

export interface RoomConnection {
  toRoom: RoomId
  position: { x: number; y: number }  // door/exit position in current room (%)
  label?: string
  exitFacing?: SpriteFacing   // agent direction when leaving through this door
  entryFacing?: SpriteFacing  // agent direction when arriving through this door
}

export interface AgentSpot {
  id: string
  type: 'desk' | 'meeting-seat' | 'lounge' | 'standing' | 'water' | 'coffee' | 'filing' | 'printer' | 'door'
  x: number
  y: number
  facing?: 'up' | 'down' | 'left' | 'right'
  spriteFacing?: SpriteFacing  // which direction the agent faces when at this spot
  zIndex?: number  // explicit z-index override (for agents behind desks)
}

export interface Room {
  id: RoomId
  name: string
  description: string
  background: {
    day: string       // path to empty room background
    night: string
  }
  width: number       // room dimensions in px (rendered)
  height: number
  furniture: FurnitureItem[]
  connections: RoomConnection[]
  agentSpots: AgentSpot[]       // where agents can sit/stand/work
  entryPoint: { x: number; y: number }  // where agents appear when entering
  walkableArea?: { x: number; y: number }[]  // polygon defining where agents can walk
  ambience?: string   // ambient sound loop
  waypoints?: Waypoint[]  // named walkable nodes for pathfinding
}

// ===== ROOM DEFINITIONS =====

export const ROOMS: Record<RoomId, Room> = {
  'main-office': {
    id: 'main-office',
    name: 'Main Office',
    description: 'Open plan workspace where agents code, debug, and ship',
    background: {
      day: '/rooms/office-day.png',
      night: '/rooms/office-night.png',
    },
    width: 800,
    height: 600,
    furniture: [
      // Desk cluster - back
      { id: 'desk-1a', type: 'desk-standing', sprite: 'desk-standing-left-rear', x: 42.4, y: 50.4 },
      { id: 'desk-1b', type: 'desk-standing', sprite: 'desk-standing-left-front', x: 46.7, y: 53 },
      { id: 'desk-1c', type: 'desk-standing', sprite: 'desk-standing-right-front', x: 39.9, y: 55.2 },
      // Desk cluster - front left
      { id: 'desk-2a', type: 'desk-standing', sprite: 'desk-standing-left-rear', x: 31.4, y: 64.8 },
      { id: 'desk-2b', type: 'desk-standing', sprite: 'desk-standing-left-front', x: 35.4, y: 67.5 },
      { id: 'desk-2c', type: 'desk-standing', sprite: 'desk-standing-right-front', x: 27.9, y: 70 },
      // Desk cluster - right
      { id: 'desk-3a', type: 'desk-standing', sprite: 'desk-standing-left-rear', x: 59, y: 73.7 },
      { id: 'desk-3b', type: 'desk-standing', sprite: 'desk-standing-left-front', x: 62.6, y: 76 },
      { id: 'desk-3c', type: 'desk-standing', sprite: 'desk-standing-right-front', x: 55.4, y: 78.7 },
      { id: 'desk-3d', type: 'desk-standing', sprite: 'desk-standing-right-rear', x: 66.6, y: 71.1 },
      // Coffee machine on counter
      { id: 'coffee', type: 'coffee-machine', sprite: 'coffee-off', x: 78.5, y: 50.2, interactive: true, state: 'off', label: 'Coffee Machine' },
      // Filing cabinet
      { id: 'filing-1', type: 'filing-cabinet', sprite: 'filing-closed', x: 45, y: 56.5, state: 'closed', label: 'Filing Cabinet' },
      // Plants
      { id: 'plant-1', type: 'plant-monstera', sprite: 'plant-monstera', x: 91.9, y: 64.7 },
      { id: 'plant-2', type: 'plant-snake', sprite: 'plant-snake', x: 43.2, y: 37.9 },
      { id: 'plant-3', type: 'plant-money', sprite: 'plant-money', x: 32, y: 71.2 },
      { id: 'plant-4', type: 'plant-money', sprite: 'plant-money', x: 89.2, y: 65.7 },
      { id: 'plant-5', type: 'plant-monstera', sprite: 'plant-monstera', x: 60.2, y: 80.4 },
      // Printer (swaps between working/broken on printer jam event)
      { id: 'printer-1', type: 'printer', sprite: 'printer-working', x: 85.4, y: 56.8, state: 'working', label: 'Printer' },
      // Background hotspots — baked into the room image, no sprite, just clickable zones
      { id: 'fire-extinguisher', type: 'hotspot', sprite: 'hotspot', x: 8, y: 60, interactive: true, label: 'Fire Extinguisher' },
      { id: 'water-cooler', type: 'hotspot', sprite: 'hotspot', x: 58.8, y: 39.5, interactive: true, label: 'Water Cooler' },
      { id: 'bell', type: 'hotspot', sprite: 'hotspot', x: 62.6, y: 30.8, interactive: true, label: 'Bell' },
      { id: 'kanban-board', type: 'hotspot', sprite: 'hotspot', x: 80, y: 42, interactive: true, label: 'Kanban Board' },
      { id: 'ship-it-poster', type: 'hotspot', sprite: 'hotspot', x: 8, y: 45, interactive: true, label: 'Ship It Poster' },
      { id: 'tv-monitor', type: 'hotspot', sprite: 'hotspot', x: 90, y: 42, interactive: true, label: 'Dashboard' },
    ],
    connections: [
      { toRoom: 'manager-office', position: { x: 67.5, y: 48.9 }, label: "Manager's Office", exitFacing: 'rear-right', entryFacing: 'front-right' },
    ],
    agentSpots: [
      // Desk spots
      // In front of desk: rear-left/rear-right (z higher than desk)
      // Behind desk: front-left/front-right (z lower than desk)
      // Front-left cluster: desks at y ~65-70
      { id: 'spot-1', type: 'desk', x: 25.8, y: 71, facing: 'down', spriteFacing: 'rear-left', zIndex: 85 },
      { id: 'spot-2', type: 'desk', x: 37.9, y: 68.2, facing: 'down', spriteFacing: 'rear-right', zIndex: 85 },
      { id: 'spot-3', type: 'desk', x: 26.9, y: 59.2, facing: 'down', spriteFacing: 'front-left', zIndex: 40 },
      // Back cluster: desks at y ~50-55
      { id: 'spot-4', type: 'desk', x: 38.5, y: 55.2, facing: 'down', spriteFacing: 'rear-left', zIndex: 58 },
      { id: 'spot-5', type: 'desk', x: 48.9, y: 52.9, facing: 'down', spriteFacing: 'rear-right', zIndex: 70 },
      { id: 'spot-6', type: 'desk', x: 38.8, y: 43.6, facing: 'down', spriteFacing: 'front-left', zIndex: 30 },
      // Right cluster: desks at y ~72-79
      { id: 'spot-7', type: 'desk', x: 52.7, y: 78.8, facing: 'down', spriteFacing: 'rear-left', zIndex: 95 },
      { id: 'spot-8', type: 'desk', x: 65.9, y: 75.8, facing: 'down', spriteFacing: 'rear-right', zIndex: 95 },
      { id: 'spot-9', type: 'desk', x: 55.2, y: 66.8, facing: 'down', spriteFacing: 'front-left', zIndex: 55 },
      { id: 'spot-10', type: 'desk', x: 68.7, y: 66.2, facing: 'down', spriteFacing: 'front-right', zIndex: 55 },
      // Activity spots
      { id: 'spot-coffee-1', type: 'coffee', x: 73.5, y: 56.7, facing: 'down', spriteFacing: 'rear-left' },
      { id: 'spot-coffee-2', type: 'coffee', x: 76.2, y: 58.4, facing: 'down', spriteFacing: 'front-right' },
      { id: 'spot-water-1', type: 'water', x: 53.3, y: 46.6, facing: 'down', spriteFacing: 'rear-left' },
      { id: 'spot-water-2', type: 'water', x: 56, y: 47.7, facing: 'down', spriteFacing: 'front-right' },
      { id: 'spot-filing', type: 'filing', x: 47.8, y: 57.6, facing: 'down', spriteFacing: 'front-right', zIndex: 70 },
      { id: 'spot-printer', type: 'printer', x: 81, y: 63, facing: 'down', spriteFacing: 'rear-left' },
      { id: 'spot-door-2', type: 'door', x: 64, y: 46.6, facing: 'down', spriteFacing: 'rear-right' },
      { id: 'spot-door-3', type: 'door', x: 69.9, y: 50.8, facing: 'down', spriteFacing: 'front-right' },
    ],
    entryPoint: { x: 67.5, y: 48.9 },
    walkableArea: [
      { x: 28.2, y: 46 },
      { x: 33, y: 50.2 },
      { x: 20.6, y: 60.9 },
      { x: 21.8, y: 65.5 },
      { x: 32, y: 71.4 },
      { x: 41.6, y: 62.7 },
      { x: 40.8, y: 58.1 },
      { x: 45.5, y: 56.3 },
      { x: 49.3, y: 54.5 },
      { x: 51.3, y: 52.2 },
      { x: 51.9, y: 49.3 },
      { x: 51.5, y: 46.7 },
      { x: 57.9, y: 47.3 },
      { x: 64.2, y: 47.4 },
      { x: 70, y: 49.9 },
      { x: 71.2, y: 55.4 },
      { x: 78.8, y: 60.7 },
      { x: 86.7, y: 65.6 },
      { x: 82.6, y: 72.8 },
      { x: 71.5, y: 68.4 },
      { x: 59.5, y: 57.1 },
      { x: 54.7, y: 61.9 },
      { x: 51.4, y: 65.9 },
      { x: 49.8, y: 70.1 },
      { x: 50, y: 75.3 },
      { x: 54.3, y: 78.2 },
      { x: 58.1, y: 80 },
      { x: 62.5, y: 78.9 },
      { x: 64.9, y: 76 },
      { x: 68.4, y: 73.3 },
      { x: 70.4, y: 71.1 },
      { x: 71.7, y: 69.3 },
      { x: 82.7, y: 73.4 },
      { x: 54.3, y: 93.6 },
      { x: 37.6, y: 84 },
      { x: 23.5, y: 75.6 },
      { x: 12.6, y: 68.8 },
      { x: 3.9, y: 62.9 },
      { x: 33.7, y: 42.4 },
      { x: 35.5, y: 48.6 },
      { x: 33, y: 50.2 },
      { x: 28.7, y: 46.3 },
    ],
    waypoints: [
      // Zero-collision corridor network
      // Door & Entrance
      { id: 'W-door',          x: 67.5, y: 48.9, connections: ['W-door-hall', 'W-aisle-coffee'] },
      { id: 'W-door-hall',     x: 62.6, y: 46.0, connections: ['W-door', 'W-central-top'] },

      // Central Avenue (wide open highway between back desks and right desks)
      { id: 'W-central-top',   x: 54.0, y: 46.0, connections: ['W-door-hall', 'W-water', 'W-central-jeje'] },
      { id: 'W-water',         x: 56.5, y: 46.0, connections: ['W-central-top'] },
      { id: 'W-central-jeje',  x: 53.5, y: 52.9, connections: ['W-central-top', 'W-spot-5', 'W-central-filing'] },
      { id: 'W-central-filing',x: 53.0, y: 57.6, connections: ['W-central-jeje', 'W-filing', 'W-central-opi'] },
      { id: 'W-central-opi',   x: 51.0, y: 61.5, connections: ['W-central-filing', 'W-mid-opi', 'W-central-bot'] },
      { id: 'W-central-bot',   x: 45.0, y: 72.0, connections: ['W-central-opi', 'W-front-nara'] },

      // Filing Cabinet
      { id: 'W-filing',        x: 47.8, y: 57.6, connections: ['W-central-filing'] },

      // Middle Cross-Aisle to Opi (gap below back desks, above front-left desks)
      { id: 'W-mid-opi',       x: 38.5, y: 61.5, connections: ['W-central-opi', 'W-spot-4'] },

      // Front Avenue (open floor south of front-left desks)
      { id: 'W-front-nara',    x: 37.9, y: 72.0, connections: ['W-central-bot', 'W-spot-2', 'W-front-boss'] },
      { id: 'W-front-boss',    x: 25.8, y: 72.0, connections: ['W-front-nara', 'W-spot-1', 'W-window-bot'] },

      // Window Avenue (open walkway along floor-to-ceiling glass windows)
      { id: 'W-window-bot',    x: 18.0, y: 72.0, connections: ['W-front-boss', 'W-window-fire'] },
      { id: 'W-window-fire',   x: 18.0, y: 66.0, connections: ['W-window-bot', 'W-window-mid'] },
      { id: 'W-window-mid',    x: 18.0, y: 59.2, connections: ['W-window-fire', 'W-window-top', 'W-spot-3'] },
      { id: 'W-window-top',    x: 18.0, y: 52.0, connections: ['W-window-mid'] },

      // Desk Chair Spots (terminal endpoints connected ONLY to their aisle access points)
      { id: 'W-spot-1',        x: 25.8, y: 71.0, connections: ['W-front-boss'] },   // Boss
      { id: 'W-spot-2',        x: 37.9, y: 68.2, connections: ['W-front-nara'] },   // Nara
      { id: 'W-spot-3',        x: 26.9, y: 59.2, connections: ['W-window-mid'] },   // Lumi
      { id: 'W-spot-4',        x: 38.5, y: 55.2, connections: ['W-mid-opi'] },      // Opi
      { id: 'W-spot-5',        x: 48.9, y: 52.9, connections: ['W-central-jeje'] }, // Jeje

      // East Wing (Break counter, kanban, coffee, printer)
      { id: 'W-aisle-coffee',  x: 73.5, y: 48.9, connections: ['W-door', 'W-kanban', 'W-coffee-1'] },
      { id: 'W-kanban',        x: 80.0, y: 46.0, connections: ['W-aisle-coffee'] },
      { id: 'W-coffee-1',      x: 73.5, y: 56.7, connections: ['W-aisle-coffee', 'W-coffee-2'] },
      { id: 'W-coffee-2',      x: 76.2, y: 58.4, connections: ['W-coffee-1', 'W-printer'] },
      { id: 'W-printer',       x: 81.0, y: 63.0, connections: ['W-coffee-2'] },
    ],
  },

  'manager-office': {
    id: 'manager-office',
    name: "Manager's Office",
    description: 'Where the manager briefs agents and reviews work. Connected to main Claude terminal.',
    background: {
      day: '/rooms/ceo-office.png',
      night: '/rooms/ceo-office.png',
    },
    width: 600,
    height: 450,
    furniture: [],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 95 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'mgr-spot', type: 'desk', x: 50, y: 40, facing: 'down' },
      { id: 'visitor-1', type: 'standing', x: 35, y: 65, facing: 'up' },
      { id: 'visitor-2', type: 'standing', x: 65, y: 65, facing: 'up' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'ceo-office': {
    id: 'ceo-office',
    name: 'CEO Office',
    description: 'Corner office with city views. Bloomberg terminal and whiskey shelf.',
    background: {
      day: '/rooms/ceo-office.png',
      night: '/rooms/ceo-office.png',
    },
    width: 600,
    height: 450,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 95 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'ceo-spot', type: 'desk', x: 50, y: 45, facing: 'down' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'meeting-room': {
    id: 'meeting-room',
    name: 'Meeting Room',
    description: 'Glass-walled room for standups, planning, and heated architecture debates.',
    background: {
      day: '/rooms/meeting-room.png',
      night: '/rooms/meeting-room.png',
    },
    width: 600,
    height: 450,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 95, y: 50 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'seat-1', type: 'meeting-seat', x: 30, y: 40, facing: 'right' },
      { id: 'seat-2', type: 'meeting-seat', x: 30, y: 55, facing: 'right' },
      { id: 'seat-3', type: 'meeting-seat', x: 70, y: 40, facing: 'left' },
      { id: 'seat-4', type: 'meeting-seat', x: 70, y: 55, facing: 'left' },
      { id: 'presenter', type: 'standing', x: 50, y: 25, facing: 'down' },
    ],
    entryPoint: { x: 90, y: 50 },
  },

  'kitchen': {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Espresso machine, kombucha on tap, and a fridge full of La Croix.',
    background: {
      day: '/rooms/kitchen-cafeteria.png',
      night: '/rooms/kitchen-cafeteria.png',
    },
    width: 600,
    height: 450,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 5, y: 50 }, label: 'Main Office' },
      { toRoom: 'rooftop', position: { x: 50, y: 5 }, label: 'Rooftop' },
    ],
    agentSpots: [
      { id: 'coffee-spot', type: 'standing', x: 30, y: 35, facing: 'up' },
      { id: 'lunch-1', type: 'meeting-seat', x: 35, y: 65, facing: 'right' },
      { id: 'lunch-2', type: 'meeting-seat', x: 65, y: 65, facing: 'left' },
      { id: 'snack-spot', type: 'standing', x: 15, y: 35, facing: 'up' },
    ],
    entryPoint: { x: 10, y: 50 },
  },

  'server-room': {
    id: 'server-room',
    name: 'Server Room',
    description: 'Cold. Loud. Blinking lights. Where deployments happen.',
    background: {
      day: '/rooms/server-room.png',
      night: '/rooms/server-room.png',
    },
    width: 500,
    height: 400,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 95 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'server-spot-1', type: 'standing', x: 35, y: 60, facing: 'up' },
      { id: 'server-spot-2', type: 'standing', x: 65, y: 60, facing: 'up' },
    ],
    entryPoint: { x: 50, y: 90 },
    ambience: 'server-hum',
  },

  'lobby': {
    id: 'lobby',
    name: 'Lobby',
    description: 'Where new hires arrive. Swag wall. Pile of Amazon packages.',
    background: {
      day: '/rooms/lobby-reception.png',
      night: '/rooms/lobby-reception.png',
    },
    width: 600,
    height: 450,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 5 }, label: 'Main Office' },
      { toRoom: 'parking', position: { x: 50, y: 95 }, label: 'Parking' },
    ],
    agentSpots: [
      { id: 'reception-spot', type: 'desk', x: 50, y: 40, facing: 'down' },
      { id: 'waiting-1', type: 'lounge', x: 25, y: 70, facing: 'right' },
      { id: 'waiting-2', type: 'lounge', x: 35, y: 70, facing: 'right' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'nap-room': {
    id: 'nap-room',
    name: 'Wellness Room',
    description: 'Sleep pods, meditation cushions, and a Himalayan salt lamp.',
    background: {
      day: '/rooms/nap-wellness-room.png',
      night: '/rooms/nap-wellness-room.png',
    },
    width: 500,
    height: 400,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 95 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'nap-1', type: 'lounge', x: 25, y: 40, facing: 'down' },
      { id: 'nap-2', type: 'lounge', x: 50, y: 40, facing: 'down' },
      { id: 'nap-3', type: 'lounge', x: 75, y: 40, facing: 'down' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'rooftop': {
    id: 'rooftop',
    name: 'Rooftop Terrace',
    description: 'Friday drinks, BBQ, and pretending to have work-life balance.',
    background: {
      day: '/rooms/rooftop-terrace.png',
      night: '/rooms/rooftop-terrace.png',
    },
    width: 700,
    height: 500,
    furniture: [
    ],
    connections: [
      { toRoom: 'kitchen', position: { x: 50, y: 95 }, label: 'Kitchen' },
    ],
    agentSpots: [
      { id: 'roof-1', type: 'lounge', x: 25, y: 50, facing: 'down' },
      { id: 'roof-2', type: 'lounge', x: 65, y: 50, facing: 'down' },
      { id: 'roof-3', type: 'lounge', x: 40, y: 75, facing: 'right' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'gym': {
    id: 'gym',
    name: 'Gym',
    description: 'A Peloton, some dumbbells, and a mirror for flexing your PRs.',
    background: {
      day: '/rooms/gym-fitness-room.png',
      night: '/rooms/gym-fitness-room.png',
    },
    width: 500,
    height: 400,
    furniture: [
    ],
    connections: [
      { toRoom: 'main-office', position: { x: 50, y: 95 }, label: 'Main Office' },
    ],
    agentSpots: [
      { id: 'gym-1', type: 'standing', x: 25, y: 45, facing: 'down' },
      { id: 'gym-2', type: 'standing', x: 75, y: 45, facing: 'down' },
    ],
    entryPoint: { x: 50, y: 90 },
  },

  'parking': {
    id: 'parking',
    name: 'Parking Garage',
    description: 'Teslas, e-scooters, and reserved spots nobody respects.',
    background: {
      day: '/rooms/parking-garage.png',
      night: '/rooms/parking-garage.png',
    },
    width: 700,
    height: 500,
    furniture: [
    ],
    connections: [
      { toRoom: 'lobby', position: { x: 50, y: 5 }, label: 'Lobby' },
    ],
    agentSpots: [],
    entryPoint: { x: 50, y: 10 },
  },
}

// ===== ROOM NAVIGATION =====
// Find path between rooms using BFS
export function findRoomPath(from: RoomId, to: RoomId): RoomId[] {
  if (from === to) return [from]

  const visited = new Set<RoomId>()
  const queue: { room: RoomId; path: RoomId[] }[] = [{ room: from, path: [from] }]
  visited.add(from)

  while (queue.length > 0) {
    const { room, path } = queue.shift()!
    const connections = ROOMS[room].connections

    for (const conn of connections) {
      if (conn.toRoom === to) return [...path, to]
      if (!visited.has(conn.toRoom)) {
        visited.add(conn.toRoom)
        queue.push({ room: conn.toRoom, path: [...path, conn.toRoom] })
      }
    }
  }

  return [from] // no path found, stay put
}

// Get all rooms connected to a given room
export function getConnectedRooms(roomId: RoomId): RoomId[] {
  return ROOMS[roomId].connections.map(c => c.toRoom)
}

// Get a free agent spot in a room
export function getFreeSpot(
  roomId: RoomId,
  occupiedSpotIds: Set<string>,
  type?: AgentSpot['type'],
): AgentSpot | null {
  const room = ROOMS[roomId]
  const spots = type
    ? room.agentSpots.filter(s => s.type === type)
    : room.agentSpots

  for (const spot of spots) {
    if (!occupiedSpotIds.has(spot.id)) return spot
  }
  return null
}
