import { skillIcon, spellIcon } from '../../../assets/iconManifest';
import { SKILLS } from '../../content/skills';
import { SPELLS } from '../../content/spells';
import type { SecondarySkillId, SpellId } from '../../core/types';

type Props = {
  className?: string;
  large?: boolean;
} & ({ kind: 'spell'; id: SpellId } | { kind: 'skill'; id: SecondarySkillId });

/** One manifest-backed bitmap component shared by every spell and secondary-skill surface. */
export function ContentIcon(props: Props) {
  const entry = props.kind === 'spell' ? spellIcon(props.id) : skillIcon(props.id);
  const name = props.kind === 'spell' ? SPELLS[props.id].name : SKILLS[props.id].name;
  const displaySize = props.large ? 64 : 32;
  return <img
    className={`content-icon ${props.kind}-icon ${props.className ?? ''}`}
    src={`/${entry.file}`}
    width={displaySize}
    height={displaySize}
    alt={`${name} ${props.kind} icon`}
    draggable={false}
  />;
}
