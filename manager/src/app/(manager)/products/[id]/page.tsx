"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { getProduct } from "@/lib/api"
import { ProductForm } from "@/components/product-form"

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    staleTime: 30_000,
    retry: 1,
  })

  // key remounts the form once the real product data arrives so useState
  // re-initialises with the actual product values instead of empty defaults
  return (
    <ProductForm
      key={data?.product?.id ?? (isError ? "error" : "loading")}
      product={data?.product}
      isLoading={!data && !isError}
      isError={isError}
    />
  )
}
