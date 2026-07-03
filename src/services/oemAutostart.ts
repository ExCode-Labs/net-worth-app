/**
 * Some Android OEMs (MIUI/Xiaomi, Vivo, Oppo/Realme, OnePlus, Huawei/Honor)
 * throttle or kill background apps via a separate "Autostart" / "allow
 * background activity" toggle that sits OUTSIDE stock Android's battery
 * optimization settings — so exempting NetWorth from battery optimization
 * (permissions.tsx) isn't enough on these phones to keep the notification
 * listener alive while backgrounded. This is the biggest reason a
 * transaction sometimes isn't captured when the app was minimised.
 *
 * Activity names are community-known (dontkillmyapp.com) but shift across
 * firmware versions, so every launch is best-effort with a silent fallback —
 * never crash onboarding over a vendor settings screen that may not exist on
 * this exact build.
 */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import Constants from "expo-constants";
import { matchOemKey } from "./oemMatch";

interface OemTarget {
  packageName: string;
  className: string;
}

const OEM_TARGETS: Record<string, OemTarget[]> = {
  xiaomi: [{ packageName: "com.miui.securitycenter", className: "com.miui.permcenter.autostart.AutoStartManagementActivity" }],
  redmi:  [{ packageName: "com.miui.securitycenter", className: "com.miui.permcenter.autostart.AutoStartManagementActivity" }],
  poco:   [{ packageName: "com.miui.securitycenter", className: "com.miui.permcenter.autostart.AutoStartManagementActivity" }],
  vivo:   [{ packageName: "com.vivo.permissionmanager", className: "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" }],
  iqoo:   [{ packageName: "com.iqoo.secure", className: "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" }],
  oppo:   [
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.startupapp.StartupAppListActivity" },
  ],
  realme: [
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.startupapp.StartupAppListActivity" },
  ],
  oneplus: [{ packageName: "com.oneplus.security", className: "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity" }],
  huawei:  [{ packageName: "com.huawei.systemmanager", className: "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" }],
  honor:   [{ packageName: "com.huawei.systemmanager", className: "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" }],
};

function currentBrand(): string {
  return Device.manufacturer ?? Device.brand ?? "";
}

/** True if this device's manufacturer is known to need a separate autostart step. */
export function needsOemAutostartStep(): boolean {
  return Platform.OS === "android" && matchOemKey(currentBrand()) !== undefined;
}

/** Best-effort open of the OEM's autostart/background-permission screen,
 *  falling back to this app's own settings page if nothing known worked. */
export async function openOemAutostartSettings(): Promise<void> {
  const key = matchOemKey(currentBrand());
  for (const t of key ? OEM_TARGETS[key] : []) {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
        packageName: t.packageName,
        className: t.className,
      });
      return;
    } catch {
      // try the next known variant for this brand, if any
    }
  }
  const pkg = Constants.expoConfig?.android?.package;
  IntentLauncher.startActivityAsync("android.settings.APPLICATION_DETAILS_SETTINGS", {
    data: pkg ? `package:${pkg}` : undefined,
  }).catch(() => {});
}
