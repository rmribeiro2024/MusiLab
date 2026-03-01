import React, { useState, useEffect, useRef } from 'react'
import { sanitizar } from '../lib/utils'

export default function RichTextEditor({ value, onChange, placeholder, rows = 3, className = '' }) {
    const editorRef = useRef(null);
    // Guarda quais botões estão ativos — estado LOCAL, não dispara re-render do pai
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [underline, setUnderline] = useState(false);

    // Inicializa HTML apenas UMA vez na montagem — sanitizado contra XSS
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = sanitizar(value || '');
        }
    }, []); // eslint-disable-line

    const updateButtons = () => {
        setBold(document.queryCommandState('bold'));
        setItalic(document.queryCommandState('italic'));
        setUnderline(document.queryCommandState('underline'));
    };

    // Propaga para o pai apenas no blur (quando o usuário sai do campo)
    // Isso evita re-renders a cada tecla
    const handleBlur = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const execCmd = (cmd) => {
        editorRef.current.focus();
        document.execCommand(cmd, false, null);
        updateButtons();
        // Propaga imediatamente ao usar toolbar (não é digitação)
        onChange(editorRef.current.innerHTML);
    };

    const minH = `${rows * 1.8}rem`;
    const btn = (active) =>
        `px-2.5 py-1 rounded text-sm border select-none cursor-pointer transition-colors ${
            active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
        }`;

    return (
        <div className={`border-2 border-gray-200 rounded-xl overflow-hidden ${className}`}
             style={{ outline: 'none' }}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('bold');}}
                    className={btn(bold) + ' font-bold'} title="Negrito">B</button>
                <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('italic');}}
                    className={btn(italic) + ' italic'} title="Itálico">I</button>
                <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('underline');}}
                    className={btn(underline) + ' underline'} title="Sublinhado">U</button>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('insertUnorderedList');}}
                    className={btn(false)} title="Lista com marcadores">≡ •</button>
                <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('insertOrderedList');}}
                    className={btn(false)} title="Lista numerada">1. 2.</button>
            </div>
            {/* Área editável — sem onInput, sem onChange a cada tecla */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleBlur}
                onKeyUp={updateButtons}
                onMouseUp={updateButtons}
                data-placeholder={placeholder}
                className="px-4 py-3 outline-none text-gray-800 text-sm leading-relaxed rich-editor-area"
                style={{ minHeight: minH }}
            />
        </div>
    );
}
