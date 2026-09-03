import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React, { useEffect, useRef, useState } from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

function OptionChip({
  v,
  current,
  onSelect,
  disabled,
}: {
  v: string
  current: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = spanRef.current
    if (el) setOverflows(el.scrollWidth > el.clientWidth)
  }, [v])

  return (
    <button
      onClick={onSelect}
      className={clx(
        "border-ui-border-base bg-ui-bg-subtle border text-xs rounded-rounded px-2 py-1 max-w-full overflow-hidden",
        {
          "border-ui-border-interactive": current,
          "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
            !current,
        }
      )}
      disabled={disabled}
      data-testid="option-button"
    >
      <span
        ref={spanRef}
        className={clx("block whitespace-nowrap", {
          "[mask-image:linear-gradient(to_right,black_calc(100%_-_8px),transparent_100%)]":
            overflows,
        })}
      >
        {v}
      </span>
    </button>
  )
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-medium text-ui-fg-base">
        {title || "Option"}
        {current && (
          <span className="ml-2 font-normal text-ui-fg-subtle">— {current}</span>
        )}
      </span>
      <div className="flex flex-wrap gap-2" data-testid={dataTestId}>
        {filteredOptions.map((v) => (
          <OptionChip
            key={v}
            v={v}
            current={v === current}
            onSelect={() => updateOption(option.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

export default OptionSelect
