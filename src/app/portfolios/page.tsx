'use client';

import React, { useState } from 'react';
import { Briefcase, Plus, Check, Trash2, Wallet, ArrowRight, Edit3 } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Portfolio } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const CURRENCIES = ['USD', 'THB', 'EUR', 'GBP', 'JPY', 'USDT'];

export default function PortfoliosPage() {
  const { 
    portfolios, 
    activePortfolio, 
    setActivePortfolioId, 
    createPortfolio, 
    updatePortfolio,
    deletePortfolio 
  } = useTrading();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingPortfolio(null);
    setName('');
    setInitialBalance('');
    setCurrency('USD');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Portfolio) => {
    setEditingPortfolio(p);
    setName(p.name);
    setInitialBalance(String(p.initial_balance));
    setCurrency(p.currency);
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingPortfolio) {
        await updatePortfolio({
          ...editingPortfolio,
          name: name.trim(),
          initial_balance: parseFloat(initialBalance) || 0,
          currency,
          description: description.trim() || undefined,
        });
      } else {
        await createPortfolio({
          name: name.trim(),
          initial_balance: parseFloat(initialBalance) || 0,
          currency,
          description: description.trim() || undefined,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save portfolio:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`คุณต้องการลบพอร์ต "${name}" และล้างข้อมูลการเทรดทั้งหมดใช่หรือไม่?`)) {
      if (portfolios.length <= 1) {
        // Reset to clean default portfolio
        await updatePortfolio({
          id,
          name: 'Main Trading Portfolio',
          initial_balance: 0,
          currency: 'USD',
          description: undefined,
          created_at: new Date().toISOString(),
        });
        alert('รีเซ็ตพอร์ตและล้างข้อมูลเรียบร้อยแล้ว');
      } else {
        await deletePortfolio(id);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            พอร์ตการลงทุน (Portfolios)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            แยกบันทึกสถิติตามพอร์ต เช่น พอร์ตสอบกองทุน, พอร์ตจริง, พอร์ตคริปโต
          </p>
        </div>

        <Button onClick={openCreateModal} className="shadow-brand-500/25">
          <Plus className="w-4 h-4 mr-2" />
          + สร้างพอร์ตใหม่
        </Button>
      </div>

      {/* Portfolios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {portfolios.map((p) => {
          const isActive = p.id === activePortfolio?.id;
          return (
            <Card
              key={p.id}
              className={`p-5 flex flex-col justify-between transition relative ${
                isActive ? 'border-brand-500/50 bg-slate-900 ring-1 ring-brand-500/30' : 'hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={isActive ? 'brand' : 'neutral'} size="sm">
                          {p.currency}
                        </Badge>
                        {isActive && (
                          <Badge variant="profit" size="sm" pulse>
                            พอร์ตที่ใช้งานอยู่
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="text-slate-400 hover:text-brand-300 p-1.5 rounded-lg hover:bg-slate-800 transition"
                      title="แก้ไขพอร์ต / เปลี่ยนทุนเริ่มต้น"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                      title={portfolios.length <= 1 ? "รีเซ็ตและล้างข้อมูลพอร์ตนี้" : "ลบพอร์ต"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 min-h-[32px]">
                  {p.description || 'ไม่มีคำอธิบาย'}
                </p>
              </div>

              {/* Balance info & Switch button */}
              <div className="pt-4 border-t border-slate-800 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">ทุนเริ่มต้น:</span>
                  <span className="font-bold text-white text-sm">
                    {p.initial_balance.toLocaleString()} {p.currency}
                  </span>
                </div>

                {isActive ? (
                  <div className="w-full py-2 text-center text-xs font-semibold text-brand-400 bg-brand-600/10 rounded-xl border border-brand-500/20">
                    ✓ กำลังใช้งานพอร์ตนี้
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActivePortfolioId(p.id)}
                  >
                    สลับมาใช้พอร์ตนี้
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPortfolio ? 'แก้ไขข้อมูลพอร์ต / ทุนเริ่มต้น' : 'สร้างพอร์ตการลงทุนใหม่'}
        description={editingPortfolio ? 'เปลี่ยนชื่อ, สกุลเงิน หรือกำหนดทุนเริ่มต้นใหม่' : 'กำหนดชื่อพอร์ตและเงินทุนเริ่มต้นสำหรับการคำนวณกำไรสะสม'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            label="ชื่อพอร์ตการลงทุน *"
            placeholder="เช่น XM Real Account, พอร์ตทองคำ..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="เงินทุนเริ่มต้น (Initial Balance)"
              type="number"
              step="any"
              min="0"
              placeholder="ไม่ระบุ = 0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                สกุลเงินของพอร์ต
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              คำอธิบายเพิ่มเติม (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="บันทึกรายละเอียดของพอร์ตนี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังบันทึก...' : (editingPortfolio ? 'บันทึกการแก้ไข' : 'สร้างพอร์ต')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
