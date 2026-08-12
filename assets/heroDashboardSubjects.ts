import type { SpecialtyId } from '../src/core/types';
import type { HeroPrimaryStatIconId, HeroVitalIconId } from './heroDashboardManifest';

/** Literal physical subjects used by the immutable dashboard generation jobs. */
export const HERO_SPECIALTY_VISUAL_SUBJECTS: Readonly<Record<SpecialtyId, string>> = Object.freeze({
  steadyAim: 'an ashwood longbow with one perfectly straight hand-fletched arrow',
  brightRally: 'a brass rally trumpet with one warm-red cloth tie',
  roadwise: 'a sturdy wagon wheel crossing three fitted road stones with an axle-grease pot',
  highBanner: 'one planted cream-and-warm-red heraldic pennant',
  tinCaptain: "one polished tin soldier beside a brass captain's baton",
  brightWither: 'one fresh leafy twig becoming pale dry ash along its length',
  masterForager: 'an overflowing wicker basket of roadside food and useful workshop scraps',
  masterMender: 'a large needle pulling red thread through a repaired tin plate',
  deepLastLight: 'a tiny candle-wisp sheltered in a brass lighthouse lantern',
  brightRemembrance: 'a feather quill over a repaired blank memorial tablet',
  watchfulRetaliation: 'an old sentry shield with a guard spear and returning arrow',
  heavyUnfinishedBusiness: 'a mendicant alms bowl weighing down a chapel hammer',
  nurturingBrood: 'a honey-gold larva sheltered in a black-chitin honeycomb cup',
  masterRenderer: 'a sealed amber-and-black rendering vessel with measuring spout',
  swiftPaperWasps: 'a folded paper-wasp wing attached to a tiny lacquered lance tip',
  brightBloom: 'one unopened bud becoming a full warm flower across one stem',
  gentleDebts: 'a blank rolled contract tied through wooden counting beads with one delayed bead',
  brightSour: 'a cream milk jug beside tart berry-red fruit',
  vengefulCrows: 'a glossy black crow feather crossing a hooked crow-beak charm',
  farSweep: 'a crooked birch besom sweeping two pale stepping stones',
  dearerBloodPrice: 'an ashwood war drum wrapped with a blood-red memorial cord',
  hungryPack: 'an ashmane wolf jaw closing toward a red-stained hide strip',
  brightGale: 'a coiled pale wind ribbon lifting an ochre riding-rope loop',
  unhinderedSkirmish: 'an outrider boot and lance crossing a broken slowing chain',
  kennelMuster: 'a blank muster signboard beside a red hound collar and brass counting peg',
  brightTrial: "a judge's gavel landing on the bright face of a wooden token",
  brightEscort: 'a tiny lacquered clockwork escort marching beside a brass tuning fork',
  swiftMarionettes: 'a marionette control bar pulling two tiny running wooden feet',
  doubleFerry: 'a weathered ferry boat with two oars and two blank punched fare tickets',
  deepDirge: "a rolled blank requiem score bound around a bone conductor's baton",
  lastingResin: 'an amber resin trail tile with two extra hardened round drips',
  greaterBroodCall: 'a black-chitin brood horn opening toward three honey-gold larvae',
  diagonalFenceSlow: 'two crooked birch fence posts placed diagonally with a wicker loop',
  loopholeBargains: 'a blank folded contract curling through a loophole in a crooked root clasp',
  burningStormWake: 'a thunderbird feather crossing a scorched glassy footprint and three embers',
  costlySurrender: 'a folded white surrender cloth over two brass toll coins and a gate bar',
});

export const HERO_PRIMARY_STAT_VISUAL_SUBJECTS: Readonly<Record<
Exclude<HeroPrimaryStatIconId, 'spellPower'>, string>> = Object.freeze({
  attack: 'a steel sword striking forward across a red leather bracer',
  defense: 'an upright cream-painted kite shield reinforced by a short iron brace',
  knowledge: 'an open blank parchment book with a small brass key across its pages',
});

export const HERO_VITAL_VISUAL_SUBJECTS: Readonly<Record<HeroVitalIconId, string>> = Object.freeze({
  experience: 'a warm-gold compass star rising from three plain wooden learning blocks',
  movement: 'a sturdy travel boot stepping across three pale road stones',
  mana: 'a stoppered cobalt-blue potion flask with a pale crescent liquid level',
  luck: 'a four-leaf green enamel clover attached to a warm brass horseshoe',
});
