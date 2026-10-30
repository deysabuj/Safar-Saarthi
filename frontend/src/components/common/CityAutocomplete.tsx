import React, { useState, useEffect, useRef, useId } from 'react';
import { MapPin, X, Check, Search, Plane, Train, AlertCircle } from 'lucide-react';
import {
  CityLocation,
  searchLocations,
  resolveLocation,
  isValidCityInput,
} from '@safar-saarthi/shared';

export interface CityAutocompleteProps {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string, location: CityLocation | null) => void;
  placeholder?: string;
  iconColor?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = 'Type a city name or code (e.g. Kanpur, DEL)...',
  iconColor = 'text-[#24766F]',
  required = false,
  disabled = false,
  className = '',
  testId,
}) => {
  const generatedId = useId();
  const inputId = id || `city-autocomplete-${generatedId}`;
  const listboxId = `city-listbox-${generatedId}`;

  // Internal search text
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<CityLocation[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Sync internal inputValue if external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Update suggestions whenever input changes
  useEffect(() => {
    const results = searchLocations(inputValue, 8);
    setSuggestions(results);
    setHighlightedIndex(-1);
  }, [inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleBlurValidation();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputValue]);

  // Validate or resolve entered text on blur
  const handleBlurValidation = () => {
    if (!inputValue.trim()) {
      onChange('', null);
      return;
    }

    const resolved = resolveLocation(inputValue);
    if (resolved) {
      setInputValue(resolved.displayLabel);
      onChange(resolved.displayLabel, resolved);
    } else {
      // Invalid input that doesn't match any city: reset to last valid value or notify
      setHasInteracted(true);
    }
  };

  const handleSelectCity = (city: CityLocation) => {
    setInputValue(city.displayLabel);
    onChange(city.displayLabel, city);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', null);
    setSuggestions(searchLocations('', 8));
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelectCity(suggestions[highlightedIndex]);
        } else if (isOpen && suggestions.length > 0 && inputValue.trim()) {
          // If typed exact or top suggestion
          e.preventDefault();
          handleSelectCity(suggestions[0]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectCity(suggestions[highlightedIndex]);
        } else {
          handleBlurValidation();
        }
        setIsOpen(false);
        break;

      default:
        break;
    }
  };

  // Scroll highlighted item into view in dropdown
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const isValid = !inputValue || isValidCityInput(inputValue);

  return (
    <div ref={containerRef} className={`relative ${className}`} data-testid={testId}>
      <label
        htmlFor={inputId}
        className="block text-xs font-bold text-[#142B3B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
      >
        <MapPin className={`w-3.5 h-3.5 ${iconColor}`} /> {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${inputId}-opt-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={inputValue}
          placeholder={placeholder}
          data-testid={`${testId || 'city'}-input`}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHasInteracted(true);
            const resolved = resolveLocation(e.target.value);
            // Inform parent with currently typed string and resolved city if available
            onChange(e.target.value, resolved);
          }}
          onFocus={() => {
            setSuggestions(searchLocations(inputValue, 8));
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-[#202B33] font-semibold text-xs transition-colors bg-[#F7F5F0]/60 focus:bg-white focus:outline-none ${
            !isValid && hasInteracted
              ? 'border-amber-400 focus:border-amber-500'
              : 'border-[#E3E7E5] focus:border-[#24766F]'
          }`}
        />

        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#586875] hover:text-[#202B33] rounded-md transition-colors"
            title="Clear city"
            aria-label="Clear city input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Listbox */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-[#E3E7E5] max-h-64 overflow-y-auto"
          style={{ minWidth: '280px' }}
        >
          {suggestions.length > 0 ? (
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="py-1 divide-y divide-[#F7F5F0]"
            >
              {suggestions.map((city, idx) => {
                const isSelected = resolveLocation(inputValue)?.id === city.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={city.id}
                    id={`${inputId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectCity(city)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors ${
                      isHighlighted
                        ? 'bg-[#F0F8F7] text-[#142B3B]'
                        : 'text-[#202B33] hover:bg-[#F7F5F0]'
                    } ${isSelected ? 'font-bold' : ''}`}
                    data-testid={`city-suggestion-${city.id}`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 p-1 rounded-md bg-[#F7F5F0] text-[#24766F] shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#142B3B]">{city.name}</span>
                          <span className="text-[11px] text-[#586875]">({city.state})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#586875] flex-wrap">
                          <span className="inline-flex items-center gap-0.5">
                            <Train className="w-2.5 h-2.5 text-[#24766F]" />
                            {city.railway.code}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Plane className="w-2.5 h-2.5 text-[#D7A45B]" />
                            {city.airport.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#24766F] shrink-0 ml-2" />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-xs text-[#586875] space-y-1" data-testid="city-no-match">
              <Search className="w-5 h-5 text-[#93ADBE] mx-auto mb-1" />
              <p className="font-semibold text-[#142B3B]">
                No cities matching &ldquo;{inputValue}&rdquo;
              </p>
              <p className="text-[11px]">
                Try typing popular destinations such as Kanpur, Varanasi, Jaipur, Delhi, or Mumbai.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Validation warning if unselected raw text doesn't resolve to a catalog city */}
      {!isValid && hasInteracted && inputValue.trim().length > 0 && !isOpen && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Please select a recognized destination from the list.</span>
        </div>
      )}
    </div>
  );
};
