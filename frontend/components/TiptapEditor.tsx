"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from 'tiptap-extension-resize-image';
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {Plus,Link as LinkIcon,Image as ImageIcon,Quote,MessageCircle,X} from "lucide-react";
import { common, createLowlight } from "lowlight";

interface Props {
  content?: string;
  onChange?: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

const UnsplashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" >
    <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z"/>

  </svg>
);

interface UnsplashPhoto {
  id: string;
  description?: string;
  alt_description?: string;
  width: number;
  height: number;
  color?: string;
  urls: {
    thumb: string;
    small: string;
    regular: string;
    full: string;
  };
  user?: {
    name?: string;
    username?: string;
    profile_image?: string;
    links?: string;
  };
  links?: {
    html?: string;
  };
}

const lowlight = createLowlight(common);

const CustomImage = ImageResize.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: "inline", 
        parseHTML: (element) => element.getAttribute("data-layout") || "inline",
        renderHTML: (attributes) => {
          return {
            "data-layout": attributes.layout,
            class: `image-${attributes.layout}`,
          };
        },
      },
    };
  },
});

export default function MediumTiptapEditor({
  content = "",
  onChange,
  onImageUpload,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [plusMenuPos, setPlusMenuPos] = useState({ top: 0, left: 0 });
  const [plusBtnPos, setPlusBtnPos] = useState({ top: 0, left: -56 });
  const [showPlusBtn, setShowPlusBtn] = useState(false);
  const [showUnsplashModal, setShowUnsplashModal] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);
  const [unsplashTotalPages, setUnsplashTotalPages] = useState(1);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      CustomImage.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: ({ node, editor }) => {
          if (
            editor.state.doc.content.size === 2 &&
            node.type.name === "paragraph"
          ) {
            return "Title";
          }
          if (
            node.type.name === "paragraph" &&
            node.textContent.length === 0
          ) {
            return "Tell your story...";
          }
          return "";
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  const handleImagePick = useCallback(
    async (file?: File) => {
      if (!editor) return;
      if (!file) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (!f) return;
          await handleImagePick(f);
        };
        input.click();
        return;
      }

      if (onImageUpload) {
        try {
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
        } catch (err) {
          console.error("image upload failed", err);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    },
    [editor, onImageUpload]
  );

  const insertImageByUrl = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url }).run();
    },
    [editor]
  );

  const searchUnsplash = useCallback(
    async (page = 1) => {
      if (!unsplashQuery.trim()) return;
      setUnsplashLoading(true);
      setUnsplashError(null);
      try {
        const params = new URLSearchParams({
          query: unsplashQuery.trim(),
          page: page.toString(),
          per_page: "12",
        });
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/unsplash/search?${params}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Search failed");
        }
        const data = await res.json();
        setUnsplashResults(data.results || []);
        setUnsplashTotalPages(Math.max(data.total_pages || 1, 1));
        setUnsplashPage(page);
      } catch (err: unknown) {
        console.error("Unsplash search failed", err);
        setUnsplashError((err as Error)?.message || "Search failed");
      } finally {
        setUnsplashLoading(false);
      }
    },
    [unsplashQuery]
  );

  const updatePlus = useCallback(() => {
    if (!editor || !wrapperRef.current || !editor.view) return;

    if (showPlusMenu){
      setShowPlusBtn(false);
    }

    const { from } = editor.state.selection;

    let dom;
    try {
      dom = editor.view.domAtPos(from);
      if (!dom.node) {
        dom = editor.view.domAtPos(Math.max(from - 1, 0));
      }
    } catch {
      setShowPlusBtn(false);
      setShowPlusMenu(false);
      return;
    }

    let el = dom.node as HTMLElement | null;
    if (el && el.nodeType === Node.TEXT_NODE) el = el.parentElement;
    const block = el?.closest?.("p, h1, h2, blockquote, li");
    if (!block) {
      setShowPlusBtn(false);
      setShowPlusMenu(false);
      return;
    }

    const container = wrapperRef.current.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();

    const firstChild = editor.view.dom.querySelector(
      ".ProseMirror > *:first-child"
    );
    const isTitle =
      firstChild === block || (firstChild && firstChild.contains(block));
    if (isTitle) {
      setShowPlusBtn(false);
      setShowPlusMenu(false);
      return;
    }

    if (block.textContent && block.textContent.trim().length > 0) {
      setShowPlusBtn(false);
      setShowPlusMenu(false);
      return;
    }

    if (showPlusMenu) {
      setShowPlusBtn(false);
      return;
    }

    const paddingTop = parseFloat(
      window.getComputedStyle(wrapperRef.current).paddingTop || "0"
    );

    setPlusBtnPos({
      top:
        blockRect.top -
        container.top -
        paddingTop +
        blockRect.height / 2 -
        16,
      left: -56,
    });
    // We don't setPlusMenuPos here anymore because it's set on click.
    // And updating it with global coordinates was causing issues.
    
    setShowPlusBtn(true);
    setShowPlusMenu(false);
  }, [editor, showPlusMenu]);

  useEffect(() => {
    if (!editor) return;

    updatePlus();

    editor.on("selectionUpdate", updatePlus);
    editor.on("transaction", updatePlus);
    editor.on("focus", updatePlus);
    editor.on("blur", () => setShowPlusBtn(false));

    return () => {
      editor.off("selectionUpdate", updatePlus);
      editor.off("transaction", updatePlus);
      editor.off("focus", updatePlus);
      editor.off("blur", () => setShowPlusBtn(false));
    };
  }, [editor, updatePlus]);

  const toggleBold = useCallback(
    () => editor?.chain().focus().toggleBold().run(),
    [editor]
  );
  const toggleItalic = useCallback(
    () => editor?.chain().focus().toggleItalic().run(),
    [editor]
  );
  const toggleHeading = useCallback(
    (level: number) =>
      editor?.chain().focus().toggleHeading({ level: level as 1 | 2 }).run(),
    [editor]
  );
  const toggleBlockquote = useCallback(
    () => editor?.chain().focus().toggleBlockquote().run(),
    [editor]
  );

  // CURRENT IMPLEMENTATION
  const openLinkPrompt = useCallback(() => {
    if (!editor) return;

    const prev = editor.getAttributes("link").href || "";
    const input = window.prompt("Enter URL", prev);
    if (input === null) return;

    const raw = input.trim();

    // remove link if the selection is empty
    if (raw === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // prepend https:// if the URL is not absolute
    const hasProtocol = /^https?:\/\//i.test(raw);
    const href = hasProtocol ? raw : `https://${raw}`;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  }, [editor]);
  // END CURRENT IMPLEMENTATION

  if (!editor) return null;

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-[800px] mx-auto py-8 relative"
      style={{ paddingTop: 32 }}
    >
      {/* TEXT Bubble Menu */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor, state }) => {
          const { from, to, empty } = state.selection;

          // Do not show if the selection is empty
          if (empty) return false;

          // Does the selection contain an image?
          let hasImage = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "image") {
              hasImage = true;
            }
          });

          // Hide the text menu if an image is selected
          if (hasImage) return false;

          // Only show when text/paragraph/heading is selected
          return (
            editor.isActive("paragraph") ||
            editor.isActive("heading") ||
            editor.isActive("blockquote")
          );
        }}
        className="bg-[#242424] text-white rounded-md shadow-2xl border border-gray-700 flex items-center gap-1 px-2 py-2"
      >
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleBold}
          className={`px-3 py-2 rounded ${
            editor.isActive("bold") ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleItalic}
          className={`px-3 py-2 rounded ${
            editor.isActive("italic") ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
          title="Italic"
        >
          <i>i</i>
        </button>
        <div className="w-px h-6 bg-gray-600 mx-1" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={openLinkPrompt}
          className={`p-2 rounded ${
            editor.isActive("link") ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
          title="Link"
        >
          <LinkIcon size={18} />
        </button>
        <div className="w-px h-6 bg-gray-600 mx-1" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleHeading(1)}
          className={`px-3 py-2 rounded text-2xl font-bold ${
            editor.isActive("heading", { level: 1 })
              ? "bg-gray-700"
              : "hover:bg-gray-700"
          }`}
          title="H1"
        >
          T
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleHeading(2)}
          className={`px-3 py-2 rounded text-base font-semibold ${
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-700"
              : "hover:bg-gray-700"
          }`}
          title="H2"
        >
          T
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleBlockquote}
          className={`p-2 rounded ${
            editor.isActive("blockquote")
              ? "bg-gray-700"
              : "hover:bg-gray-700"
          }`}
          title="Quote"
        >
          <Quote size={18} />
        </button>
        <div className="w-px h-6 bg-gray-600 mx-1" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {}}
          className="p-2 rounded hover:bg-gray-700"
          title="Comment"
        >
          <MessageCircle size={18} />
        </button>
      </BubbleMenu>

      {/* IMAGE Bubble Menu */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ state }) => {
          const { from, to } = state.selection;

          // Show only when the selection covers a single image node
          let imageCount = 0;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === "image") {
              imageCount += 1;
            }
          });

          return imageCount === 1;
        }}
        className="bg-[#242424] text-white rounded-md shadow-2xl border border-gray-700 flex items-center gap-1 px-2 py-2"
      >
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor
              .chain()
              .focus()
              .updateAttributes("image", { layout: "inline" })
              .run();
          }}
          className={`
            px-3 py-1 rounded text-sm
            ${editor.isActive("image", { layout: "inline" })
              ? "bg-gray-700"
              : "hover:bg-gray-700"}
          `}
        >
          Inline
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor
              .chain()
              .focus()
              .updateAttributes("image", { layout: "wide" })
              .run();
          }}
          className={`
            px-3 py-1 rounded text-sm
            ${editor.isActive("image", { layout: "wide" })
              ? "bg-gray-700"
              : "hover:bg-gray-700"}
          `}
        >
          Wide
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor
              .chain()
              .focus()
              .updateAttributes("image", { layout: "full" })
              .run();
          }}
          className={`
            px-3 py-1 rounded text-sm
            ${editor.isActive("image", { layout: "full" })
              ? "bg-gray-700"
              : "hover:bg-gray-700"}
          `}
        >
          Full
        </button>
      </BubbleMenu>

      {/* Plus floating menu */}
      {showPlusMenu && (
        <div
          style={{
            position: "absolute",
            top: plusMenuPos.top+18,
            left: plusMenuPos.left+40,
            zIndex: 60,
          }}
          className="bg-white text-gray-900 dark:bg-neutral-900 dark:text-neutral-50 border rounded-lg shadow p-2 flex gap-2 "
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={async () => {
              await handleImagePick();
              setShowPlusMenu(false);
            }}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
            title="Image"
          >
            <ImageIcon size={18} />
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowPlusMenu(false);
              setShowUnsplashModal(true);
            }}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
            title="Unsplash image"
          >
            <UnsplashIcon />
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor
                ?.chain()
                .focus()
                .setCodeBlock({ language: "python" })
                .run();
              setShowPlusMenu(false);
            }}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
            title="Code block"
          >
            {"</>"}
          </button>
        </div>
      )}

      <div className="relative">
      {showPlusBtn && (
  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!showPlusMenu) {
        setPlusMenuPos({
          top: plusBtnPos.top,
          left: plusBtnPos.left,
        });
        setShowPlusMenu(true);
      } else {
        setShowPlusMenu(false);
      }
    }}
    style={{
      position: "absolute",
      top: plusBtnPos.top,
      left: plusBtnPos.left,
    }}
    className="
         w-8 h-8 rounded-full border
      bg-white text-gray-900
      dark:bg-neutral-900 dark:text-neutral-50
        flex items-center justify-center shadow
      hover:bg-gray-50 dark:hover:bg-neutral-800
        active:scale-95
        transition-transform transition-colors duration-150
    "
    title="Add image or code block"
  >
    <div
      className={`
        relative flex items-center justify-center
        transition-transform duration-150
        ${showPlusMenu ? "rotate-90" : "rotate-0"}
      `}
    >
      {/* + ikonu */}
      <span
        className={`
          absolute
          transition-opacity duration-150
          ${showPlusMenu ? "opacity-0" : "opacity-100"}
        `}
      >
        <Plus size={18} />
      </span>

      {/* X ikonu */}
      <span
        className={`
          absolute
          transition-opacity duration-150
          ${showPlusMenu ? "opacity-100" : "opacity-0"}
        `}
      >
        <X size={18} />
      </span>
    </div>
  </button>
)}

        <EditorContent editor={editor} className="medium-editor" />
      </div>

      {/* Unsplash modal */}
      {showUnsplashModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Add an image from Unsplash</h2>
              <button
                className="p-1 rounded hover:bg-muted"
                onClick={() => {
                  setShowUnsplashModal(false);
                  setUnsplashResults([]);
                  setUnsplashQuery("");
                  setUnsplashPage(1);
                  setUnsplashError(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-border flex gap-2">
              <input
                type="text"
                value={unsplashQuery}
                onChange={(e) => setUnsplashQuery(e.target.value)}
                placeholder="type a keyword to search images"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchUnsplash(1);
                  }
                }}
              />
              <button
                className="btn-primary text-xs px-4 py-2"
                onClick={() => searchUnsplash(1)}
                disabled={unsplashLoading || !unsplashQuery.trim()}
              >
                Search
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {unsplashLoading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}

              {unsplashError && (
                <div className="text-sm text-red-500 mb-2">{unsplashError}</div>
              )}

              {unsplashResults.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {unsplashResults.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="group relative rounded-lg overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => {
                        const url = photo.urls.regular || photo.urls.small;
                        insertImageByUrl(url);
                        setShowUnsplashModal(false);
                      }}
                    >
                      <img
                        src={photo.urls.small}
                        alt={photo.alt_description || photo.description || ""}
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-150"
                      />
                      {photo.user?.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-2 py-1 truncate">
                          {photo.user.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {unsplashResults.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
                <button
                  className="px-3 py-1 rounded border border-border disabled:opacity-50"
                  onClick={() => searchUnsplash(unsplashPage - 1)}
                  disabled={unsplashPage <= 1 || unsplashLoading}
                >
                  Previous
                </button>
                <span className="text-muted-foreground">
                  Page {unsplashPage} / {unsplashTotalPages}
                </span>
                <button
                  className="px-3 py-1 rounded border border-border disabled:opacity-50"
                  onClick={() => searchUnsplash(unsplashPage + 1)}
                  disabled={unsplashPage >= unsplashTotalPages || unsplashLoading}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}