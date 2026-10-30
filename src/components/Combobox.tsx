'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '../lib/shadcn/utils'
import { Button } from '../lib/shadcn/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../lib/shadcn/command'
import { Popover, PopoverContent, PopoverTrigger } from '../lib/shadcn/popover'

export interface ComboboxOption {
  value: string
  label: string
  description?: string | null
  imageUrl?: string | null
  flag?: string | null
  number?: number | null
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  /** Label for an optional "add new" action shown at the bottom of the list. */
  addNewLabel?: string
  /** Called when the "add new" action is chosen; receives the current search text. */
  onAddNew?: (query: string) => void
}

/**
 * Combobox wrapper that sizes the popover to the trigger's width, so the list
 * fills the field instead of being a fixed 200px popover.
 */
export function Combobox({
  options,
  value = '',
  onValueChange,
  placeholder = 'Välj…',
  searchPlaceholder,
  emptyMessage = 'Inga träffar.',
  className,
  disabled = false,
  addNewLabel,
  onAddNew,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const listId = React.useId()

  const selectedOption = options.find(o => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedOption?.number != null && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                {selectedOption.number}
              </span>
            )}
            {selectedOption?.imageUrl && (
              <img
                src={selectedOption.imageUrl}
                alt=""
                className="h-5 w-5 shrink-0 rounded object-contain"
              />
            )}
            {selectedOption?.flag && (
              <span className="shrink-0 text-base leading-none">{selectedOption.flag}</span>
            )}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command shouldFilter={!!searchPlaceholder}>
          <div className="relative">
            {searchPlaceholder ? (
              <CommandInput
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={query}
                onValueChange={setQuery}
                className={addNewLabel && onAddNew ? 'pr-9' : undefined}
              />
            ) : addNewLabel && onAddNew ? (
              <div className="h-9 border-b" />
            ) : null}
            {addNewLabel && onAddNew && (
              <button
                type="button"
                aria-label={addNewLabel}
                title={addNewLabel}
                onClick={() => {
                  onAddNew(query)
                  setOpen(false)
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <CommandList id={listId}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  disabled={option.disabled ?? false}
                  onSelect={() => {
                    onValueChange?.(option.value === value ? '' : option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.number != null && (
                    <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                      {option.number}
                    </span>
                  )}
                  {option.imageUrl && (
                    <img
                      src={option.imageUrl}
                      alt=""
                      className="mr-2 h-5 w-5 shrink-0 rounded object-contain"
                    />
                  )}
                  {option.flag && (
                    <span className="mr-2 shrink-0 text-base leading-none">{option.flag}</span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
