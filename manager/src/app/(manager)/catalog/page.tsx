"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Tree, useSimpleTree, NodeApi, NodeRendererProps } from "react-arborist"
import { FolderOpen, Folder, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { listCategories, updateCategory, type AdminCategory } from "@/lib/api"

// react-arborist node shape
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

export default function CatalogPage() {
  const qc = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 300, height: 500 })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product-categories"],
    queryFn: listCategories,
    staleTime: 60_000,
  })

  const initialNodes = data
    ? toNodes((data.product_categories ?? []).filter((c) => !c.parent_category_id))
    : []

  const [treeData, controller] = useSimpleTree<CatNode>(initialNodes)

  // sync tree when server data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (data) controller.onReset?.(initialNodes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // fill container height
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  async function handleMove({ dragIds, parentId, index }: {
    dragIds: string[]
    parentId: string | null
    index: number
  }) {
    controller.onMove({ dragIds, parentId, index })
    try {
      await Promise.all(
        dragIds.map((id) =>
          updateCategory(id, { parent_category_id: parentId ?? null })
        )
      )
      qc.invalidateQueries({ queryKey: ["product-categories"] })
    } catch {
      toast.error("Не удалось сохранить порядок")
      qc.invalidateQueries({ queryKey: ["product-categories"] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Каталог</h1>
        <span className="text-xs text-muted-foreground">Перетащите категории для изменения порядка</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden px-2 py-2">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Загрузка...</div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-40 text-destructive text-sm">Ошибка загрузки</div>
        )}
        {!isLoading && !isError && (
          <Tree<CatNode>
            data={treeData}
            {...controller}
            onMove={handleMove}
            openByDefault={true}
            width={size.width}
            height={size.height}
            indent={20}
            rowHeight={36}
            disableEdit
            disableMultiSelection={false}
          >
            {CategoryNode}
          </Tree>
        )}
      </div>
    </div>
  )
}

function CategoryNode({ node, style, dragHandle }: NodeRendererProps<CatNode>) {
  const hasChildren = (node.children?.length ?? 0) > 0

  return (
    <div
      style={style}
      ref={dragHandle}
      className={[
        "flex items-center gap-2 px-2 rounded-md select-none transition-colors",
        node.state.isSelected ? "bg-primary/10" : "hover:bg-accent",
        node.state.isDragging ? "opacity-50" : "",
        node.state.isDropTarget ? "ring-1 ring-primary" : "",
      ].join(" ")}
      onClick={() => node.toggle()}
    >
      {hasChildren ? (
        node.isOpen
          ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          : <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}

      <span className={[
        "text-sm truncate flex-1",
        node.data.isActive ? "" : "text-muted-foreground",
      ].join(" ")}>
        {node.data.name}
      </span>

      {!node.data.isActive && (
        <span className="text-xs text-muted-foreground shrink-0">скрыта</span>
      )}
    </div>
  )
}
