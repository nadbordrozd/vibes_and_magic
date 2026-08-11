import { SKILLS, SKILL_IDS } from '../../content/skills';
import { SPELLS, SPELL_IDS } from '../../content/spells';
import { SPELL_SCHOOL_NAMES } from '../../content/spellPresentation';
import { SPELL_LEXICON, type SpellLexiconId } from '../../content/spellLexicon';
import { ContentIcon } from './ContentIcon';
import { SpellEffectIcon } from './SpellEffectIcon';

export function ContentIconShowcase() {
  return <main className="content-icon-showcase">
    <header>
      <span className="kicker">Work orders 46 &amp; 54 · native icon output</span>
      <h1>Spell, effect &amp; secondary-skill icon sheet</h1>
      <p>Every bitmap is shipped at 32×32. The 64px review presentation is an exact
        integer enlargement; labels and mechanics remain separate accessible UI text.</p>
    </header>
    <section>
      <h2>Spells · {SPELL_IDS.length}</h2>
      <div className="content-icon-sheet spell-icon-sheet">
        {SPELL_IDS.map((id) => <article key={id} className={SPELLS[id].school}>
          <ContentIcon kind="spell" id={id} large />
          <div><b>{SPELLS[id].name}</b>
            <small>{SPELL_SCHOOL_NAMES[SPELLS[id].school]} · {SPELLS[id].mana} mana</small></div>
        </article>)}
      </div>
    </section>
    <section>
      <h2>Shared spell effects · {Object.keys(SPELL_LEXICON).length}</h2>
      <div className="content-icon-sheet effect-icon-sheet">
        {(Object.keys(SPELL_LEXICON) as SpellLexiconId[]).map((id) => <article key={id}>
          <SpellEffectIcon id={id} large />
          <div><b>{SPELL_LEXICON[id].name}</b><small>{id}</small></div>
        </article>)}
      </div>
    </section>
    <section>
      <h2>Secondary skills · {SKILL_IDS.length}</h2>
      <div className="content-icon-sheet skill-icon-sheet">
        {SKILL_IDS.map((id) => <article key={id}>
          <ContentIcon kind="skill" id={id} large />
          <div><b>{SKILLS[id].name}</b><small>{SKILLS[id].ranks[1]}</small></div>
        </article>)}
      </div>
    </section>
  </main>;
}
