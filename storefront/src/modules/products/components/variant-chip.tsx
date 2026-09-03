"use client"

import { clx } from "@modules/common/components/ui"

type VariantChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  size?: "sm" | "md"
  className?: string
}

export function VariantChip({
  label,
  selected,
  onClick,
  disabled,
  size = "md",
  className,
}: VariantChipProps) {
  const Tag = onClick ? "button" : ("span" as any)
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={clx(
        "inline-flex items-center rounded border border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted overflow-hidden whitespace-nowrap max-w-full",
        size === "sm" ? "px-1.5 py-0.5 text-[10px] leading-none" : "px-2 py-1 text-xs",
        {
          "border-ui-border-interactive": selected,
          "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
            !!onClick && !selected,
        },
        className
      )}
    >
      {label}
    </Tag>
  )
}
