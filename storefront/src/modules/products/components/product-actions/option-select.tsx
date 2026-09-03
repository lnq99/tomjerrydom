"use client"

import { HttpTypes } from "@medusajs/types"
import { VariantChip } from "@modules/products/components/variant-chip"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (optionId: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const values = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-medium text-ui-fg-base">
        {title || "Option"}
        {current && (
          <span className="ml-2 font-normal text-ui-fg-subtle">— {current}</span>
        )}
      </span>
      <div className="flex flex-wrap gap-2" data-testid={dataTestId}>
        {values.map((v) => (
          <VariantChip
            key={v}
            label={v}
            selected={v === current}
            onClick={() => updateOption(option.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

export default OptionSelect
