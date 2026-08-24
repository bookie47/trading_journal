'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Database,
  ArrowRight,
  Flame,
  Cloud,
  Check,
  RotateCcw,
  KeyRound,
  FileCode2,
  ExternalLink
} from 'lucide-react';
import { 
  isFirebaseConfigured, 
  getFirebaseConfig, 
  saveFirebaseCustomConfig, 
  clearFirebaseCustomConfig,
  FirebaseClientConfig 
} from '@/lib/firebase/config';
import { FirestoreService } from '@/lib/firebase/firestore-service';
import { TradingRepository } from '@/lib/storage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function CloudSyncPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'firebase' | 'demo'>('firebase');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for in-app configuration
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  useEffect(() => {
    const configured = isFirebaseConfigured();
    setIsConfigured(configured);
    const cfg = getFirebaseConfig();
    if (cfg) {
      setApiKey(cfg.apiKey || '');
      setProjectId(cfg.projectId || '');
      setStorageBucket(cfg.storageBucket || '');
      setMessagingSenderId(cfg.messagingSenderId || '');
      setAppId(cfg.appId || '');
    }
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      setTestResult({ success: false, message: 'กรุณากรอก API Key และ Project ID ให้ครบถ้วน' });
      return;
    }

    const config: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveFirebaseCustomConfig(config);
    setIsConfigured(true);
    setTestResult({ success: true, message: 'บันทึกการตั้งค่า Firebase สำเร็จ! กำลังรีเฟรช...' });
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const trades = await FirestoreService.getTrades();
      setTestResult({
        success: true,
        message: `เชื่อมต่อ Firestore สำเร็จ! (พบประวัติ ${trades.length} รายการใน Cloud)`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${err.message || 'กรุณาตรวจสอบ Security Rules หรือ API Key'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearConfig = () => {
    if (confirm('คุณต้องการยกเลิกการเชื่อมต่อ Firebase และกลับไปใช้ Local Database ใช่หรือไม่?')) {
      clearFirebaseCustomConfig();
      setIsConfigured(false);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Header Card */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-500/20">
          <Flame className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Cloud Database (Google Firebase Firestore)
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          เชื่อมต่อฐานข้อมูลบนคลาวด์ เพื่อให้ข้อมูลการเทรดซิงค์สดข้ามอุปกรณ์ (มือถือ, แท็บเล็ต, PC) แบบ Real-time
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center">
        {isConfigured ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <CheckCircle2 className="w-4 h-4" />
            <span>เชื่อมต่อกับ Firebase Firestore Cloud เรียบร้อย</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium">
            <Database className="w-4 h-4" />
            <span>โหมด Offline / LocalStorage (พร้อมเชื่อมต่อ Cloud)</span>
          </div>
        )}
      </div>

      {/* Main Settings Card */}
      <Card className="p-6 sm:p-8 bg-slate-900/90 border-slate-800 space-y-6">
        {isConfigured && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2 justify-center sm:justify-start">
                <Cloud className="w-4 h-4" />
                <span>สถานะ Cloud Active</span>
              </h4>
              <p className="text-xs text-slate-300">
                Project ID: <span className="font-mono text-emerald-400">{projectId || 'Environment Variable'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleClearConfig}
                className="text-xs"
              >
                ตัดการเชื่อมต่อ
              </Button>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>ใส่ค่า Firebase Web App Configuration</span>
            </h3>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>Firebase Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Firebase API Key (apiKey) *"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Project ID (projectId) *"
                placeholder="my-trading-journal-app"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
              <Input
                label="Storage Bucket (storageBucket)"
                placeholder="my-trading-journal-app.appspot.com"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Messaging Sender ID"
                placeholder="1234567890"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
              />
              <Input
                label="App ID (appId)"
                placeholder="1:1234567890:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium ${
              testResult.success 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-orange-500/25">
              <Check className="w-4 h-4 mr-2" />
              บันทึกและเชื่อมต่อ Firebase
            </Button>
          </div>
        </form>

        {/* Quick Guide */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs text-slate-400">
          <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
            <FileCode2 className="w-4 h-4 text-brand-400" />
            <span>วิธีเปิดใช้งาน Firebase ฟรีใน 3 ขั้นตอน:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
            <li>เข้าไปที่ <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-brand-400 underline">console.firebase.google.com</a> แล้วกด <strong>Create a project</strong></li>
            <li>กดเปิด <strong>Firestore Database</strong> ในโหมด <em>Test mode</em> (หรือตั้ง Rules ให้อ่าน/เขียนได้)</li>
            <li>ไปที่ <strong>Project Settings</strong> &rarr; เลื่อนลงมากดเพิ่ม <strong>Web App (&lt;/&gt;)</strong> แล้วคัดลอกค่า `apiKey` และ `projectId` มาวางในช่องด้านบนได้เลย!</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
