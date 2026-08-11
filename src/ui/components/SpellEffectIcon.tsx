import { spellEffectIcon } from '../../../assets/iconManifest';
import { SPELL_LEXICON, type SpellLexiconId } from '../../content/spellLexicon';

interface Props {
  id: SpellLexiconId;
  className?: string;
  large?: boolean;
}

/** One no-fallback manifest renderer shared by later spell-rule and inspection surfaces. */
export function SpellEffectIcon({ id, className = '', large = false }: Props) {
  const entry = spellEffectIcon(id);
  const size = large ? 64 : 32;
  return <img
    className={`content-icon spell-effect-icon ${className}`}
    src={`/${entry.file}`}
    width={size}
    height={size}
    alt={`${SPELL_LEXICON[id].name} effect icon`}
    draggable={false}
  />;
}
