import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link,
  Paperclip,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Palette,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface GmailStylingToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onAttachFileClick: () => void;
  onAttachImageClick: () => void;
  onInsertTag: (tag: string) => void;
}

export const GmailStylingToolbar: React.FC<GmailStylingToolbarProps> = ({
  onExecCommand,
  onAttachFileClick,
  onAttachImageClick,
  onInsertTag,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Sans Serif');
  const [selectedSize, setSelectedSize] = useState('Normal');

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setShowFontMenu(false);
      }
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(event.target as Node)) {
        setShowSizeMenu(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
        setShowTagMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fonts = [
    { label: 'Sans Serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Fixed Width', value: 'monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
  ];

  const sizes = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' },
  ];

  const textColors = [
    '#000000',
    '#434343',
    '#666666',
    '#999999',
    '#b7b7b7',
    '#cccccc',
    '#d9d9d9',
    '#ffffff',
    '#980000',
    '#ff0000',
    '#ff9900',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#4a86e8',
    '#0000ff',
    '#9900ff',
    '#ff00ff',
  ];

  const handleLinkPrompt = () => {
    const url = prompt('Enter the link destination URL (https://...):', 'https://');
    if (url && url !== 'https://') {
      onExecCommand('createLink', url);
    }
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex flex-wrap items-center gap-1 text-slate-700 select-none">
      {/* Undo / Redo */}
      <button
        type="button"
        onClick={() => onExecCommand('undo')}
        title="Undo (Ctrl+Z)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onExecCommand('redo')}
        title="Redo (Ctrl+Y)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Font Family Dropdown */}
      <div className="relative" ref={fontMenuRef}>
        <button
          type="button"
          onClick={() => setShowFontMenu(!showFontMenu)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-200/70 transition-colors text-slate-800"
        >
          <span>{selectedFont}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showFontMenu && (
          <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
            {fonts.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setSelectedFont(f.label);
                  onExecCommand('fontName', f.value);
                  setShowFontMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size Dropdown */}
      <div className="relative" ref={sizeMenuRef}>
        <button
          type="button"
          onClick={() => setShowSizeMenu(!showSizeMenu)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-200/70 transition-colors text-slate-800"
        >
          <span>{selectedSize}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showSizeMenu && (
          <div className="absolute left-0 top-full mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
            {sizes.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setSelectedSize(s.label);
                  onExecCommand('fontSize', s.value);
                  setShowSizeMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Text Styles: B, I, U, S */}
      <button
        type="button"
        onClick={() => onExecCommand('bold')}
        title="Bold (Ctrl+B)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors font-bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onExecCommand('italic')}
        title="Italic (Ctrl+I)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onExecCommand('underline')}
        title="Underline (Ctrl+U)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onExecCommand('strikeThrough')}
        title="Strikethrough"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      {/* Color Picker Popover */}
      <div className="relative" ref={colorPickerRef}>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
          className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors flex items-center gap-0.5"
        >
          <Palette className="w-3.5 h-3.5 text-blue-600" />
        </button>

        {showColorPicker && (
          <div className="absolute left-0 top-full mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-44">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Text Color
            </p>
            <div className="grid grid-cols-6 gap-1">
              {textColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onExecCommand('foreColor', color);
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-md border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Alignment */}
      <button
        type="button"
        onClick={() => onExecCommand('justifyLeft')}
        title="Align Left"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onExecCommand('justifyCenter')}
        title="Align Center"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onExecCommand('justifyRight')}
        title="Align Right"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>

      {/* Lists */}
      <button
        type="button"
        onClick={() => onExecCommand('insertUnorderedList')}
        title="Bulleted List"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onExecCommand('insertOrderedList')}
        title="Numbered List"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onExecCommand('formatBlock', 'blockquote')}
        title="Quote block"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Link */}
      <button
        type="button"
        onClick={handleLinkPrompt}
        title="Insert Link (Ctrl+K)"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <Link className="w-3.5 h-3.5" />
      </button>

      {/* Attach File (Any file / PDF) */}
      <button
        type="button"
        onClick={onAttachFileClick}
        title="Attach files (PDF, CSV, docx, etc.)"
        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold text-xs"
      >
        <Paperclip className="w-3.5 h-3.5" />
      </button>

      {/* Insert Image */}
      <button
        type="button"
        onClick={onAttachImageClick}
        title="Insert Image (PNG, JPG, SVG, GIF)"
        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" />
      </button>

      {/* Clear Formatting */}
      <button
        type="button"
        onClick={() => onExecCommand('removeFormat')}
        title="Clear Formatting"
        className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
      >
        <RemoveFormatting className="w-3.5 h-3.5" />
      </button>

      {/* Personalization Tags Dropdown */}
      <div className="relative ml-auto" ref={tagMenuRef}>
        <button
          type="button"
          onClick={() => setShowTagMenu(!showTagMenu)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-bold transition-colors"
        >
          <Sparkles className="w-3 h-3 text-blue-600" />
          <span>Insert Variable</span>
          <ChevronDown className="w-3 h-3 text-blue-500" />
        </button>

        {showTagMenu && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Lead Variables
            </div>
            {[
              { label: 'First Name', tag: '{{firstName}}' },
              { label: 'Last Name', tag: '{{lastName}}' },
              { label: 'Company Name', tag: '{{company}}' },
              { label: 'Job Title', tag: '{{jobTitle}}' },
              { label: 'Custom Icebreaker', tag: '{{icebreaker}}' },
            ].map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => {
                  onInsertTag(v.tag);
                  setShowTagMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
              >
                <span>{v.label}</span>
                <span className="font-mono text-[10px] text-slate-400">{v.tag}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
