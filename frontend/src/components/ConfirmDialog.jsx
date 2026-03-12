
import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) {
    const dialogRef = useRef(null);

    
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            <AlertCircle size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition">
                        <X size={20} />
                    </button>
                </div>

                {}
                <div className="p-6">
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {}
                <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition transform active:scale-95 ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
