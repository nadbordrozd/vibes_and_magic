import { useEffect, useState } from 'react';
import type { GameState } from '../../core/types';

export type HelpContext = 'menu' | 'adventure' | 'castle' | 'combat' | 'choice' | 'result'
  | 'campaign';

interface HelpSection { title: string; body: string; steps: string[] }

const CONTEXT_HELP: Record<HelpContext, HelpSection> = {
  menu: {
    title: 'Starting a campaign',
    body: 'Border Marches is the clearest first map. One human player and one Standard opponent gives the ordinary campaign experience.',
    steps: [
      'Human is controlled by you. Standard is the computer opponent. Dormant owns its starting position but takes no economic actions.',
      'Difficulty changes your starting resources, guardian strength, and computer income and growth. It does not teach different rules.',
      'The world seed reproduces the same map deals, offers, and outcomes for sharing or replay.',
      'Select a map, controllers, factions, and difficulty; then choose Begin campaign.',
    ],
  },
  adventure: {
    title: 'Adventure map',
    body: 'Spend each hero’s movement to explore, collect resources, visit places, capture income, and choose affordable fights before ending the day.',
    steps: [
      'Click a hero in the right panel, then hover a map tile to preview a safe route. Click once to travel.',
      'Crossed swords mean the destination begins a fight. A guardian’s red hover region shows where it will engage.',
      'Hover anything for its name. Right-click for rules and flavor. Inspect mode makes the same cards available with left-click.',
      'Build and recruit from owned cities. When useful heroes have spent their movement, choose End turn.',
    ],
  },
  castle: {
    title: 'City',
    body: 'A city converts daily income into buildings and weekly creature growth. Each city may construct one building per day.',
    steps: [
      'Building cards show four states: built, available, unaffordable, or locked. Select one for its function, cost, requirement, and exact reason.',
      'Recruitment rows show weekly availability and per-creature cost. Choose a number, then Hire.',
      'A visiting hero can exchange companies with the garrison and learn available guild spells.',
      'Tavern, market, tunnel, shipyard, and faction services appear only when their building exists.',
    ],
  },
  combat: {
    title: 'Combat',
    body: 'Companies act in speed order. The highlighted company may move, attack, use an available ability, Wait, or Defend.',
    steps: [
      'Gold hexes are reachable. Enemy hexes with a sword can be attacked with one click.',
      'For melee attacks, aim near an enemy hex edge to choose the approach direction. Ranged companies shoot while they have shots.',
      'Morale is the gold ring around each company. At its threshold, the company acts again after its current action; a gold rally announces it.',
      'Right-click any occupied hex to inspect it. Hover named abilities, counters, spells, and effects; right-click for their rules.',
      'Wait acts later this round. Defend ends the action with protection. Spells and items use the hero act, not the company action.',
    ],
  },
  choice: {
    title: 'Choice',
    body: 'These outcomes are mutually exclusive unless the card says otherwise. Offered content can be inspected before you commit.',
    steps: [
      'Read the exact benefit, cost, Debt, or permanent consequence on every card.',
      'Hover for names and right-click spells, artifacts, items, skills, heroes, or units for full rules.',
      'A dimmed option is unavailable; hover it for the reason.',
    ],
  },
  result: {
    title: 'Results',
    body: 'The result summarizes immediate losses, experience, recovery, and battle performance before returning to the campaign.',
    steps: [
      'Attacker and defender losses count creatures, while casualty value measures their economic cost.',
      'Experience belongs to the attacking hero when eligible. Recovery reports creatures restored after battle.',
      'Continue applies the already-resolved result and returns to the adventure map.',
    ],
  },
  campaign: {
    title: 'Campaign outcome',
    body: 'The terminal record is presented from the human perspective without changing the authored victory or defeat rules.',
    steps: [
      'The map name and authored objective identify the scenario that concluded.',
      'Winner, defeated commander, or retiring commander identifies who produced the terminal state.',
      'The outcome reason distinguishes conquest, a held objective, artifact assembly, a slain target, and sandbox retirement.',
      'Final statistics are part of the concluded state. Return to title to start or load another campaign.',
    ],
  },
};

const GLOSSARY = [
  ['Company', 'One army stack: a number of identical creatures acting together.'],
  ['Morale', 'The gold gauge around a company. At its threshold—normally 100—that company acts again after its current action.'],
  ['Growth', 'Creatures added to a built dwelling at the start of each week.'],
  ['Standard / Upgraded', 'Every spell has Standard and Upgraded rules. Permanent learning says Upgraded; resonance says Upgraded here and names the reason.'],
  ['Resonance', 'A school condition that makes matching spells resolve with its + effect.'],
  ['Counter', 'Burn, Chill, Hex, or Bloom placed on a company; inspect each counter for its rule.'],
  ['Enchantment', 'A longer spell effect occupying one of two slots for a side.'],
  ['Debt', 'A visible future cost accepted in exchange for an immediate bargain benefit.'],
  ['Burden', 'A powerful artifact with a visible drawback and removal condition.'],
  ['Guardian', 'A neutral army that fights when entered directly or through its marked aggro region.'],
] as const;

const CONTEXT_SHORTCUTS: Partial<Record<HelpContext, Array<[string, string]>>> = {
  adventure: [['M', 'world view'], ['Space', 'end adventure turn']],
  castle: [['Enter', 'return to map']],
  result: [['Enter', 'continue']],
};

export function ContextHelp({ state, context }: { state: GameState | null; context: HelpContext }) {
  const [open, setOpen] = useState(false);
  const [glossary, setGlossary] = useState(false);
  const help = CONTEXT_HELP[context];

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault(); setOpen((value) => !value);
      } else if (event.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  return <>
    <button className="help-toggle" type="button" aria-haspopup="dialog"
      aria-expanded={open} onClick={() => setOpen(true)}><b>?</b><span>Help</span></button>
    {open && <div className="help-backdrop" onClick={() => setOpen(false)}>
      <article className="help-dialog" role="dialog" aria-label="How to play"
        onClick={(event) => event.stopPropagation()}>
        <header><div><span>How to play</span><h2>{glossary ? 'Field glossary' : help.title}</h2></div>
          <button aria-label="Close help" onClick={() => setOpen(false)}>×</button></header>
        {!glossary ? <>
          <p className="help-lead">{help.body}</p>
          {state && context !== 'combat' && context !== 'result' && <section className="help-objective">
            <span>Current objective</span><b>{state.map.victory.mechanics}</b></section>}
          <ol>{help.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <section className="control-legend"><h3>Controls</h3>
            <p><kbd>Hover</kbd> identify · <kbd>Right-click</kbd> inspect rules · <kbd>Left-click</kbd> select or act</p>
            <p><kbd>?</kbd> this help · <kbd>Esc</kbd> close help
              {(CONTEXT_SHORTCUTS[context] ?? []).map(([key, action]) => (
                <span key={key}> · <kbd>{key}</kbd> {action}</span>
              ))}</p>
          </section>
        </> : <dl className="help-glossary">{GLOSSARY.map(([term, definition]) =>
          <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl>}
        <footer><button className="secondary" onClick={() => setGlossary((value) => !value)}>
          {glossary ? `Back to ${help.title}` : 'Open glossary'}</button>
          <button className="primary" onClick={() => setOpen(false)}>Return to game</button></footer>
      </article>
    </div>}
  </>;
}
