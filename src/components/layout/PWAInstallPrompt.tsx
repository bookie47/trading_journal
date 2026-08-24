'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, PlusSquare, Share } from 'lucide-react';
import { Button } from '../ui/Button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle Service Worker
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration skipped or failed:', err);
        });
      } else {
        // In development, unregister any active service worker to avoid dev chunk conflicts
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!showPrompt && !showIOSGuide) return null;

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-40 bg-slate-900/95 border border-brand-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-brand-500/10 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ติดตั้งแอปลงมือถือ (PWA)</h4>
              <p className="text-[11px] text-slate-400">ใช้งานได้เร็วและสะดวกเหมือนแอปจริง</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleInstallClick} className="text-xs py-1.5 px-3">
              <Download className="w-3.5 h-3.5 mr-1" />
              ติดตั้ง
            </Button>
            <button
              onClick={() => setShowPrompt(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 text-brand-400 mx-auto flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">วิธีติดตั้งบน iPhone / iPad</h3>
            <div className="text-xs text-slate-300 space-y-2 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-brand-400 text-center font-bold">1</span>
                <span>แตะที่ปุ่ม <Share className="w-3.5 h-3.5 inline text-sky-400" /> (Share) ใน Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-brand-400 text-center font-bold">2</span>
                <span>เลื่อนลงมาเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-300" />)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-brand-400 text-center font-bold">3</span>
                <span>กด <b>"เพิ่ม"</b> (Add) ที่มุมขวาบน</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setShowIOSGuide(false)}>
              เข้าใจแล้ว
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
