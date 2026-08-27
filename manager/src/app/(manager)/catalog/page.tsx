"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Tree, useSimpleTree, MoveHandler, NodeRendererProps } from "react-arborist"
import { FolderOpen, Folder, GripVertical, Package, ChevronRight } from "lucide-react"
import { AgGridReact, AgGridProvider } from "ag-grid-react"
import { ClientSideRowModelModule, themeQuartz, type ColDef, type RowClickedEvent } from "ag-grid-community"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { listCategories, updateCategory, listProducts, type AdminCategory, type AdminProduct } from "@/lib/api"
import { formatRub } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

type CatNode = {
  id: string
  name: string
  isActive: boolean
  children?: CatNode[]
}

function toNodes(cats: AdminCategory[]): CatNode[] {
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.is_active,
    children: c.category_children.length ? toNodes(c.category_children) : undefined,
  }))
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "Опубликован", variant: "success" },
  draft:     { label: "Черновик",   variant: "secondary" },
  rejected:  { label: "Отклонён",   variant: "outline" },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>("")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product-categories"],
    queryFn: listCategories,
    staleTime: 60_000,
  })

  const roots = data
    ? toNodes((data.product_categories ?? []).filter((c) => !c.parent_category_id))
    : null

  function handleSelect(id: string, name: string) {
    setSelectedId(id)
    setSelectedName(name)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3">
        <h1 className="text-xl font-bold">Каталог</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Category tree (left panel) ── */}
        <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Категории</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Загрузка...</div>
            )}
            {isError && (
              <div className="flex items-center justify-center h-32 text-destructive text-sm">Ошибка</div>
            )}
            {roots && (
              <CatalogTree
                initialNodes={roots}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>
        </div>

        {/* ── Products panel (right) ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedId ? (
            <ProductsPanel categoryId={selectedId} categoryName={selectedName} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <ChevronRight className="h-8 w-8 opacity-30" />
              <span className="text-sm">Выберите категорию</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Category tree ─────────────────────────────────────────────────────────────

function CatalogTree({
  initialNodes,
  selectedId,
  onSelect,
}: {
  initialNodes: CatNode[]
  selectedId: string | null
  onSelect: (id: string, name: string) => void
}) {
  const qc = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 240, height: 500 })
  const [treeData, controller] = useSimpleTree<CatNode>(initialNodes)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleMove: MoveHandler<CatNode> = async (args) => {
    controller.onMove(args)
    try {
      await Promise.all(
        args.dragIds.map((id) =>
          updateCategory(id, { parent_category_id: args.parentId ?? null })
        )
      )
      qc.invalidateQueries({ queryKey: ["product-categories"] })
    } catch {
      toast.error("Не удалось сохранить порядок")
      qc.invalidateQueries({ queryKey: ["product-categories"] })
    }
  }

  return (
    <div ref={containerRef} className="absolute inset-0 py-1">
      <Tree<CatNode>
        data={treeData}
        {...controller}
        onMove={handleMove}
        onSelect={(nodes) => {
          if (nodes.length > 0) onSelect(nodes[0].id, nodes[0].data.name)
        }}
        openByDefault={true}
        width={size.width}
        height={size.height}
        indent={16}
        rowHeight={34}
        disableEdit
      >
        {(props) => (
          <CategoryNode {...props} selectedId={selectedId} onSelect={onSelect} />
        )}
      </Tree>
    </div>
  )
}

function CategoryNode({
  node,
  style,
  dragHandle,
  selectedId,
  onSelect,
}: NodeRendererProps<CatNode> & { selectedId: string | null; onSelect: (id: string, name: string) => void }) {
  const hasChildren = (node.children?.length ?? 0) > 0
  const isSelected = node.id === selectedId

  return (
    <div
      style={style}
      className={[
        "flex items-center gap-1 rounded-md select-none transition-colors",
        node.state.isDragging ? "opacity-50" : "",
        node.state.willReceiveDrop ? "ring-1 ring-primary bg-primary/5" : "",
      ].join(" ")}
    >
      <div
        ref={dragHandle}
        className="px-1 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div
        className={[
          "flex flex-1 items-center gap-1.5 pr-2 py-1 rounded-md cursor-pointer",
          isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        ].join(" ")}
        onClick={() => {
          node.toggle()
          onSelect(node.id, node.data.name)
        }}
      >
        {hasChildren ? (
          node.isOpen
            ? <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            : <Folder className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <span className={[
          "text-sm truncate flex-1",
          !node.data.isActive && !isSelected ? "text-muted-foreground" : "",
        ].join(" ")}>
          {node.data.name}
        </span>
      </div>
    </div>
  )
}

// ── Products panel ────────────────────────────────────────────────────────────

const gridTheme = themeQuartz.withParams({
  spacing: 6,
  fontSize: 13,
  fontFamily: "inherit",
})

function ProductsPanel({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ["products", { category_id: categoryId }],
    queryFn: () => listProducts({ category_id: categoryId, limit: 200 }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []

  const colDefs = useMemo<ColDef<AdminProduct>[]>(() => [
    {
      headerName: "",
      width: 52,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data: p }: { data: AdminProduct }) =>
        p.thumbnail
          ? <img src={p.thumbnail} alt="" className="h-8 w-8 rounded object-cover mt-1" />
          : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center mt-1"><Package className="h-3.5 w-3.5 text-muted-foreground" /></div>,
    },
    {
      field: "title",
      headerName: "Название",
      flex: 2,
      cellRenderer: ({ data: p }: { data: AdminProduct }) => (
        <span className="font-medium">{p.title}</span>
      ),
    },
    {
      headerName: "Варианты",
      width: 100,
      valueGetter: ({ data: p }) => p?.variants?.length ?? 0,
      cellRenderer: ({ value }: { value: number }) => (
        <span className="text-muted-foreground">{value} вар.</span>
      ),
    },
    {
      headerName: "Мин. цена",
      width: 120,
      valueGetter: ({ data: p }) => {
        const prices = p?.variants?.flatMap((v) => v.prices ?? []).filter((pr) => pr.currency_code === "rub")
        if (!prices?.length) return null
        return Math.min(...prices.map((pr) => pr.amount))
      },
      cellRenderer: ({ value }: { value: number | null }) =>
        value != null ? <span>{formatRub(value)}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      field: "status",
      headerName: "Статус",
      width: 130,
      cellRenderer: ({ data: p }: { data: AdminProduct }) => {
        const s = STATUS_MAP[p.status] ?? { label: p.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
  ], [])

  const onRowClicked = useCallback((e: RowClickedEvent<AdminProduct>) => {
    if (e.data) router.push(`/products/${e.data.id}`)
  }, [router])

  return (
    <>
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <span className="font-medium text-sm">{categoryName}</span>
        <span className="text-xs text-muted-foreground">{data?.count ?? "—"} товаров</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Загрузка...</div>
        )}
        {!isLoading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Package className="h-6 w-6 opacity-30" />
            <span className="text-sm">Нет товаров</span>
          </div>
        )}
        {!isLoading && products.length > 0 && (
          <div className="absolute inset-0">
            <AgGridProvider modules={[ClientSideRowModelModule]}>
              <AgGridReact<AdminProduct>
                theme={gridTheme}
                rowData={products}
                columnDefs={colDefs}
                rowHeight={44}
                headerHeight={36}
                onRowClicked={onRowClicked}
                rowClass="cursor-pointer"
                suppressCellFocus
                suppressMovableColumns
              />
            </AgGridProvider>
          </div>
        )}
      </div>
    </>
  )
}
