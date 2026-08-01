import { activeHero } from '../heroes';
import { coordKey, inBounds, sameCoord } from '../map/pathfinding';
import { castleEntrance, castleFootprintTiles, mapOccupiedTiles } from '../map/occupancy';
import type { Coord, GameState } from '../types';
import { buildingIsActive } from './buildingStatus';
import { terrainIdAt } from '../../content/terrain';

export function tunnelTravel(state: GameState, destinationCastleId: string): void {
  const hero = activeHero(state);
  const source = state.castles.find((castle) => castle.owner === hero.owner
    && sameCoord(castleEntrance(castle), hero.position) && buildingIsActive(castle, 'deepTunnels'));
  const destination = state.castles.find((castle) => castle.id === destinationCastleId
    && castle.owner === hero.owner && buildingIsActive(castle, 'deepTunnels'));
  if (!source || !destination || source.id === destination.id || hero.movement < 500) {
    throw new Error('Deep Tunnel travel is unavailable');
  }
  hero.movement -= 500;
  hero.position = castleEntrance(destination);
  hero.pathMemory = [];
  state.lastMessage = `${hero.name} travels beneath the marches for 500 movement.`;
}

export function relocateCastle(state: GameState, castleId: string, destination: Coord): void {
  const castle = state.castles.find((candidate) => candidate.id === castleId
    && candidate.owner === state.activePlayer);
  const explored = state.players[state.activePlayer].explored.includes(coordKey(destination));
  const terrain = terrainIdAt(state.map, destination);
  if (!castle || !buildingIsActive(castle, 'henLeggedFence')
      || (state.day - 1) % 7 !== 0 || castle.relocatedWeek === state.week
      || !explored || !inBounds(state.map, destination)
      || Math.max(Math.abs(destination.x - castle.position.x),
        Math.abs(destination.y - castle.position.y)) > 3
      || terrain === 'water' || terrain === 'mountain'
      || castleFootprintTiles({ ...castle, position: destination }).some((tile) =>
        mapOccupiedTiles(state.map, state.castles.filter((candidate) => candidate.id !== castle.id))
          .has(coordKey(tile)))) {
    throw new Error('The Hen-Legged Fence cannot move there');
  }
  const origin = castleEntrance(castle);
  castle.position = { ...destination };
  castle.relocatedWeek = state.week;
  if (castle.owner === 'neutral') throw new Error('Neutral towns do not walk');
  for (const hero of state.players[castle.owner].heroes.filter((candidate) =>
    candidate.alive && sameCoord(candidate.position, origin))) {
    hero.position = castleEntrance(castle);
  }
  state.lastMessage = `${castle.id} walks to ${destination.x},${destination.y}.`;
}
