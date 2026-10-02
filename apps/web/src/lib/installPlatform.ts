export type InstallPlatform = "ios" | "android" | "other";

export interface PlatformInfo {
  platform: InstallPlatform;
  standalone: boolean;
  openIn: "Safari" | "Chrome" | null;
}

export interface PlatformEnv {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standaloneMedia: boolean;
  navigatorStandalone: boolean | undefined;
}

const IN_APP =
  /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|MicroMessenger|Snapchat|TikTok|BytedanceWebview|musical_ly|Twitter|WhatsApp|Telegram/i;
const IOS_OTHER_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i;

export function detectPlatform(env: PlatformEnv): PlatformInfo {
  const ua = env.userAgent;
  const ios =
    /iPhone|iPad|iPod/.test(ua) ||
    (env.platform === "MacIntel" && env.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone = env.standaloneMedia || env.navigatorStandalone === true;

  if (ios) {
    const inApp = IN_APP.test(ua) || (!standalone && !/Safari/.test(ua));
    return {
      platform: "ios",
      standalone,
      openIn: inApp || IOS_OTHER_BROWSERS.test(ua) ? "Safari" : null,
    };
  }

  if (android) {
    const webview = IN_APP.test(ua) || /; wv\)/.test(ua);
    return {
      platform: "android",
      standalone,
      openIn: webview ? "Chrome" : null,
    };
  }

  return { platform: "other", standalone, openIn: null };
}

export function readPlatformEnv(): PlatformEnv {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standaloneMedia: window.matchMedia("(display-mode: standalone)").matches,
    navigatorStandalone: (navigator as Navigator & { standalone?: boolean })
      .standalone,
  };
}
