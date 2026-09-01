"use client"

import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Film, ImageIcon, Plus, Trash2, ChevronUp, ChevronDown, Video, Upload, Link as LinkIcon, X } from "lucide-react"
import { toast } from "sonner"
import {
  listMediaItems,
  createMediaItem,
  deleteMediaItem,
  reorderMediaItems,
  uploadFile,
  type MediaItem,
} from "@/lib/api"

const VIDEO_EXTS = ["mp4", "mov", "webm", "mkv", "avi"]
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"]

function guessType(filename: string): "video" | "image" | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (VIDEO_EXTS.includes(ext)) return "video"
  if (IMAGE_EXTS.includes(ext)) return "image"
  return null
}

function acceptAttr(section: "hero" | "reels") {
  if (section === "reels") return "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
  return "video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp,.mp4,.mov,.webm,.jpg,.jpeg,.png,.webp"
}

type AddMode = "upload" | "url"

function AddItemForm({
  section,
  onAdd,
}: {
  section: "hero" | "reels"
  onAdd: (data: { type: "video" | "image"; url: string; title?: string; medusa_file_id?: string }) => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AddMode>("upload")

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileId: string; type: "video" | "image"; name: string } | null>(null)
  const [title, setTitle] = useState("")

  // URL state
  const [urlValue, setUrlValue] = useState("")
  const [urlType, setUrlType] = useState<"video" | "image">("video")
  const [urlLoading, setUrlLoading] = useState(false)

  const reset = () => {
    setOpen(false)
    setUploading(false)
    setUploadProgress(null)
    setUploadedFile(null)
    setTitle("")
    setUrlValue("")
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const detectedType = guessType(file.name)
    if (!detectedType) {
      toast.error("Định dạng tệp không được hỗ trợ")
      return
    }

    setUploading(true)
    setUploadProgress(`Đang tải ${file.name}…`)

    try {
      const { url, fileId } = await uploadFile(file)
      setUploadedFile({ url, fileId, type: detectedType, name: file.name })
      setUploadProgress(null)
    } catch {
      toast.error("Lỗi khi tải tệp")
      setUploadProgress(null)
    } finally {
      setUploading(false)
      // reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleConfirmUpload = async () => {
    if (!uploadedFile) return
    setUploading(true)
    try {
      await onAdd({ type: uploadedFile.type, url: uploadedFile.url, title: title.trim() || undefined, medusa_file_id: uploadedFile.fileId })
      reset()
    } finally {
      setUploading(false)
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlValue.trim()) return
    setUrlLoading(true)
    try {
      await onAdd({ type: urlType, url: urlValue.trim(), title: title.trim() || undefined })
      reset()
    } finally {
      setUrlLoading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
    await handleFileChange(fakeEvent)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md border border-dashed hover:border-border w-full"
      >
        <Plus className="h-4 w-4" />
        Thêm {section === "hero" ? "slide" : "video"}
      </button>
    )
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-4 bg-muted/30">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-md bg-muted w-fit">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Upload className="h-3.5 w-3.5" /> Tải lên
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <LinkIcon className="h-3.5 w-3.5" /> Theo link
        </button>
      </div>

      {mode === "upload" ? (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr(section)}
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadedFile ? (
            /* Uploaded — confirm step */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-md border bg-background">
                <div className="w-10 h-10 rounded flex items-center justify-center bg-muted shrink-0">
                  {uploadedFile.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={uploadedFile.url} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <Film className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{uploadedFile.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="p-1 rounded hover:bg-muted shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Chú thích (tùy chọn)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                  className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? "Đang lưu…" : "Thêm"}
                </button>
                <button type="button" onClick={reset}
                  className="px-4 py-2 rounded-md border text-sm text-muted-foreground hover:bg-muted">
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            /* Drop zone */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer transition-colors"
            >
              {uploading ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Nhấn hoặc kéo thả tệp vào đây</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {section === "hero" ? "MP4, MOV, WEBM, JPG, PNG, WEBP" : "MP4, MOV, WEBM"}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {!uploadedFile && (
            <button type="button" onClick={reset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
              Hủy
            </button>
          )}
        </>
      ) : (
        /* URL mode */
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
          {section === "hero" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUrlType("video")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${urlType === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              >
                <Video className="h-3.5 w-3.5" /> Video
              </button>
              <button
                type="button"
                onClick={() => setUrlType("image")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${urlType === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              >
                <ImageIcon className="h-3.5 w-3.5" /> Hình ảnh
              </button>
            </div>
          )}
          <input
            type="url"
            placeholder="https://cdn.example.com/video.mp4"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            placeholder="Chú thích (tùy chọn)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={urlLoading || !urlValue.trim()}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {urlLoading ? "Đang thêm…" : "Thêm"}
            </button>
            <button type="button" onClick={reset}
              className="px-4 py-2 rounded-md border text-sm text-muted-foreground hover:bg-muted">
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
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
      <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.title ?? ""} className="w-full h-full object-cover" />
        ) : (
          <Film className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {item.type === "video" ? "Video" : "Ảnh"}
          </span>
          {item.title && <span className="text-sm font-medium truncate">{item.title}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.url}</p>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} disabled={isFirst}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Lên">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Xuống">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Xóa">
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
    mutationFn: (d: { type: "video" | "image"; url: string; title?: string; medusa_file_id?: string }) =>
      createMediaItem({ section, ...d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", section] })
      toast.success("Đã thêm")
    },
    onError: () => toast.error("Lỗi khi thêm"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMediaItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media", section] })
      toast.success("Đã xóa")
    },
    onError: () => toast.error("Lỗi khi xóa"),
  })

  const reorderMutation = useMutation({
    mutationFn: reorderMediaItems,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media", section] }),
    onError: () => toast.error("Lỗi khi lưu thứ tự"),
  })

  const handleMove = (index: number, direction: -1 | 1) => {
    const reordered = [...items]
    const swap = index + direction
    ;[reordered[index], reordered[swap]] = [reordered[swap], reordered[index]]
    const updates = reordered.map((item, i) => ({ id: item.id, position: i }))
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
          <span className="ml-auto text-xs text-muted-foreground">{items.length} cái</span>
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
          <AddItemForm section={section} onAdd={(data) => addMutation.mutateAsync(data).then(() => {})} />
        </div>
      )}
    </section>
  )
}

export default function MediaPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Truyền thông gian hàng</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý slide trang chủ và video mục "Xem chúng tôi". Thứ tự trên trang web trùng với thứ tự ở đây.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <MediaSection
          section="hero"
          title="Trang chủ (slider)"
          icon={Film}
          description="Video và hình ảnh xen kẽ trong slider toàn màn hình trang chủ. Tỉ lệ khuyến nghị 16:9."
        />
        <div className="border-t" />
        <MediaSection
          section="reels"
          title="Xem chúng tôi (reels)"
          icon={Video}
          description="Video dọc 9:16. Tệp được tải lên R2 tự động."
        />
      </div>
    </div>
  )
}
