'use client';

import * as React from 'react';
import Image from 'next/image';

export function DashboardCarousel() {
    return (
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 mt-8 sm:mt-12 z-20">
            {/* Ambient atmospheric backdrop glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />

            <div className="flex flex-col items-center">
                {/* Showcase Container with subtle frame & glow */}
                <div className="relative w-full rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white dark:from-zinc-800 dark:to-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xl shadow-orange-500/10 overflow-hidden group">
                    <div className="relative aspect-[16/9] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950">
                        <Image
                            src="/invoice-dashboard-preview.jpg"
                            alt="Zeneva Invoice premium billing dashboard with real-time revenue analytics, client invoice management, multi-currency support, and Zen AI Copilot"
                            width={1920}
                            height={1080}
                            priority
                            quality={95}
                            sizes="(max-width: 1280px) 100vw, 1280px"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
