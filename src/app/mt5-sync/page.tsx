'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Radio, 
  Play, 
  ShieldCheck, 
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function Mt5SyncPage() {
  const { portfolios, activePortfolio, refreshData } = useTrading();

  const [webhookUrl, setWebhookUrl] = useState('http://localhost:3000/api/mt5/sync');
  const [apiKey, setApiKey] = useState('tradejournal_mt5_secret_key_2026');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/mt5/sync`);
    }
    if (activePortfolio) {
      setSelectedPortfolioId(activePortfolio.id);
    }
  }, [activePortfolio]);

  const handleCopy = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSendTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const mockTicket = Math.floor(1000000 + Math.random() * 9000000);
      const res = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          event: 'deal_close',
          ticket: mockTicket,
          position_ticket: mockTicket,
          symbol: 'XAUUSD',
          order_type: 'BUY',
          lots: 1.0,
          open_price: 2650.00,
          close_price: 2668.50,
          sl: 2642.00,
          tp: 2675.00,
          profit: 185.00,
          commission: -4.00,
          swap: 0.00,
          open_time: new Date(Date.now() - 3600000).toISOString(),
          close_time: new Date().toISOString(),
          comment: 'EA Test Simulation Deal',
          portfolio_id: selectedPortfolioId || activePortfolio?.id,
          api_key: apiKey,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: `ทดสอบเชื่อมต่อสำเร็จ! สร้างไม้จำลอง XAUUSD Ticket #${mockTicket} เข้าพอร์ตเรียบร้อยแล้ว`,
        });
        await refreshData();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'การส่งทดสอบล้มเหลว',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Webhook',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-7 h-7 text-brand-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              เชื่อมต่อ MetaTrader 5 (MT5 EA Webhook)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ซิงค์ประวัติการเปิด-ปิดออเดอร์จาก MT5 เข้าสู่ Trading Journal อัตโนมัติแบบ Real-time
          </p>
        </div>

        <a href="/downloads/TradeJournalSync.mq5" download="TradeJournalSync.mq5">
          <Button className="shadow-brand-500/25 bg-emerald-600 hover:bg-emerald-500">
            <Download className="w-4 h-4 mr-2" />
            ดาวน์โหลดไฟล์ EA (.mq5)
          </Button>
        </a>
      </div>

      {/* Grid: Webhook Settings & Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Webhook Config (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              1. ค่าการเชื่อมต่อสำหรับกรอกใน EA
            </h3>

            {/* Webhook URL Input with Copy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Webhook URL (ปลายทางรับข้อมูล)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs bg-slate-950 text-brand-300"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(webhookUrl, 'url')}
                  className="shrink-0 px-3 py-2.5"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                *นำ URL นี้ไปใส่ในช่อง <b>InpWebhookURL</b> ของตัว EA และใส่ใน Allowed URLs ของ MT5
              </p>
            </div>

            {/* API Secret Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                API Secret Key
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={apiKey}
                  readOnly
                  className="font-mono text-xs bg-slate-950 text-slate-200"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(apiKey, 'key')}
                  className="shrink-0 px-3 py-2.5"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Target Portfolio Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                พอร์ตปลายทางที่จะรับข้อมูล (Target Portfolio ID)
              </label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 py-2.5 px-3.5"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Webhook Live Simulator */}
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950/40 border-indigo-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  ทดสอบส่ง Webhook จำลองจาก MT5
                </h3>
              </div>
              <Badge variant="brand" size="sm">SIMULATOR</Badge>
            </div>

            <p className="text-xs text-slate-300">
              กดปุ่มด้านล่างเพื่อทดสอบจำลองส่งคำสั่งปิดไม้กำไรทองคำ (XAUUSD +$185) เข้าสู่ระบบ Webhook ทันที
            </p>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium border ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleSendTestWebhook}
              isLoading={isTesting}
              className="w-full shadow-brand-500/20"
            >
              🚀 ยิงสัญญาณทดสอบ Webhook (Test Sync)
            </Button>
          </Card>
        </div>

        {/* Right Column: 3-Step Setup Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              วิธีติดตั้ง EA ใน MT5 (3 ขั้นตอน)
            </h3>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">คัดลอกไฟล์ EA ไปยังโฟลเดอร์ MT5</p>
                <p className="text-slate-400">
                  ดาวน์โหลดไฟล์ <code className="text-brand-300">TradeJournalSync.mq5</code> แล้วนำไปวางที่:
                </p>
                <code className="block bg-slate-900 p-1.5 rounded text-[11px] text-slate-300 font-mono break-all">
                  MT5 -&gt; File -&gt; Open Data Folder -&gt; MQL5 -&gt; Experts
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">อนุญาต WebRequest ใน MT5</p>
                <p className="text-slate-400">
                  ไปที่เมนู <code className="text-indigo-300">Tools -&gt; Options -&gt; Expert Advisors</code>
                </p>
                <p className="text-slate-400">
                  ✓ ติ๊กถูก <b>Allow WebRequest for listed URL</b> แล้วกดเพิ่ม:
                </p>
                <code className="block bg-slate-900 p-1.5 rounded text-[11px] text-amber-300 font-mono">
                  {webhookUrl.replace('/api/mt5/sync', '')}
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">ลาก EA ลงบนกราฟและเปิดใช้งาน</p>
                <p className="text-slate-400">
                  ในหน้าต่าง Navigator ของ MT5 คลิกขวาที่ Experts กด <b>Refresh</b> แล้วลาก <b>TradeJournalSync</b> ลงกราฟใดก็ได้ 1 กราฟ
                </p>
                <p className="text-emerald-400 font-semibold">
                  ✓ กดปุ่ม <b>Algo Trading</b> ด้านบนให้เป็นสีเขียว พร้อมทำงานทันที!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
