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
      copiedAbilityIds: [...(stack.copiedAbilityIds ?? [])],
      destroyedCompanyForSides: [...(stack.destroyedCompanyForSides ?? [])],
      damageLink: stack.damageLink && { ...stack.damageLink },
      controlSnapshot: stack.controlSnapshot && {
        counters: { ...stack.controlSnapshot.counters },
        counterSources: { ...stack.controlSnapshot.counterSources },
        counterDecayDelayed: { ...stack.controlSnapshot.counterDecayDelayed },
        effects: stack.controlSnapshot.effects.map((effect) => ({ ...effect })),
        damageLinkTargetId: stack.controlSnapshot.damageLinkTargetId,
      },
      counters: { ...stack.counters },
      counterSources: { ...stack.counterSources },
      counterDecayDelayed: { ...stack.counterDecayDelayed },
      effects: stack.effects.map((effect) => ({ ...effect })),
    })),
    obstacles: battle.obstacles.map((coord) => ({ ...coord })),
    order: [...battle.order],
    waiting: [...battle.waiting],
    attackerHero: {
      ...battle.attackerHero,
      knownSpells: [...battle.attackerHero.knownSpells],
      borrowedSpellIds: [...(battle.attackerHero.borrowedSpellIds ?? [])],
      upgradedSpells: [...battle.attackerHero.upgradedSpells],
      spellManaReductions: { ...battle.attackerHero.spellManaReductions },
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
      borrowedSpellIds: [...(battle.defenderHero.borrowedSpellIds ?? [])],
      upgradedSpells: [...battle.defenderHero.upgradedSpells],
      spellManaReductions: { ...battle.defenderHero.spellManaReductions },
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
    p2Weather: battle.p2Weather && { ...battle.p2Weather },
    p2LedgerHalfTriggers: [...(battle.p2LedgerHalfTriggers ?? [])],
    p2LongOathUseRound: { ...(battle.p2LongOathUseRound ?? {}) },
    p2ExtraActionUses: {
      attacker: battle.p2ExtraActionUses?.attacker && { ...battle.p2ExtraActionUses.attacker },
      defender: battle.p2ExtraActionUses?.defender && { ...battle.p2ExtraActionUses.defender },
    },
    castRound: { ...battle.castRound },
    knackUseRound: { ...battle.knackUseRound },
    beguilerOpeningResolved: { ...battle.beguilerOpeningResolved },
    beguilerControlUsed: { ...battle.beguilerControlUsed },
    evokerActUsed: { ...battle.evokerActUsed },
    sideAbilities: {
      attacker: [...battle.sideAbilities.attacker],
      defender: [...battle.sideAbilities.defender],
    },
    extraActions: { ...battle.extraActions },
    chosenResonance: { ...battle.chosenResonance },
    tiles: battle.tiles.map((tile) => ({
      ...tile, position: { ...tile.position },
      hazard: tile.hazard?.kind === 'teleport'
        ? { ...tile.hazard, destination: { ...tile.hazard.destination } }
        : tile.hazard && { ...tile.hazard },
    })),
    lastSpellCast: battle.lastSpellCast && { ...battle.lastSpellCast },
    pendingSpellDeflection: battle.pendingSpellDeflection && {
      ...battle.pendingSpellDeflection,
      action: { ...battle.pendingSpellDeflection.action,
        positions: battle.pendingSpellDeflection.action.positions?.map((coord) => ({ ...coord })) },
      legalTargetIds: [...battle.pendingSpellDeflection.legalTargetIds],
    },
    pendingMirrorCopy: battle.pendingMirrorCopy && {
      ...battle.pendingMirrorCopy,
      action: { ...battle.pendingMirrorCopy.action,
        positions: battle.pendingMirrorCopy.action.positions?.map((coord) => ({ ...coord })) },
      legalTargetIds: [...battle.pendingMirrorCopy.legalTargetIds],
    },
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
    artifactEffectUses: {
      attacker: { ...battle.artifactEffectUses.attacker },
      defender: { ...battle.artifactEffectUses.defender },
    },
    inheritedArtifactStats: {
      attacker: battle.inheritedArtifactStats.attacker
        && { ...battle.inheritedArtifactStats.attacker },
      defender: battle.inheritedArtifactStats.defender
        && { ...battle.inheritedArtifactStats.defender },
    },
    artifactStoredSpell: {
      attacker: battle.artifactStoredSpell.attacker && {
        ...battle.artifactStoredSpell.attacker,
        action: { ...battle.artifactStoredSpell.attacker.action },
      },
      defender: battle.artifactStoredSpell.defender && {
        ...battle.artifactStoredSpell.defender,
        action: { ...battle.artifactStoredSpell.defender.action },
      },
    },
    lastHeroSpellAction: {
      attacker: battle.lastHeroSpellAction.attacker && {
        ...battle.lastHeroSpellAction.attacker,
        action: { ...battle.lastHeroSpellAction.attacker.action },
      },
      defender: battle.lastHeroSpellAction.defender && {
        ...battle.lastHeroSpellAction.defender,
        action: { ...battle.lastHeroSpellAction.defender.action },
      },
    },
    spellCastsBySide: { ...battle.spellCastsBySide },
    withdrawal: battle.withdrawal && { ...battle.withdrawal },
    delayedTriggers: battle.delayedTriggers?.map((trigger) => ({
      ...trigger,
      trigger: { ...trigger.trigger },
      effect: { ...trigger.effect },
    })),
    midBattleResonance: battle.midBattleResonance && {
      attacker: [...battle.midBattleResonance.attacker],
      defender: [...battle.midBattleResonance.defender],
    },
    itemUpgradedSchools: {
      attacker: [...battle.itemUpgradedSchools.attacker],
      defender: [...battle.itemUpgradedSchools.defender],
    },
    pendingGraveDust: battle.pendingGraveDust && { ...battle.pendingGraveDust },
    holdLineUsedRound: battle.holdLineUsedRound && { ...battle.holdLineUsedRound },
    standardDawnKillRound: battle.standardDawnKillRound && { ...battle.standardDawnKillRound },
    pendingGrantedActions: battle.pendingGrantedActions?.map((entry) => ({ ...entry })),
    activeGrantedAction: battle.activeGrantedAction && { ...battle.activeGrantedAction },
    spellResolutionSource: battle.spellResolutionSource && { ...battle.spellResolutionSource },
  };
}
