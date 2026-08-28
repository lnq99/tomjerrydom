"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Film, Image, Plus, Trash2, ChevronUp, ChevronDown, Video } from "lucide-react"
import { toast } from "sonner"
import {
  listMediaItems,
  createMediaItem,
  deleteMediaItem,
  reorderMediaItems,
  type MediaItem,
} from "@/lib/api"

function AddItemForm({
  section,
  onAdd,
}: {
  section: "hero" | "reels"
  onAdd: (data: { type: "video" | "image"; url: string; title?: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [type, setType] = useState<"video" | "image">("video")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    try {
      await onAdd({ type, url: url.trim(), title: title.trim() || undefined })
      setUrl("")
      setTitle("")
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md border border-dashed hover:border-border w-full"
      >
        <Plus className="h-4 w-4" />
        Добавить {section === "hero" ? "слайд" : "видео"}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 flex flex-col gap-3 bg-muted/30">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("video")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${type === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          <Video className="h-3.5 w-3.5" /> Видео
        </button>
        {section === "hero" && (
          <button
            type="button"
            onClick={() => setType("image")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${type === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >
            <Image className="h-3.5 w-3.5" /> Изображение
          </button>
        )}
      </div>
      <input
        type="url"
        placeholder="https://cdn.example.com/video.mp4"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="text"
        placeholder="Подпись (необязательно)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Добавление…" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setUrl(""); setTitle("") }}
          className="px-4 py-2 rounded-md border text-sm text-muted-foreground hover:bg-muted"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

function MediaCard({
  item,
  isFirst,
  isLast,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: MediaItem
  isFirst: boolean
  isLast: boolean
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card group">
      {/* Thumbnail / preview */}
      <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.title ?? ""} className="w-full h-full object-cover" />
        ) : (
          <Film className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {item.type === "video" ? "Видео" : "Фото"}
          </span>
          {item.title && (
            <span className="text-sm font-medium truncate">{item.title}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.url}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Вверх"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Вниз"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function MediaSection({
  section,
  title,
  icon: Icon,
  description,
}: {
  section: "hero" | "reels"
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["media", section],
    queryFn: () => listMediaItems(section),
  })

  const items = data?.items ?? []

  const addMutation = useMutation({
    mutationFn: (d: { type: "video" | "image"; url: string; title?: string }) =>
      createMediaItem({ section, ...d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", section] })
      toast.success("Добавлено")
    },
    onError: () => toast.error("Ошибка при добавлении"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMediaItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", section] })
      toast.success("Удалено")
    },
    onError: () => toast.error("Ошибка при удалении"),
  })

  const reorderMutation = useMutation({
    mutationFn: reorderMediaItems,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media", section] }),
    onError: () => toast.error("Ошибка при сохранении порядка"),
  })

  const handleMove = (index: number, direction: -1 | 1) => {
    const reordered = [...items]
    const swap = index + direction
    ;[reordered[index], reordered[swap]] = [reordered[swap], reordered[index]]
    const updates = reordered.map((item, i) => ({ id: item.id, position: i }))
    // Optimistic update via cache
    qc.setQueryData(["media", section], {
      items: reordered.map((item, i) => ({ ...item, position: i })),
    })
    reorderMutation.mutate(updates)
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="ml-auto text-xs text-muted-foreground">{items.length} шт.</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <MediaCard
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              onDelete={() => deleteMutation.mutate(item.id)}
              onMoveUp={() => handleMove(i, -1)}
              onMoveDown={() => handleMove(i, 1)}
            />
          ))}
          <AddItemForm section={section} onAdd={addMutation.mutateAsync} />
        </div>
      )}
    </section>
  )
}

export default function MediaPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Медиа витрины</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управление слайдами героя и видео в разделе «Смотрите нас». Порядок на сайте совпадает с порядком здесь.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <MediaSection
          section="hero"
          title="Героя (слайдер)"
          icon={Film}
          description="Видео и изображения чередуются в полноэкранном слайдере на главной. Рекомендуемое соотношение сторон: 16:9."
        />
        <div className="border-t" />
        <MediaSection
          section="reels"
          title="Смотрите нас (рилсы)"
          icon={Video}
          description="Вертикальные видео (9:16) в разделе под каталогом. Добавьте ссылки на R2 или CDN."
        />
      </div>
    </div>
  )
}
