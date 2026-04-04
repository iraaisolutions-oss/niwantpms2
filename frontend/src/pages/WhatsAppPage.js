import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { WhatsappLogo, PaperPlaneTilt } from '@phosphor-icons/react';

export default function WhatsAppPage() {
  const { t, lang } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/whatsapp/logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'welcome': return 'bg-[#DCFCE7] text-[#14532D]';
      case 'checkout_invoice': return 'bg-blue-50 text-blue-700';
      case 'wifi': return 'bg-amber-50 text-amber-700';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <p className="text-xl font-bold text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="whatsapp-page">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <WhatsappLogo size={28} weight="bold" className="text-[#25D366]" />
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
            {t('whatsapp')}
          </h1>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          {lang === 'mr' ? 'सर्व पाठवलेले संदेश (मॉक)' : 'All sent messages (Mocked)'}
        </p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-amber-700 font-bold">
            {lang === 'mr' 
              ? 'WhatsApp इंटिग्रेशन मॉक आहे. Meta API क्रेडेन्शियल्स जोडल्यानंतर सक्रिय होईल.'
              : 'WhatsApp integration is MOCKED. Will activate after adding Meta API credentials.'
            }
          </p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid={`whatsapp-log-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getTypeColor(log.message_type)}`}>
                {log.message_type}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(log.timestamp).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="font-medium text-sm mb-1">{log.content}</p>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>{log.phone}</span>
              <span className="flex items-center gap-1">
                <PaperPlaneTilt size={12} weight="bold" />
                {log.status}
              </span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-12">
            <WhatsappLogo size={48} weight="duotone" className="text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 font-bold">{t('no_data')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
