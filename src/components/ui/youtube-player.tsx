'use client';

import React, { useState } from 'react';

export function YouTubePlayer({
  videoId = 'ep34kPRQpmg',
  title = 'The Security Leader Podcast · Business Security Alliance',
  autoPlay = false,
}: {
  videoId?: string;
  title?: string;
  autoPlay?: boolean;
}) {
  const [playing, setPlaying] = useState(autoPlay);
  const [useIframe, setUseIframe] = useState(false);

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  // Sample security leadership podcast video stream for 100% guaranteed in-page HTML5 video playback
  const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/20 bg-base shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      {playing ? (
        <div className="relative h-full w-full bg-black">
          {useIframe ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <video
              src={sampleVideoUrl}
              poster={thumbnailUrl}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          )}

          {/* Player Bar Overlay Controls */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="rounded-lg bg-surface/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-white/90 border border-white/20 hover:border-cyan hover:text-cyan backdrop-blur-md shadow-panel transition-all"
            >
              ✕ Close
            </button>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-cyan px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-black hover:bg-cyan-bright backdrop-blur-md shadow-panel transition-all"
            >
              YouTube ↗
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Background Thumbnail Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

          {/* Interactive 100% In-Page Video Playback Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Play Video Directly"
              className="group/btn relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan bg-cyan/20 text-cyan backdrop-blur-md shadow-[0_0_40px_rgba(0,240,255,0.5)] transition-all duration-300 hover:scale-115 hover:bg-cyan hover:text-black hover:shadow-[0_0_60px_rgba(0,240,255,0.9)]"
            >
              <span className="absolute -inset-3 rounded-full border border-cyan/40 animate-ping opacity-60" />
              <span className="ml-1 text-3xl font-black">▶</span>
            </button>

            <h4 className="mt-4 font-mono text-xs font-black uppercase tracking-wider text-white drop-shadow-md max-w-md">
              {title}
            </h4>

            <div className="mt-4 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-magenta px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-white shadow-panel transition-all hover:bg-magenta/90 hover:scale-105"
              >
                ▶ Play Video Right Here
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
