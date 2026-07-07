import { useEffect, useState } from "react";

const STORAGE_KEY = "fisioflow.splash.shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip splash on the public landing page — visitors should see the hero instantly.
    if (window.location.pathname === "/") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(true);
    const t1 = setTimeout(() => setLeaving(true), 1400);
    const t2 = setTimeout(() => setVisible(false), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 500ms ease",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <FisioFlowLoader />
    </div>
  );
}

export function FisioFlowLoader({ size = 120 }: { size?: number }) {
  return (
    <div
      className="ff-loader-container"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Carregando"
    >
      <svg
        className="ff-loading-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
      >
        <path
          fill="#001F4D"
          d="M60,0C26.9,0,0,26.9,0,60s26.9,60,60,60s60-26.9,60-60S93.1,0,60,0z M60,105C35.1,105,15,84.9,15,60 S35.1,15,60,15s45,20.1,45,45S84.9,105,60,105z"
        />
        <path
          stroke="#ffffff"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          d="M60,15 L82,38 M82,38 L105,60 M105,60 L82,82 M82,82 L60,105 M60,105 L38,82 M38,82 L15,60 M15,60 L38,38 M38,38 L60,15"
        />
        <g fill="#00C4B4">
          <circle cx="60" cy="48" r="11" />
          <path d="M42,68 C42,68 48,82 60,82 C72,82 78,68 78,68 L78,75 C78,75 72,92 60,92 C48,92 42,75 42,75 Z" />
        </g>
      </svg>
      <style>{`
        .ff-loader-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .ff-loading-icon {
          width: 100%;
          height: 100%;
          transform-origin: center;
          animation:
            ffSpin 1.5s ease-in-out infinite,
            ffPulse 1.5s ease-in-out infinite alternate;
        }
        @keyframes ffSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ffPulse {
          from { transform: scale(0.9); }
          to { transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ff-loading-icon { animation: none; }
        }
      `}</style>
    </div>
  );
}
