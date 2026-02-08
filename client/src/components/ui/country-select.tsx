import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { countries, type Country } from "@/lib/countries"

interface CountrySelectProps {
    value: string
    onChange: (value: string) => void
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
    const [open, setOpen] = React.useState(false) // Start closed
    const [isOpen, setIsOpen] = React.useState(false)

    // Find selected country object based on dial_code (value)
    // We use find to get the first match, default to SA if not found or empty
    const selectedCountry = countries.find((c) => c.dial_code === value) || countries[0]

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-[110px] sm:w-[140px] justify-between px-2 h-11 bg-white/50 border-input"
                    dir="ltr"
                >
                    <div className="flex items-center gap-2 truncate">
                        <img
                            src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png 2x`}
                            width="24"
                            alt={selectedCountry.name}
                            className="rounded-sm object-cover h-4 w-6 shrink-0"
                        />
                        <span className="text-sm font-semibold text-gray-700">{selectedCountry.dial_code}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 hidden sm:block" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <div className="flex items-center border-b px-3" dir="rtl">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput placeholder="ابحث عن دولة..." className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" />
                    </div>
                    <CommandList>
                        <CommandEmpty>لم يتم العثور على دولة.</CommandEmpty>
                        <CommandGroup>
                            {countries.map((country) => (
                                <CommandItem
                                    key={country.code}
                                    value={country.name} // Search by name
                                    onSelect={(currentValue) => {
                                        onChange(country.dial_code)
                                        setIsOpen(false)
                                    }}
                                    className="flex items-center gap-2 cursor-pointer p-2"
                                >
                                    <img
                                        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                                        loading="lazy"
                                        width="20"
                                        alt={country.name}
                                        className="rounded-sm"
                                    />
                                    <span className="flex-1 text-right">{country.name}</span>
                                    <span className="text-muted-foreground text-xs dir-ltr">{country.dial_code}</span>
                                    <Check
                                        className={cn(
                                            "mr-auto h-4 w-4",
                                            value === country.dial_code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
