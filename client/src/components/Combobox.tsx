import { useState, useRef, useEffect } from "react";
import styles from "./styles/Combobox.module.css";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function Combobox({ value, onChange, options, placeholder, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (opt) => opt.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function handleInputChange(val: string) {
    setInputValue(val);
    onChange(val);
    setOpen(true);
  }

  function handleSelect(opt: string) {
    setInputValue(opt);
    onChange(opt);
    setOpen(false);
  }

  return (
    <div ref={ref} className={styles.wrapper}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className={styles.dropdown} role="listbox">
          {filtered.map((opt) => (
            <li
              key={opt}
              className={styles.option}
              role="option"
              aria-selected={opt === inputValue}
              onMouseDown={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
