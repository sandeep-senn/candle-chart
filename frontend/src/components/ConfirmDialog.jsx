import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) {
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={18} className={isDestructive ? "text-rose-500" : "text-zinc-400"} />
                        <h3 className="font-bold text-zinc-900 text-sm tracking-tight">{title}</h3>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-100">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={isDestructive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
