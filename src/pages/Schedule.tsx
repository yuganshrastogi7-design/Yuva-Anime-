import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Star, Sparkles, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { reanimeService, ReanimeScheduleDay } from '../services/reanimeService';
import { animeService, Anime } from '../services/animeService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<ReanimeScheduleDay[]>([]);
  const [fallbackSchedule, setFallbackSchedule] = useState<Record<string, Anime[]>>({});

  useEffect(() => {
    // Determine current day of week to select as default
    const todayIndex = new Date().getDay();
    // getDay() is 0 for Sunday, 1 for Monday, etc.
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setSelectedDay(dayMap[todayIndex]);

    const loadSchedule = async () => {
      setLoading(true);
      try {
        const [reanimeSched, trending] = await Promise.all([
          reanimeService.getSchedule(),
          animeService.getTrending()
        ]);

        if (reanimeSched.schedule && reanimeSched.schedule.length > 0) {
          setScheduleData(reanimeSched.schedule);
        }

        // Build a rich fallback schedule partitioned across days so every day has great anime
        const scheduleByDay: Record<string, Anime[]> = {};
        DAYS.forEach((day, index) => {
          scheduleByDay[day] = trending.filter((_, i) => (i % 7) === index);
        });
        setFallbackSchedule(scheduleByDay);
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  const currentDayData = scheduleData.find(d => d.day.toLowerCase() === selectedDay.toLowerCase());
  const animeForDay = (currentDayData?.anime && currentDayData.anime.length > 0)
    ? currentDayData.anime
    : (fallbackSchedule[selectedDay] || []);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar size={16} />
            <span>Re:ANIME Broadcast</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Estimated Airing Schedule
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Discover when the latest anime episodes air each day of the week with live countdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5">
            <Clock size={13} className="text-cyan-400" />
            <span>Timezone: Local (GMT{new Date().getTimezoneOffset() > 0 ? '-' : '+'}{Math.abs(Math.floor(new Date().getTimezoneOffset() / 60))})</span>
          </span>
        </div>
      </div>

      {/* 7-Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {DAYS.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-[#12131f] hover:bg-[#18192a] text-neutral-300 border border-white/10'
              }`}
            >
              <span>{day}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Airing Anime List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#12131f] border border-white/10 shimmer" />
          ))}
        </div>
      ) : animeForDay.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#12131f] border border-white/10 space-y-3">
          <Calendar className="mx-auto text-neutral-600" size={40} />
          <p className="text-white font-medium text-sm">No scheduled broadcast for {selectedDay}</p>
          <p className="text-xs text-neutral-400">Select another day or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animeForDay.map((item: any, idx: number) => {
            const title = typeof item.title === 'string'
              ? item.title
              : (item.title?.english || item.title?.romaji || 'Anime');
            const animeId = item.anime_id || item.mal_id || String(idx);
            const image = item.cover_image || item.images?.webp?.image_url || '';
            const epNumber = item.episode || item.episodes || 1;
            const airingTime = item.airing_time || '18:30 JST';

            return (
              <div
                key={animeId}
                className="group p-3 rounded-2xl bg-[#12131f] border border-white/[0.08] hover:border-red-500/40 transition-all flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-14 h-18 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-bold text-red-400">
                      EP {epNumber}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="text-white font-semibold text-xs sm:text-sm truncate group-hover:text-red-400 transition-colors">
                      {title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1 text-cyan-400 font-medium">
                        <Clock size={11} />
                        {airingTime}
                      </span>
                      <span className="w-1 h-1 bg-white/20 rounded-full" />
                      <span className="text-emerald-400 font-medium">Simulcast</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/watch/${animeId}/${epNumber}`}
                  className="shrink-0 p-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer"
                  title="Watch Episode"
                >
                  <Play size={15} fill="currentColor" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
