import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { CurrencyInr, Wallet, CreditCard, ArrowUp, ArrowDown, Plus, Receipt, ClipboardText } from '@phosphor-icons/react';

export default function GallaPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, category: 'other' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = [
    { id: 'laundry', icon: '👔' },
    { id: 'electricity', icon: '⚡' },
    { id: 'water', icon: '💧' },
    { id: 'maintenance', icon: '🔧' },
    { id: 'supplies', icon: '📦' },
    { id: 'other', icon: '📝' }
  ];

  useEffect(() => { fetchSummary(); }, [selectedDate]);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get(`/galla/summary?date=${selectedDate}`);
      setSummary(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0) return;
    try {
      await api.post('/expenses', expenseForm);
      setShowAddExpense(false);
      setExpenseForm({ description: '', amount: 0, category: 'other' });
      fetchSummary();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <p className="text-xl font-bold text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="galla-page">
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
          {lang === 'mr' ? 'डिजिटल गल्ला' : 'Digital Galla'}
        </h1>
        <p className="text-zinc-500 text-sm">{t('shift_summary')}</p>
        <div className="mt-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="h-12 px-4 rounded-xl border-2 border-zinc-200 font-medium text-sm focus:border-zinc-900 focus:outline-none bg-white" data-testid="galla-date-picker" />
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="galla-summary-cards">
          <div className="bg-[#DCFCE7] border-2 border-[#16A34A] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={20} weight="bold" className="text-[#14532D]" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-[#14532D]/70">{t('cash_collected')}</span>
            </div>
            <div className="text-3xl font-black text-[#14532D]">₹{summary?.cash_collected || 0}</div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={20} weight="bold" className="text-blue-900" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-blue-900/70">{t('upi_collected')}</span>
            </div>
            <div className="text-3xl font-black text-blue-900">₹{summary?.upi_collected || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="galla-totals">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <ArrowUp size={18} weight="bold" className="text-[#22C55E]" />
              <span className="text-sm font-bold text-zinc-600">{t('total_collected')}</span>
            </div>
            <span className="text-xl font-black text-[#22C55E]">₹{summary?.total_collected || 0}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <ArrowDown size={18} weight="bold" className="text-[#EF4444]" />
              <span className="text-sm font-bold text-zinc-600">{t('total_expenses')}</span>
            </div>
            <span className="text-xl font-black text-[#EF4444]">₹{summary?.total_expenses || 0}</span>
          </div>
          <div className="border-t-2 border-zinc-100 pt-3 flex justify-between items-center">
            <span className="font-bold text-zinc-900">{t('net_amount')}</span>
            <span className="text-2xl font-black text-zinc-900">₹{summary?.net_amount || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowAddExpense(!showAddExpense)}
            className="bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform font-bold text-base uppercase tracking-[0.05em]" data-testid="add-expense-btn">
            <Plus size={20} weight="bold" /> {lang === 'mr' ? 'खर्च जोडा' : 'Add Expense'}
          </button>
          <button onClick={() => navigate('/shift-handover')}
            className="bg-amber-50 border-2 border-amber-200 text-amber-700 h-16 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform font-bold text-sm" data-testid="goto-shift-handover-btn">
            <ClipboardText size={20} weight="bold" /> {lang === 'mr' ? 'शिफ्ट हँडओव्हर' : 'Shift Handover'}
          </button>
        </div>

        {showAddExpense && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-4" data-testid="expense-form">
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-2 block">{lang === 'mr' ? 'प्रकार' : 'Category'}</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setExpenseForm(prev => ({...prev, category: cat.id}))}
                    className={`h-14 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform ${
                      expenseForm.category === cat.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'
                    }`} data-testid={`expense-cat-${cat.id}`}>
                    <span>{cat.icon}</span> <span>{t(cat.id)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'वर्णन' : 'Description'}</label>
              <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({...prev, description: e.target.value}))}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
                placeholder={lang === 'mr' ? 'उदा: धुलाई सेवा' : 'e.g. Laundry service'} data-testid="expense-description" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'रक्कम' : 'Amount'}</label>
              <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({...prev, amount: parseFloat(e.target.value) || 0}))}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none" data-testid="expense-amount" />
            </div>
            <button onClick={handleAddExpense}
              className="bg-[#22C55E] text-white h-14 rounded-xl flex items-center justify-center gap-2 w-full font-bold text-lg active:scale-95 transition-transform" data-testid="submit-expense-btn">
              <Receipt size={20} weight="bold" /> {t('submit')}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
          <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
            {lang === 'mr' ? 'व्यवहार' : 'Transactions'} ({summary?.transaction_count || 0})
          </span>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {summary?.transactions?.map((txn, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                <div>
                  <p className="font-bold text-sm">{txn.description || txn.category}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {txn.staff_name && ` · ${txn.staff_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${txn.type === 'cash' ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-blue-50 text-blue-700'}`}>
                    {txn.type?.toUpperCase()}
                  </span>
                  <span className="font-black text-[#22C55E]">+₹{txn.amount}</span>
                </div>
              </div>
            ))}
            {(!summary?.transactions || summary.transactions.length === 0) && (
              <p className="text-center text-zinc-400 py-4">{t('no_data')}</p>
            )}
          </div>
        </div>

        {summary?.expenses?.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">{t('expenses')}</span>
            <div className="space-y-2">
              {summary.expenses.map((exp, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div>
                    <p className="font-bold text-sm">{exp.description}</p>
                    <p className="text-xs text-zinc-400">{t(exp.category)}</p>
                  </div>
                  <span className="font-black text-[#EF4444]">-₹{exp.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
