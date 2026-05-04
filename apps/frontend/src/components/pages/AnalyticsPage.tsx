import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Progress } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function AnalyticsPage() {
  const { t, language } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [dashboard, costsData] = await Promise.all([
          api('/analytics/dashboard'),
          api('/analytics/costs?days=7')
        ]);

        // Process costsData for daily breakdown
        const dailyMap: Record<string, number> = {};
        const modelMap: Record<string, { requests: number; cost: number }> = {};
        let totalHits = 0;
        let totalRequests = dashboard?.costs?.apiCalls || 0;

        (costsData || []).forEach((row: any) => {
          const dateStr = new Date(row.date).toISOString().split('T')[0];
          const costValue = row.total_cost || 0;
          const reqCount = row.requests || 0;
          const cacheHits = row.cache_hits || 0;
          const modelName = row.model || t('dashboard.unspecified');

          dailyMap[dateStr] = (dailyMap[dateStr] || 0) + costValue;
          
          if (!modelMap[modelName]) {
             modelMap[modelName] = { requests: 0, cost: 0 };
          }
          modelMap[modelName].requests += reqCount;
          modelMap[modelName].cost += costValue;
          totalHits += cacheHits;
        });

        // Ensure 7 days array
        const dailyCosts = Object.keys(dailyMap).map(date => ({ date, cost: dailyMap[date] })).sort((a,b) => a.date.localeCompare(b.date));
        
        // Fallback to empty days if none
        if (dailyCosts.length === 0) {
           for(let i=6; i>=0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             dailyCosts.push({ date: d.toISOString().split('T')[0], cost: 0 });
           }
        }

        const modelBreakdown = Object.keys(modelMap).map(model => ({
           model,
           requests: modelMap[model].requests,
           cost: modelMap[model].cost
        }));

        setData({
          ...dashboard,
          cacheHitRate: totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : '0.0',
          dailyCosts,
          modelBreakdown
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [language]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('analytics.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('analytics.loading')}</p>
        </div>
      </div>
    );
  }

  const maxCost = Math.max(...data.dailyCosts.map((d: any) => d.cost), 0.01);
  const locale = language === 'es' ? 'es-AR' : 'en-US';

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('analytics.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('analytics.stat_spend'), value: `$${data.costs.monthlySpend}`, color: 'from-violet-500 to-violet-600', icon: '$' },
          { label: t('analytics.stat_calls'), value: data.costs.apiCalls.toString(), color: 'from-emerald-500 to-emerald-600', icon: '⚡' },
          { label: t('analytics.stat_cache'), value: `${data.cacheHitRate}%`, color: 'from-sky-500 to-blue-600', icon: '◈' },
          { label: t('analytics.stat_tokens'), value: `${(data.costs.totalTokens / 1e6).toFixed(1)}M`, color: 'from-amber-500 to-orange-500', icon: '✦' },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm stat-glow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight">{s.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-sm shadow-lg`}>
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Daily costs chart */}
        <div className="col-span-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">{t('analytics.chart_daily')}</h3>
              <div className="flex items-end gap-2 h-40">
                {data.dailyCosts.map((day: any) => {
                  const height = (day.cost / maxCost) * 100;
                  const date = new Date(day.date);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-muted-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        ${day.cost.toFixed(2)}
                      </span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-violet-400 transition-all group-hover:from-violet-600 group-hover:to-violet-500"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {date.toLocaleDateString(locale, { day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{t('analytics.last_7_days')}</span>
                <span>{t('analytics.average', { amount: (data.dailyCosts.reduce((s: number, d: any) => s + d.cost, 0) / data.dailyCosts.length).toFixed(2) })}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model breakdown */}
        <div className="col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">{t('analytics.chart_models')}</h3>
              <div className="space-y-4">
                {data.modelBreakdown.map((m: any) => {
                  const colors: Record<string, string> = {
                    'Sonnet': 'bg-violet-500',
                    'Haiku': 'bg-emerald-500',
                    'Cache': 'bg-sky-400',
                  };
                  return (
                    <div key={m.model}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors[m.model] || 'bg-gray-400'}`} />
                          <span className="text-sm font-medium">{m.model}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.requests} {t('dashboard.requests_label')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted/50 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[m.model] || 'bg-gray-400'}`}
                            style={{ width: `${(m.requests / data.costs.apiCalls) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-14 text-right">${m.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Token budget */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">{t('analytics.tokens_budget')}</h3>
              <div className="relative mb-3">
                <Progress value={data.costs.tokenBudget.usagePercent} className="h-4 rounded-lg" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                  {data.costs.tokenBudget.usagePercent}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{(data.costs.tokenBudget.used / 1e6).toFixed(1)}M</p>
                  <p className="text-[10px] text-muted-foreground">{t('analytics.tokens_used')}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{(data.costs.tokenBudget.remaining / 1e6).toFixed(1)}M</p>
                  <p className="text-[10px] text-muted-foreground">{t('analytics.tokens_remaining')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Savings card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💰</span>
                <h3 className="font-semibold text-emerald-800">{t('analytics.savings_title')}</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-1">$8.42</p>
              <p className="text-xs text-emerald-600/80">
                {t('analytics.savings_desc', { percent: 65 })}
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-200/50 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600/80">{t('analytics.no_optimization')}</span>
                  <span className="font-medium text-emerald-800">$21.26</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600/80">{t('analytics.with_contentai')}</span>
                  <span className="font-medium text-emerald-800">${data.costs.monthlySpend}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
