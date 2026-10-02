import { useState, useSyncExternalStore } from "react";
import { detectPlatform, readPlatformEnv } from "../lib/installPlatform";
import type { PlatformInfo } from "../lib/installPlatform";
import {
  getCanInstall,
  promptInstall,
  subscribeInstallPrompt,
} from "../lib/installPrompt";

export function useInstallState() {
  const [info] = useState<PlatformInfo>(() =>
    detectPlatform(readPlatformEnv()),
  );
  const canInstall = useSyncExternalStore(
    subscribeInstallPrompt,
    getCanInstall,
    () => false,
  );
  return { info, canInstall, install: promptInstall };
}
