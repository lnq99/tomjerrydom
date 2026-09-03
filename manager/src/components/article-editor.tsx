"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Undo, Redo, Minus,
} from "lucide-react"

interface ArticleEditorProps {
  content: string
  onChange: (html: string) => void
  disabled?: boolean
}

export function ArticleEditor({ content, onChange, disabled = false }: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Nhập nội dung bài viết..." }),
    ],
    content,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  )

  return (
    <div className={`border rounded-lg overflow-hidden ${disabled ? "opacity-50" : ""}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", <Bold className="h-3.5 w-3.5" />)}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", <Italic className="h-3.5 w-3.5" />)}
        <div className="w-px h-4 bg-border mx-0.5" />
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", <Heading2 className="h-3.5 w-3.5" />)}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", <Heading3 className="h-3.5 w-3.5" />)}
        <div className="w-px h-4 bg-border mx-0.5" />
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list", <List className="h-3.5 w-3.5" />)}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list", <ListOrdered className="h-3.5 w-3.5" />)}
        <div className="w-px h-4 bg-border mx-0.5" />
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), "Divider", <Minus className="h-3.5 w-3.5" />)}
        <div className="flex-1" />
        {btn(!editor.can().undo(), () => editor.chain().focus().undo().run(), "Undo", <Undo className="h-3.5 w-3.5" />)}
        {btn(!editor.can().redo(), () => editor.chain().focus().redo().run(), "Redo", <Redo className="h-3.5 w-3.5" />)}
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  )
}
