import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { FileArrowDown, Table, FileCsv, CalendarBlank } from '@phosphor-icons/react';

export default function FormCPage() {
  const { t, lang } = useLanguage();
  const [records, setRecords] = useState([]);
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => { fetchFormC(); }, []);

  const fetchFormC = async (from, to) => {
    setLoading(true);
    try {
      let url = '/formc/export';
      const params = [];
      if (from) params.push(`from_date=${from}`);
      if (to) params.push(`to_date=${to}`);
      if (params.length) url += '?' + params.join('&');
      const { data } = await api.get(url);
      setRecords(data.records || []);
      setCsvData(data.csv_data || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFilter = () => { fetchFormC(fromDate, toDate); };

  const downloadCSV = () => {
    if (!csvData) return;
    setExporting(true);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FormC_${fromDate || 'all'}_to_${toDate || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="formc-page">
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
          {t('form_c')} — {t('government_export')}
        </h1>
        <p className="text-zinc-500 text-sm">{lang === 'mr' ? 'पोलीस पोर्टल फॉरमॅट' : 'Police Portal Format'}</p>

        {/* Date Range Filter */}
        <div className="mt-4 bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3" data-testid="formc-date-filter">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 flex items-center gap-1">
            <CalendarBlank size={14} weight="bold" /> {lang === 'mr' ? 'तारीख श्रेणी' : 'Date Range'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'पासून' : 'From'}</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-medium text-sm focus:border-zinc-900 focus:outline-none bg-white" data-testid="formc-from-date" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'पर्यंत' : 'To'}</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-medium text-sm focus:border-zinc-900 focus:outline-none bg-white" data-testid="formc-to-date" />
            </div>
          </div>
          <button onClick={handleFilter}
            className="w-full h-12 rounded-xl bg-zinc-900 text-white font-bold active:scale-95 transition-transform" data-testid="formc-filter-btn">
            {lang === 'mr' ? 'फिल्टर करा' : 'Apply Filter'}
          </button>
        </div>

        {/* Export Button */}
        <button onClick={downloadCSV} disabled={exporting || records.length === 0}
          className="mt-4 bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50" data-testid="formc-download-btn">
          <FileCsv size={24} weight="bold" /> {exporting ? t('loading') : t('download_csv')}
        </button>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 mb-4" data-testid="formc-count">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table size={20} weight="bold" className="text-zinc-500" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">{t('guest_register')}</span>
            </div>
            <span className="text-xl font-black text-zinc-900">{records.length} {lang === 'mr' ? 'नोंदी' : 'records'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="formc-table">
              <thead>
                <tr className="bg-zinc-50 border-b-2 border-zinc-200">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Sr</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('guest_name')}</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('phone')}</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('aadhar')}</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('room_number')}</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('check_in')}</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{t('check_out')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 font-bold">{rec.sr_no}</td>
                    <td className="px-3 py-2 font-medium">{rec.guest_name}</td>
                    <td className="px-3 py-2 text-zinc-500">{rec.phone}</td>
                    <td className="px-3 py-2 text-zinc-500 font-mono text-xs">{rec.aadhar_number}</td>
                    <td className="px-3 py-2 font-bold">{rec.room_number}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">{rec.check_in ? new Date(rec.check_in).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">{rec.check_out ? new Date(rec.check_out).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-zinc-400">{t('no_data')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
