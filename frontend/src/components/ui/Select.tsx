"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchable = true,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filtered = options.filter((opt) =>
    search ? normalize(opt.label).includes(normalize(search)) : true
  );

  const selected = options.find((opt) => opt.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          onChange(filtered[activeIndex].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    close();
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
          isOpen
            ? "border-accent ring-1 ring-accent/20"
            : "border-border hover:border-zinc-600"
        } bg-primary text-primary`}
      >
        <span
          className={`flex-1 truncate ${
            selected ? "text-primary" : "text-muted"
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[1300] mt-1.5 w-full overflow-hidden rounded-xl border border-zinc-700 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150" style={{ backgroundColor: "#1c1c1f" }}>
          {searchable && (
            <div className="relative border-b border-zinc-700 p-2">
              <Search
                size={13}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Pesquisar..."
                className="w-full rounded-lg border border-zinc-700 bg-primary py-2 pl-8 pr-3 text-sm text-primary placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-[260px] overflow-y-auto p-1.5"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148,163,184,0.35) transparent",
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-zinc-500">
                Nenhum item encontrado
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    opt.value === value
                      ? "font-semibold text-accent"
                      : i === activeIndex
                      ? "bg-accent/10 text-primary"
                      : "text-primary hover:bg-white/5"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && (
                    <Check size={14} className="shrink-0 text-accent" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}