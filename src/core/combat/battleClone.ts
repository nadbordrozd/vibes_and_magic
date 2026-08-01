import { cloneArtifacts } from '../artifacts';
import type {
  BattleState,
} from '../types';

export function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => ({
      ...stack, position: { ...stack.position },
      lastAttackOrigin: stack.lastAttackOrigin && { ...stack.lastAttackOrigin },
      abilityUses: { ...stack.abilityUses },
      temporaryAbilities: [...(stack.temporaryAbilities ?? [])],
      counters: { ...stack.counters },
      effects: stack.effects.map((effect) => ({ ...effect })),
    })),
    obstacles: battle.obstacles.map((coord) => ({ ...coord })),
    order: [...battle.order],
    waiting: [...battle.waiting],
    attackerHero: {
      ...battle.attackerHero,
      knownSpells: [...battle.attackerHero.knownSpells],
      upgradedSpells: [...battle.attackerHero.upgradedSpells],
      skills: { ...battle.attackerHero.skills },
      inventory: battle.attackerHero.inventory.map((item) =>
        item && typeof item !== 'string' ? {
          ...item, origin: item.origin && { ...item.origin },
        } : item),
      artifacts: cloneArtifacts(battle.attackerHero.artifacts),
      debts: battle.attackerHero.debts.map((debt) => ({
        ...debt, trigger: { ...debt.trigger },
      })),
    },
    defenderHero: battle.defenderHero ? {
      ...battle.defenderHero,
      knownSpells: [...battle.defenderHero.knownSpells],
      upgradedSpells: [...battle.defenderHero.upgradedSpells],
      skills: { ...battle.defenderHero.skills },
      inventory: battle.defenderHero.inventory.map((item) =>
        item && typeof item !== 'string' ? {
          ...item, origin: item.origin && { ...item.origin },
        } : item),
      artifacts: cloneArtifacts(battle.defenderHero.artifacts),
      debts: battle.defenderHero.debts.map((debt) => ({
        ...debt, trigger: { ...debt.trigger },
      })),
    } : null,
    context: { ...battle.context, destination: { ...battle.context.destination } },
    log: [...battle.log],
    casualties: {
      attacker: { ...battle.casualties.attacker },
      defender: { ...battle.casualties.defender },
    },
    initialCounts: { ...battle.initialCounts },
    recovered: {
      attacker: { ...battle.recovered.attacker },
      defender: { ...battle.recovered.defender },
    },
    enchantments: {
      attacker: battle.enchantments.attacker.map((effect) => ({ ...effect })),
      defender: battle.enchantments.defender.map((effect) => ({ ...effect })),
    },
    castRound: { ...battle.castRound },
    sideAbilities: {
      attacker: [...battle.sideAbilities.attacker],
      defender: [...battle.sideAbilities.defender],
    },
    extraActions: { ...battle.extraActions },
    chosenResonance: { ...battle.chosenResonance },
    tiles: battle.tiles.map((tile) => ({
      ...tile, position: { ...tile.position },
    })),
    lastSpellCast: battle.lastSpellCast && { ...battle.lastSpellCast },
    spellsCastAgainst: {
      attacker: [...battle.spellsCastAgainst.attacker],
      defender: [...battle.spellsCastAgainst.defender],
    },
    itemUses: { ...battle.itemUses },
    itemFreeActUsed: { ...battle.itemFreeActUsed },
    itemPreserved: { ...battle.itemPreserved },
    twisterFreeUsed: { ...battle.twisterFreeUsed },
    twisterActSaved: { ...battle.twisterActSaved },
    vanguardStack: { ...battle.vanguardStack },
    firstSpellTaxPaid: { ...battle.firstSpellTaxPaid },
    ironNailSpent: { ...battle.ironNailSpent },
    counterRedirectTarget: { ...battle.counterRedirectTarget },
    counterRedirectUsed: { ...battle.counterRedirectUsed },
    sealedEnchantments: [...battle.sealedEnchantments],
    pendingFreeMove: battle.pendingFreeMove && { ...battle.pendingFreeMove },
    retaliationSuppressed: { ...battle.retaliationSuppressed },
    deathTriggerMultiplier: { ...battle.deathTriggerMultiplier },
    recentDestructionScale: { ...battle.recentDestructionScale },
    bloodPriceBonus: { ...battle.bloodPriceBonus },
    timingSpeedBonus: { ...battle.timingSpeedBonus },
    doubleCastUsedRound: { ...battle.doubleCastUsedRound },
    mirrorArtifactUsed: { ...battle.mirrorArtifactUsed },
    longestCandleUsed: { ...battle.longestCandleUsed },
    longestCandlePending: { ...battle.longestCandlePending },
    lastToyUsed: { ...battle.lastToyUsed },
    clapperUsed: { ...battle.clapperUsed },
    hornUsed: { ...battle.hornUsed },
    spellCastsBySide: { ...battle.spellCastsBySide },
    withdrawal: battle.withdrawal && { ...battle.withdrawal },
  };
}
