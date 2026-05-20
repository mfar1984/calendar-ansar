"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useRef } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const EMOJI_LIST = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
  "😋","😎","😍","🥰","😘","😗","😙","😚","🙂","🤗",
  "🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮",
  "🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝",
  "🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁",
  "😖","😞","😟","😤","😢","😭","😦","😧","😨","😩",
  "🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴",
  "😠","😡","🤬","😷","🤒","🤕","🤢","🤮","🤧","🥳",
  "🎉","🎊","🎈","🎁","🎂","🎀","🏆","🥇","⭐","✨",
  "💡","📅","📆","🗓️","⏰","🔔","📌","📎","✅","❌",
  "👍","👎","👏","🙌","🤝","💪","✌️","👋","🫶","❤️",
  "🔥","💯","⚡","🌟","💫","🎯","🚀","💼","📧","📞",
];

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors flex-shrink-0 ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ value, onChange, placeholder }: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Add a description..." }),
    ],
    immediatelyRender: false,
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "focus:outline-none px-4 py-3 text-gray-900 text-sm min-h-full",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  function openEmoji() {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      // Position above the button (toolbar is at bottom)
      setEmojiPos({ top: rect.top - 290, left: rect.left });
    }
    setShowEmoji(!showEmoji);
  }

  function insertEmoji(emoji: string) {
    editor?.commands.insertContent(emoji);
    setShowEmoji(false);
    editor?.commands.focus();
  }

  const sep = <div className="w-px h-4 bg-gray-200 mx-0.5 flex-shrink-0" />;

  return (
    <div className="bg-white flex flex-col h-full overflow-hidden">

      {/* Editor area — fills all space */}
      <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Toolbar — pinned to bottom */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex-wrap">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <strong className="text-xs">B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <em className="text-xs">I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <span className="underline text-xs">U</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <span className="line-through text-xs">S</span>
        </ToolbarBtn>

        {sep}

        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()} active={editor.isActive("highlight")} title="Highlight">
          <span className="text-xs font-bold" style={{ background: "#FEF08A", padding: "0 2px" }}>A</span>
        </ToolbarBtn>

        {sep}

        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" /></svg>
        </ToolbarBtn>

        {sep}

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </ToolbarBtn>

        {sep}

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Insert link"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </ToolbarBtn>

        {sep}

        {/* Emoji */}
        <button
          ref={emojiButtonRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); openEmoji(); }}
          title="Insert emoji"
          className={`w-7 h-7 flex items-center justify-center rounded text-base transition-colors flex-shrink-0 ${showEmoji ? "bg-blue-100" : "hover:bg-gray-100"}`}
        >
          😊
        </button>

        <div className="flex-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </ToolbarBtn>
      </div>

      {/* Emoji picker — fixed, opens upward */}
      {showEmoji && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowEmoji(false)} />
          <div
            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3"
            style={{ top: emojiPos.top, left: emojiPos.left, width: 280 }}
          >
            <p className="text-xs font-semibold text-gray-500 mb-2 px-1">Emoji</p>
            <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
              {EMOJI_LIST.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji); }}
                  className="text-lg hover:bg-gray-100 rounded p-0.5 leading-none flex items-center justify-center h-7"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
