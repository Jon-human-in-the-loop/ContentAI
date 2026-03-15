import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const typeColors: Record<string, string> = {
  POST: 'bg-violet-500',
  REEL: 'bg-emerald-500',
  STORY: 'bg-amber-500',
  CAROUSEL: 'bg-sky-500',
};

export function CalendarPage() {
  const now = new Date();
  const todayDay = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await api('/content/requests');
        const eventsObj: Record<string, any[]> = {};

        (data || []).forEach((req: any) => {
          (req.pieces || []).forEach((p: any) => {
            const pieceDate = p.scheduledAt ? new Date(p.scheduledAt) : new Date(p.createdAt);
            const dateStr = pieceDate.toISOString().split('T')[0];

            if (!eventsObj[dateStr]) eventsObj[dateStr] = [];

            eventsObj[dateStr].push({
              id: p.id,
              clientName: req.client?.name || 'Cliente',
              type: p.type || 'POST',
              platform: 'INSTAGRAM',
              caption: p.caption || '',
              status: p.status || 'DRAFT',
            });
          });
        });

        setCalendarEvents(eventsObj);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    setSelectedDay(null);
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDay = (day: number): any[] => {
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = (viewMonth + 1).toString().padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    return calendarEvents[dateStr] || [];
  };

  const selectedEvents = selectedDay ? getEventsForDay(parseInt(selectedDay)) : [];

  const isViewingCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground text-sm mt-1">Programá y visualizá tu contenido</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 mr-4">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[10px] text-muted-foreground">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth} className="h-8 w-8 p-0">
            ←
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">{monthName}</h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
            →
          </Button>
        </div>
        {!isViewingCurrentMonth && (
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
            Hoy
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {/* Header */}
        {DAYS.map((d) => (
          <div key={d} className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}

        {/* Calendar cells */}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="min-h-[110px] bg-muted/20 border border-border/30" />;
          }

          const events = getEventsForDay(day);
          const isToday = isViewingCurrentMonth && day === todayDay;
          const isSelected = selectedDay === day.toString();

          return (
            <div
              key={i}
              className={`min-h-[110px] border border-border/30 p-2 cursor-pointer transition-colors ${
                isToday ? 'bg-violet-50/50' : 'bg-white hover:bg-muted/30'
              } ${isSelected ? 'ring-2 ring-violet-400 ring-inset' : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : day.toString())}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium ${isToday ? 'text-violet-600' : 'text-foreground/70'}`}>
                  {day}
                </span>
                {isToday && (
                  <Badge variant="secondary" className="text-[9px] bg-violet-100 text-violet-600 px-1 py-0">HOY</Badge>
                )}
              </div>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`rounded px-1.5 py-1 mb-1 ${typeColors[ev.type]} text-white text-[10px] leading-tight truncate`}
                >
                  {ev.clientName} — {ev.type}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <Card className="border-0 shadow-lg animate-in">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">
              {parseInt(selectedDay)} de {monthName}
              {selectedEvents.length > 0
                ? ` — ${selectedEvents.length} pieza${selectedEvents.length > 1 ? 's' : ''} programada${selectedEvents.length > 1 ? 's' : ''}`
                : ' — Sin contenido programado'}
            </h3>
            {selectedEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-2 h-full min-h-[40px] rounded-full ${typeColors[ev.type]}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{ev.clientName}</span>
                        <Badge variant="secondary" className="text-[10px]">{ev.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{ev.platform}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ev.caption}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]">Ver detalle</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-500 border-red-200">Desprogramar</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Podés arrastrar contenido aprobado a este día para programarlo.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
