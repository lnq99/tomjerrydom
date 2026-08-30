"use client"

import { Minus, Plus, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: number
  ordered?: number
  onChange: (qty: number) => void
  min?: number
  disabled?: boolean
}

export function QtyControl({ value, ordered, onChange, min = 0, disabled = false }: Props) {
  const hasRatio = ordered !== undefined
  const isGood = !hasRatio || value >= ordered!

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={cn(
        "inline-flex items-center rounded-full border bg-muted/40 overflow-hidden transition-opacity",
        disabled && "opacity-40 cursor-not-allowed"
      )}>
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-full"
        >
          <Minus className="h-3 w-3" />
        </button>

        <input
          type="number"
          value={value}
          min={min}
          disabled={disabled}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) onChange(Math.max(min, n))
          }}
          className="w-8 text-center text-sm font-semibold bg-transparent focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-full"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {hasRatio && (
        <div className={cn(
          "text-[10px] font-semibold flex items-center gap-0.5",
          isGood ? "text-green-600" : "text-destructive"
        )}>
          <span>{value}/{ordered}</span>
          {isGood && <CheckCircle className="h-3 w-3" />}
        </div>
      )}
    </div>
  )
}
