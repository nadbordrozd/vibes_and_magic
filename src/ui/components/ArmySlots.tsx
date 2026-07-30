import { UNITS } from '../../content/units';
import type { Army } from '../../core/types';

interface Props {
  army: Army;
  title: string;
  selected?: number | null;
  onSelect?: (slot: number) => void;
}

export function ArmySlots({ army, title, selected, onSelect }: Props) {
  return (
    <div className="army-block">
      <h4>{title}</h4>
      <div className="army-slots">
        {army.map((stack, index) => (
          <button
            key={index}
            className={`army-slot ${selected === index ? 'selected' : ''}`}
            onClick={() => onSelect?.(index)}
            disabled={!onSelect}
            title={stack ? `${stack.count} ${UNITS[stack.unitId].name}` : 'Empty slot'}
          >
            {stack ? (
              <>
                <span className="unit-mark">{UNITS[stack.unitId].name.slice(0, 2)}</span>
                <b>{stack.count}</b>
              </>
            ) : <span className="empty-mark">+</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
