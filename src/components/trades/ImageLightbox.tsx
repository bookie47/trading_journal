'use client';

import React, { useEffect } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  caption?: string;
  onClose: () => void;
}

export function ImageLightbox({ isOpen, imageUrl, caption, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 transition"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-5xl max-h-[85vh] flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={caption || 'Chart screenshot'}
          className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl"
        />
        {caption && (
          <p className="mt-3 text-center text-sm font-medium text-slate-300 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
