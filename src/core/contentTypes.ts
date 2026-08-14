export type AbilityId =
  | 'ranged' | 'flying' | 'beast' | 'construct' | 'spirit'
  | 'banner' | 'charge' | 'oriflamme' | 'rampant'
  | 'springloaded' | 'no_retaliation' | 'soft_body' | 'overwind'
  | 'procession_of_repair' | 'hallowed_cargo'
  | 'last_light' | 'the_errand_passes' | 'still_on_watch'
  | 'swelling_dirge' | 'unfinished_vow' | 'crossing'
  | 'sting_and_circle' | 'web' | 'resin_trail' | 'skim' | 'brood_call'
  | 'pecking_order' | 'boundary' | 'sweep' | 'beckoning_song'
  | 'home_ground' | 'thicket_walk' | 'fowl_legs' | 'crone_favor'
  | 'skirmish' | 'war_drums' | 'pack_hunger' | 'trample'
  | 'undergrass' | 'storm_wake'
  | 'siege_wall' | 'siege_ram' | 'immobile' | 'mirror_hex'
  | 'aquatic' | 'the_song' | 'still_aboard' | 'shellback' | 'the_lure'
  | 'full_heal' | 'melee_reflect' | 'mask_reflect'
  | 'hex_feeder' | 'counter_eater' | 'burn_conduit' | 'bloomshare' | 'echoing'
  | 'spell_battery' | 'mana_leech' | 'spell_shrug' | 'spellbound' | 'sniper'
  | 'chain_shot' | 'first_strike' | 'phalanx' | 'unstable' | 'soul_tithe'
  | 'blink_step' | 'altar' | 'hedge_caster' | 'ward_bearer' | 'siphon'
  | 'caster'
  | 'warded_hide' | 'low_magic_immune' | 'school_resistant'
  | 'unburnable' | 'unchillable' | 'unhexable' | 'spell_ward' | 'spell_deflect'
  | 'spell_frail'
  | 'all_adjacent' | 'breath' | 'cleave' | 'line_strike' | 'blast_shot' | 'arc_shot'
  | 'dread' | 'hearth' | 'standard_bearer' | 'quench'
  | 'cornered' | 'first_blood' | 'last_stand'
  | 'ambush' | 'burrow' | 'rear_guard' | 'wall_walker'
  | 'pathfinder' | 'beast_of_burden' | 'ley_touched' | 'tithe_bearer'
  | 'far_sighted' | 'carrion_sense' | 'sea_legs'
  | 'mindless' | 'feral' | 'hungry' | 'slow_witted' | 'brittle_bones' | 'unruly';

export type ItemId =
  | 'spellScroll'
  | 'scrollRally' | 'scrollBlessing' | 'scrollForgeSpark' | 'scrollWard'
  | 'scrollWither' | 'scrollQuiet' | 'scrollDirge' | 'scrollSour'
  | 'scrollAmplify' | 'scrollReflect'
  | 'potionOfVigor' | 'draughtOfIron' | 'smellingSalts' | 'bottledEcho'
  | 'cartographersCase' | 'waybread' | 'overseersCharter'
  | 'tradeGoods'
  | 'haresHeel' | 'blackfireOil' | 'graveDust' | 'hornetJar'
  | 'milkOfTheMoon' | 'chalkOfWalls' | 'waxSeal' | 'powderOfUnmaking'
  | 'bannerWhistle' | 'secondCandle'
  | 'saltedMeat' | 'tavernTales' | 'hearthstone' | 'ferrymansCoin'
  | 'militiaWrit' | 'beggarsCoin' | 'foundersTin' | 'cronesBundle'
  | 'spellTome'
  | 'vialBorrowedHours' | 'wildfireFlask' | 'counterfeitCoin'
  | 'graveDustSachet' | 'tuningFork' | 'sealingWaxCord' | 'ironFilings'
  | 'looseThread' | 'ledgerPage' | 'nightjarFeather' | 'surveyorsTwine'
  | 'spellbookPage';

export interface ItemInstance {
  id: ItemId;
  plus?: boolean;
  origin?: { x: number; y: number };
  storedSpellId?: string;
  tomeSource?: 'chest' | 'lock' | 'barrow' | 'reliquary-cairn' | 'reliquary-pages';
}

export type ItemSlot = ItemInstance | string | null;

export type ArtifactSlot =
  | 'head' | 'cloak' | 'amulet' | 'weapon' | 'shield' | 'armor'
  | 'ring' | 'boots' | 'misc';

export type EquipmentSlotId =
  | 'head' | 'cloak' | 'amulet' | 'weapon' | 'shield' | 'armor'
  | 'ring1' | 'ring2' | 'boots' | 'misc1' | 'misc2' | 'misc3';

export type ArtifactId =
  | 'skirmishersBlade' | 'marchwardensSword' | 'swordOfTheFirstField'
  | 'yeomansBuckler' | 'kiteOfTheOldWall' | 'aegisOfTheKeptOath'
  | 'circletOfSmallRites' | 'hoodOfTheHedgeMage' | 'crownOfThePatternedSky'
  | 'chapbookLocket' | 'reliquaryPendant' | 'deepWellAmulet'
  | 'quiltedCoat' | 'lamellarOfTheMarches' | 'panoplyOfTheGreyKeep'
  | 'travelersCloak' | 'wayfarersMantle' | 'cloakOfTheOpenRoad'
  | 'cobblersPride' | 'bootsOfTheDrover' | 'sevenLeagueBoots'
  | 'ringOfSmallMendings' | 'ringOfTheSteadyHand' | 'ringOfTheLongVigil'
  | 'falconersGlove' | 'whetstoneOfTheClans' | 'tinkersSpectacles'
  | 'quietHorseshoe' | 'standardBearersBaldric' | 'saltCrustedCompass'
  | 'gravebindersSash' | 'forgeAshGauntlets' | 'beeCharmersVeil'
  | 'purseOfThePrudentToad' | 'chalkmastersRing' | 'secondQuiver'
  | 'sunderedHourglass' | 'longestCandle' | 'crookedDistaff'
  | 'bannerOfTheFirstField' | 'patchworkStandard' | 'seamstone'
  | 'mirrorshardPendant' | 'bellsClapper' | 'queensAmber'
  | 'wolfMothersTorc' | 'hornOfTheBroadWorld' | 'toyKnightsHeart'
  | 'tailorsNeedle' | 'goldenThread' | 'tailorsThimble' | 'patternbook'
  | 'knucklebonesOfTheSaint' | 'drumOfTheDeepGrass'
  | 'censerOfStillness' | 'pocketSundial' | 'ironNail' | 'mirrorMask'
  | 'sashOfTheLeviedMile' | 'scribesCuff' | 'captainsWeathercoat'
  | 'lanternScholarsCap' | 'pilgrimsBelt' | 'surveyorsBoots'
  | 'fieldClerksSeal' | 'ashwoodBracer' | 'quietWard'
  | 'marchGlass' | 'keepersHalfCloak' | 'mendersGorget'
  | 'gauntletSecondThrow' | 'candleSnuffersRing' | 'fairScale' | 'droversCrook'
  | 'hexKeepersLocket' | 'thirdBoot' | 'bellMetalTorque' | 'unsentLetter'
  | 'mothEatenMap' | 'spareFace'
  | 'longSpoon' | 'firstDrum' | 'crownHollowTown' | 'weathercockIllOmen'
  | 'seamRipper' | 'lastToy'
  | 'leadenCrown' | 'hungryBlade' | 'beggarsRing' | 'patternlessCoat'
  | 'bellows' | 'ninePipCord' | 'ashCenser' | 'sappersChalk'
  | 'loomSmallRepairs' | 'puppeteersThimble' | 'quietLedger' | 'beastCallersCord'
  | 'emptyReliquary' | 'crackedPrism' | 'secondSunrise' | 'hexwrightsTally'
  | 'graftedHand' | 'discordantFork' | 'whistlingKettle' | 'tuningPeg'
  | 'greedyGrimoire' | 'loudBell' | 'ironTongue' | 'splitReed'
  | 'longLadder' | 'ferrymansLantern' | 'backwardBoot' | 'milestoneStone'
  | 'cartwrightsWheel' | 'patientCompass' | 'hollowKey' | 'crowsErrand'
  | 'misersThumb' | 'foundersTrowel' | 'borrowedPurse' | 'titheBox'
  | 'growingLedger' | 'saltSack' | 'tallystick'
  | 'spareTongue' | 'paupersGrimoire' | 'waxSealedEnvelope' | 'nestingDoll'
  | 'mirrorbackCloak' | 'quietBell' | 'ninthPip'
  | 'longTable' | 'oddBoot' | 'handMeDownArmor' | 'regimentalColors'
  | 'crackedWhistle' | 'grudgeBook' | 'deadmansWedge'
  | 'twinCoin' | 'emptyFrame' | 'secondFace' | 'debtLedger'
  | 'gluttonsBit' | 'sleeplessCrown' | 'openPurse' | 'faithfulHound'
  | 'rustedTongue';

export interface ArtifactInstance {
  id: ArtifactId;
  chosenSchool?: 'rite' | 'craft' | 'grave' | 'wild';
  /** Authored equip choice carried by Compass/Ledger and future registry-driven artifacts. */
  chosenObjectKind?: string;
  chosenDwellingTier?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Empty Frame's seed-derived identity; the source artifact instance is never mutated. */
  copiedArtifactId?: ArtifactId;
  /** Battle-local authored outcome for Wax-Sealed Envelope. */
  seededSpellId?: string;
}

export interface HeroArtifacts {
  equipment: Record<EquipmentSlotId, ArtifactInstance | null>;
  backpack: ArtifactInstance[];
}
