import { spellEffectIcon } from '../../../assets/iconManifest';
import { SPELL_LEXICON, type SpellLexiconId } from '../../content/spellLexicon';

interface Props {
  id: SpellLexiconId;
  className?: string;
  large?: boolean;
  decorative?: boolean;
}

/** One no-fallback manifest renderer shared by later spell-rule and inspection surfaces. */
export function SpellEffectIcon({ id, className = '', large = false, decorative = false }: Props) {
  const size = large ? 64 : 32;
  const entry = spellEffectIcon(id);
  return <img
    className={`content-icon spell-effect-icon ${className}`}
    src={`/${entry.file}`}
    width={size}
    height={size}
    alt={decorative ? '' : `${SPELL_LEXICON[id].name} effect icon`}
    aria-hidden={decorative || undefined}
    draggable={false}
  />;
}
