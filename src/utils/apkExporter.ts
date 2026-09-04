import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Builds and triggers browser download of an Android WebAPK & PWABuilder package (.apk / .zip bundle)
 * complete with PWABuilder CLI options, twa-manifest, AndroidManifest, build scripts, assets and PWA web bundle.
 */
export async function downloadAndroidApkBundle(appUrl: string): Promise<void> {
  const zip = new JSZip();

  // 1. Root Readme
  zip.file(
    "ИНСТРУКЦИЯ_ПО_УСТАНОВКЕ_И_СБОРКЕ_APK.txt",
    `========================================================================
SITRAK S7H / C7H DIAGNOSTICS & TUNING - ПАКЕТ ДЛЯ СБОРКИ APK
========================================================================

Пакет подготовлен для генерации готового файла .APK через Microsoft PWABuilder,
Bubblewrap TWA или локальную сборку в Android Studio / Capacitor.
Поддерживает Android 8.0 - 15+, Bluetooth ELM327 / ELM375, J1939 протоколы,
Bosch EDC17CV44, ZF TraXon AMT и WABCO EBS3.

========================================================================
СПОСОБ 1: ГЕНЕРАЦИЯ .APK В 1 КЛИК ЧЕРЕЗ PWABUILDER (РЕКОМЕНДУЕТСЯ)
========================================================================
1. Откройте в браузере официальный сервис:
   https://www.pwabuilder.com/app?url=${encodeURIComponent(appUrl)}

2. Сервис проверит манифест (Готовность 100/100) и покажет зеленые галочки.

3. Нажмите кнопку "Package for Stores" -> выберите "Android".

4. В параметрах укажите:
   - Package ID: ru.sitrak.obd.diagnostics
   - App Name: Sitrak S7H Diagnostics
   - Version: 1.0.0 (VersionCode: 100)
   - Signing: "Generate New Key" или "Test Key"

5. Нажмите "Download APK Package" -> вы получите готовый установочный .apk файл!

========================================================================
СПОСОБ 2: СБОРКА ЧЕРЕЗ PWABUILDER CLI (В КОМАНДНОЙ СТРОКЕ)
========================================================================
Запустите файл "pwabuilder_cli_build.bat" (на Windows) или выполните команду:
npx @pwabuilder/cli "${appUrl}" -o ./sitrak_apk_output

========================================================================
СПОСОБ 3: ПРЯМАЯ УСТАНОВКА НА СМАРТФОН БЕЗ ПК
========================================================================
1. Откройте ссылку на смартфоне в Google Chrome или Яндекс.Браузере:
   ${appUrl}
2. Нажмите меню (3 точки) -> "Установить приложение" (или "Добавить на главный экран").
3. Android скомпилирует WebAPK файл и добавит полноэкранную иконку на рабочий стол.

========================================================================
`
  );

  // 2. PWABuilder Options JSON (for PWABuilder CLI & Cloud)
  const pwaBuilderOptions = {
    packageId: "ru.sitrak.obd.diagnostics",
    name: "Sitrak S7H Diagnostics & Tuning",
    shortName: "Sitrak OBD",
    description: "Android приложение для диагностики, считывания кодов DTC J1939, телеметрии CAN и настройки тягачей Sitrak S7H / C7H 480 через Bluetooth адаптеры ELM327 / ELM375.",
    version: "1.0.0",
    versionCode: 100,
    host: appUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    startUrl: "/",
    display: "standalone",
    orientation: "landscape-primary",
    themeColor: "#020617",
    navigationColor: "#020617",
    backgroundColor: "#020617",
    enableNotifications: false,
    shortcuts: [
      { name: "Панель приборов", url: "/?tab=dashboard" },
      { name: "Сканер DTC", url: "/?tab=dtc" },
      { name: "АКПП TraXon", url: "/?tab=tuning" }
    ],
    features: {
      bluetooth: true,
      webBluetooth: true,
      location: true
    },
    webManifestUrl: `${appUrl.replace(/\/$/, "")}/manifest.json`
  };

  zip.file("pwabuilder/pwabuilder-options.json", JSON.stringify(pwaBuilderOptions, null, 2));

  // 3. TWA Manifest (Trusted Web Activity config for Google Play / Bubblewrap)
  const twaManifest = {
    packageId: "ru.sitrak.obd.diagnostics",
    host: appUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    name: "Sitrak S7H Diagnostics",
    launcherName: "Sitrak OBD",
    themeColor: "#020617",
    navigationColor: "#020617",
    backgroundColor: "#020617",
    enableNotifications: false,
    startUrl: "/",
    iconUrl: `${appUrl.replace(/\/$/, "")}/icon-512.png`,
    maskableIconUrl: `${appUrl.replace(/\/$/, "")}/icon-512.png`,
    appVersionName: "1.0.0",
    appVersionCode: 100,
    orientation: "landscape",
    useCustomTabs: true,
    fullScreen: false
  };

  zip.file("pwabuilder/twa-manifest.json", JSON.stringify(twaManifest, null, 2));

  // 4. PWABuilder CLI Quick Launchers
  zip.file(
    "pwabuilder/build_apk_pwabuilder_cli.bat",
    `@echo off
echo ========================================================================
echo Сборка Android APK с помощью PWABuilder CLI...
echo Ссылка: ${appUrl}
echo ========================================================================
npx @pwabuilder/cli "${appUrl}" -o ./sitrak_apk_release
echo.
echo Сборка завершена. Готовый APK находится в папке sitrak_apk_release
pause
`
  );

  zip.file(
    "pwabuilder/build_apk_pwabuilder_cli.sh",
    `#!/usr/bin/env bash
echo "Сборка Android APK с помощью PWABuilder CLI..."
npx @pwabuilder/cli "${appUrl}" -o ./sitrak_apk_release
echo "Готово! APK находится в папке sitrak_apk_release"
`
  );

  // 5. Android Manifest with full Bluetooth & Hardware permissions
  const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ru.sitrak.obd.diagnostics">

    <!-- Разрешения для Bluetooth ELM327 / ELM375 и USB OTG адаптеров -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <uses-feature android:name="android.hardware.bluetooth" android:required="true" />
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
    <uses-feature android:name="android.hardware.usb.host" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Sitrak S7H Diagnostics"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="Sitrak S7H"
            android:launchMode="singleTask"
            android:screenOrientation="sensorLandscape"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  zip.file("android_project/app/src/main/AndroidManifest.xml", androidManifestXml);

  // 6. Capacitor Config
  zip.file(
    "android_project/capacitor.config.json",
    JSON.stringify(
      {
        appId: "ru.sitrak.obd.diagnostics",
        appName: "Sitrak S7H Diagnostics",
        webDir: "dist",
        bundledWebRuntime: false,
        server: {
          url: appUrl,
          cleartext: true,
          androidScheme: "https"
        },
        android: {
          allowMixedContent: true,
          captureInput: true,
          webContentsDebuggingEnabled: true
        }
      },
      null,
      2
    )
  );

  // 7. Web Manifest
  zip.file(
    "web_assets/manifest.json",
    JSON.stringify(
      {
        id: "ru.sitrak.obd.diagnostics",
        name: "Sitrak S7H Diagnostics & Tuning",
        short_name: "Sitrak OBD",
        description: "Android приложение для диагностики, считывания кодов DTC J1939, телеметрии CAN и настройки тягачей Sitrak S7H / C7H 480 через Bluetooth адаптеры ELM327 / ELM375.",
        lang: "ru",
        dir: "ltr",
        start_url: appUrl,
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "fullscreen"],
        orientation: "landscape-primary",
        background_color: "#020617",
        theme_color: "#020617",
        categories: ["auto", "utilities", "productivity", "transportation"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      null,
      2
    )
  );

  // 8. Quick APK Build Script for Windows / Mac / Linux
  zip.file(
    "android_project/build_apk_windows.bat",
    `@echo off
echo ===================================================
echo Сборка APK для Sitrak S7H Diagnostics
echo ===================================================
call npm install
call npm run build
call npx cap add android
call npx cap sync android
echo Открытие Android Studio...
call npx cap open android
pause
`
  );

  zip.file(
    "android_project/build_apk_linux_mac.sh",
    `#!/usr/bin/env bash
echo "Сборка APK для Sitrak S7H Diagnostics..."
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
`
  );

  // 9. Generate Zip and trigger instant download
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "sitrak-s7h-pwabuilder-apk-bundle.zip");
}

