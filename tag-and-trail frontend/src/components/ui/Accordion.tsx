import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionItemProps {
  value: string;
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ value, trigger, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80" data-value={value}>
      <button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-slate-950 transition-colors hover:text-sky-600" onClick={() => setIsOpen(!isOpen)}>
        <span>{trigger}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="px-4 pb-4 text-sm text-slate-600">{children}</div>}
    </div>
  );
}