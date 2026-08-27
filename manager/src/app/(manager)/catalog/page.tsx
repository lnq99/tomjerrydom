"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Tree, useSimpleTree, MoveHandler, NodeRendererProps } from "react-arborist"
import { FolderOpen, Folder, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { listCategories, updateCategory, type AdminCategory } from "@/lib/api"

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

  // re-key forces useSimpleTree to reinitialize when server data arrives
  const treeKey = data ? "loaded" : "empty"

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
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Каталог</h1>
        <span className="text-xs text-muted-foreground">Перетащите для изменения порядка</span>
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
            key={treeKey}
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
        "flex items-center gap-2 px-2 rounded-md select-none transition-colors cursor-grab active:cursor-grabbing",
        node.state.isSelected ? "bg-primary/10" : "hover:bg-accent",
        node.state.isDragging ? "opacity-50" : "",
        node.state.willReceiveDrop ? "ring-1 ring-primary bg-primary/5" : "",
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
