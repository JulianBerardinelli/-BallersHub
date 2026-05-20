"use client";

// TipTap rich-text editor wrapper for the blog write flow.
//
// Used in /blog/write (new) and /blog/write/[id] (edit). Outputs
// sanitized HTML via editor.getHTML() — we trust TipTap's output for
// MVP-1 (no inline scripts, well-formed HTML). MVP-2 might add a
// server-side sanitizer pass if we let untrusted images / iframes in.

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";

type Props = {
  initialContent?: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ initialContent, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      ImageExt,
      Placeholder.configure({
        placeholder: placeholder ?? "Empezá a escribir tu artículo…",
      }),
    ],
    content: initialContent ?? "",
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
    immediatelyRender: false, // Next.js SSR compat
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-headings:font-bh-display prose-headings:uppercase prose-headings:tracking-tight max-w-none min-h-[480px] p-5 focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className="rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-5">
        <p className="text-sm text-bh-fg-3">Cargando editor…</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const promptForLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const promptForImage = () => {
    const url = window.prompt("URL de la imagen:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-bh-fg-4 bg-bh-surface-2 px-2 py-1.5">
      <ToolbarButton
        label="Negrita (⌘B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Itálica (⌘I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" aria-hidden />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" aria-hidden />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Lista bullet"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Cita"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" aria-hidden />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Link (⌘K)"
        active={editor.isActive("link")}
        onClick={promptForLink}
      >
        <LinkIcon className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Insertar imagen" onClick={promptForImage}>
        <ImageIcon className="size-4" aria-hidden />
      </ToolbarButton>
      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton
          label="Deshacer (⌘Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Rehacer (⌘⇧Z)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="size-4" aria-hidden />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-bh-sm px-2 py-1.5 transition-colors " +
        (active
          ? "bg-bh-lime/15 text-bh-lime"
          : "text-bh-fg-2 hover:bg-bh-fg-4/50 hover:text-bh-fg-1") +
        " disabled:cursor-not-allowed disabled:opacity-30"
      }
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-bh-fg-4" aria-hidden />;
}
