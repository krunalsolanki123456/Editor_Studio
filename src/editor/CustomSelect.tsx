import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T = string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  size?: 'xs' | 'sm' | 'md';
}

export default function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  className = '',
  buttonClassName = '',
  size = 'md',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 230 && rect.top > 230) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left ${isOpen ? 'z-[999]' : 'z-auto'} ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium outline-none transition-all shadow-2xs hover:border-primary-500 cursor-pointer ${
          size === 'xs' ? 'h-8 px-2 py-0 text-xs' : size === 'sm' ? 'h-9 px-2.5 py-0 text-xs' : 'px-3 py-2 text-xs'
        } ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-[9999] max-h-56 overflow-y-auto be-scroll animate-scale-in ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer mb-0.5 ${
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                  {opt.subLabel && <span className="text-[10px] text-gray-400 font-normal">({opt.subLabel})</span>}
                </div>
                {isSelected && <Check size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
