import React from 'react';
import { MessageSquare, Zap, Lock, Image as ImageIcon, Star } from 'lucide-react';

export const AuthHero: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between p-8 sm:p-10 lg:p-12 bg-gradient-to-br from-[#ebf2ff] via-[#f1f6ff] to-[#e8fbf6] rounded-t-3xl lg:rounded-tr-none lg:rounded-l-3xl border-b lg:border-b-0 lg:border-r border-slate-200/60 overflow-hidden">
      {/* Background soft glow decoration */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding Section */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <MessageSquare className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Connectly</span>
          <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#6d28d9]">
            V2.4
          </span>
        </div>

        {/* Hero Title & Subtitle */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4">
          Real-time sync for modern teams.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mb-9">
          Conversations, instant context, and fluid asynchronous threads engineered for engineering & product velocity.
        </p>

        {/* Feature List */}
        <div className="space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <Zap className="w-4 h-4 fill-indigo-600/20" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Zero-latency sync</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sub-50ms peer packet updates across all connected devices.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">End-to-end encryption</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Client-side cryptographic sealing for chats and enterprise archives.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rich file & media preview</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Figma frames, GitHub PR commits, and 4K stream inline inspections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Card */}
      <div className="relative z-10 mt-10 p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-sm shadow-indigo-950/5">
        <div className="flex items-center gap-1 text-indigo-500">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 stroke-indigo-600 stroke-[1.8] fill-none" />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-slate-700 italic leading-relaxed">
          &ldquo;Connectly reduced our internal sync overhead by 40%. It feels as fast as thought.&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&auto=format&fit=crop"
            alt="Sarah Lin"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-xs"
          />
          <div>
            <div className="text-xs font-bold text-slate-900">Sarah Lin</div>
            <div className="text-[11px] text-slate-500">Staff Infrastructure Lead @ SupaScale</div>
          </div>
        </div>
      </div>
    </div>
  );
};
