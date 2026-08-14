import { CASTLE_NAMES } from '../../content/factionPresentation';
import { SPELLS } from '../../content/spells';
import type {
  Castle, GameState, Hero, MapObject,
} from '../../core/types';
import { previewAction } from '../actionPreview';
import type { ActionDraft } from './ActionConfirmationDialog';
import { ContentIcon } from './ContentIcon';

export function PalimpsestService({
  state, hero, site, onDraft,
}: {
  state: GameState;
  hero: Hero;
  site: Castle | Extract<MapObject, { kind: 'shrine' }>
    | (Extract<MapObject, { kind: 'stacks' | 'wildShrine' }> & { kind: 'stacks' });
  onDraft: (draft: ActionDraft) => void;
}) {
  return <section className="contextual-service-section palimpsest-service">
    <h4>Palimpsest · rank {hero.skills.palimpsest}</h4>
    <b>{'faction' in site
      ? `Mage Guild at ${CASTLE_NAMES[site.faction]}`
      : site.kind === 'stacks' ? 'The Stacks undertext'
        : `${site.school} shrine inscription`}</b>
    <small>Choose one known spell to erase. Then keep one of {
      (hero.skills.palimpsest === 1 ? 2
        : hero.skills.palimpsest === 3 && (!('faction' in site)
          && (site.kind === 'stacks' || site.kind === 'shrine')) ? 4 : 3)
      + ((hero.skills.loremaster ?? 0) >= 2 ? 1 : 0)} seeded unknown spells from this site.
      The erased spell and its upgrade are permanently lost.</small>
    <div className="service-options">
      {hero.knownSpells.map((spellId) => {
        const action = { type: 'PALIMPSEST_FORGET', siteId: site.id, spellId } as const;
        const projected = previewAction(state, action);
        return <button key={spellId} data-inspect-kind="spell" data-inspect-id={spellId}
          disabled={!projected.legal}
          title={!projected.legal ? projected.reason ?? 'This spell cannot be erased here.'
            : `Erase ${SPELLS[spellId].name} and reveal the replacement offer.`}
          onClick={() => onDraft({
            action, title: `Forget ${SPELLS[spellId].name}`, actor: hero.name, target: hero.name,
            effect: `Permanently erase ${SPELLS[spellId].name}${hero.upgradedSpells.includes(spellId) ? '+' : ''}, then choose one replacement from the visible Palimpsest offer.`,
          })}
        ><ContentIcon kind="spell" id={spellId} />Forget {SPELLS[spellId].name}{hero.upgradedSpells.includes(spellId) ? '+' : ''}</button>;
      })}
    </div>
  </section>;
}
