import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

// Textarea with @mention suggestions. Picking a person inserts
// @[Name](userId), which SafeText shows as a highlighted mention.
export default function MentionTextarea({ value, onChange, ...props }) {
  const ref = useRef(null);
  const [query, setQuery] = useState(null); // { text, start } while typing @…
  const [people, setPeople] = useState([]);
  const [active, setActive] = useState(0);

  // Search as the student types after "@".
  useEffect(() => {
    if (!query || query.text.length < 1) return undefined;
    let cancelled = false;
    const id = window.setTimeout(() => {
      apiRequest(`/forum/users?q=${encodeURIComponent(query.text)}`)
        .then((r) => {
          if (cancelled) return;
          setPeople(r.users);
          setActive(0);
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);

  const detect = (text, caret) => {
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)@([A-Za-z][A-Za-z.' -]{0,29})$/);
    if (match) setQuery({ text: match[2].trim(), start: caret - match[2].length - 1 });
    else {
      setQuery(null);
      setPeople([]);
    }
  };

  const pick = (person) => {
    const el = ref.current;
    const caret = el.selectionStart;
    const token = `@[${person.name}](${person.id}) `;
    const next = value.slice(0, query.start) + token + value.slice(caret);
    onChange(next);
    setQuery(null);
    setPeople([]);
    requestAnimationFrame(() => {
      const pos = query.start + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const open = query && people.length > 0;

  return (
    <div className="mention-box">
      <textarea
        {...props}
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % people.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + people.length) % people.length); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(people[active]); }
          else if (e.key === 'Escape') { setQuery(null); setPeople([]); }
        }}
        onBlur={() => window.setTimeout(() => setPeople([]), 150)}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <ul className="mention-list" role="listbox" aria-label="People to mention">
          {people.map((person, i) => (
            <li
              key={person.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(person);
              }}
            >
              <strong>{person.name}</strong>
              {person.year && <small>{person.year}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
