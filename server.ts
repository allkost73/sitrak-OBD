import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI diagnosis");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS Middleware for PWABuilder, Service Workers, and Cross-Origin Inspections
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });

  app.use(express.json({ limit: "10mb" }));

  // Explicit PWA Manifest Endpoint (JSON & Webmanifest)
  app.get(["/manifest.json", "/manifest.webmanifest", "/site.webmanifest", "/app.webmanifest"], (_req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    res.sendFile(manifestPath);
  });

  // Explicit Service Worker Endpoint
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    const swPath = path.join(process.cwd(), "public", "sw.js");
    res.sendFile(swPath);
  });

  // Digital Asset Links for Android TWA / PWABuilder package verification
  app.get(["/.well-known/assetlinks.json", "/assetlinks.json"], (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "ru.sitrak.obd.diagnostics",
          sha256_cert_fingerprints: []
        }
      }
    ]);
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Sitrak S7H Diagnostics", timestamp: new Date().toISOString() });
  });

  // AI Diagnostic Analysis Endpoint
  app.post("/api/ai-diagnose", async (req, res) => {
    try {
      const { truckModel, engine, dtcList, sensorSnapshot, userQuestion } = req.body;

      const ai = getAi();
      const prompt = `Ты — ведущий инженер-диагност и мастер по ремонту тяжелых китайских грузовиков Sinotruk SITRAK S7H / C7H (двигатели MC11, MC13 MAN D26, 480 л.с., ЭБУ Bosch EDC17CV44, КПП ZF TraXon, система нейтрализации DeNOx 2.2 / Bosch Denoxtronic, тормозная система WABCO EBS3, блок CBCU).

ДАННЫЕ АВТОМОБИЛЯ:
- Модель: ${truckModel || "SITRAK S7H 480 4x2 / 6x4"}
- Двигатель: ${engine || "Sinotruk MC13.48-50 (480 л.с., Евро-5/6, Common Rail Bosch)"}

ОШИБКИ DTC (SPN-FMI / OBD-II):
${dtcList && dtcList.length > 0 ? JSON.stringify(dtcList, null, 2) : "Активных кодов ошибок нет"}

СНИМОК ТЕЛЕМЕТРИИ CAN-ШИНЫ:
${sensorSnapshot ? JSON.stringify(sensorSnapshot, null, 2) : "Стандартные параметры холостого хода"}

ВОПРОС / СИМПТОМЫ ОТ ВОДИТЕЛЯ ИЛИ МЕХАНИКА:
"${userQuestion || "Проанализируй состояние автомобиля по текущим ошибкам и показаниям датчиков, укажи вероятные неисправности и пошаговый план устранения."}"

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Дай четкую профессиональную оценку ситуации на русском языке.
2. Расшифруй каждый код ошибки применительно к проводке, датчикам и исполнительным механизмам Sitrak S7H.
3. Укажи типичные "болячки" Sitrak S7H по этой проблеме (например, перетертая коса возле рамы/кабины, окислы разъема датчика NOx, заклинивший дозатор мочевины, датчик перепада давления DPF, клапан ТНВД).
4. Предоставь пошаговый план проверки с замерами мультиметром/манометром (номера пинов, опорное напряжение 5V/24V, сопротивление датчиков).
5. Дай рекомендации по настройке и калибровке через ELM327 / ELM375.
Ответ структурируй красиво с маркированными списками и четкими выводами.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        success: true,
        analysis: response.text,
      });
    } catch (err: any) {
      console.error("AI Diagnosis error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Ошибка при обращении к AI-диагносту",
      });
    }
  });

  // AI Quick Code Lookup
  app.post("/api/ai-lookup-code", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const ai = getAi();
      const prompt = `Расшифруй код ошибки "${code}" для грузовика Sitrak S7H / C7H 480 (Sinotruk / MAN MC13).
Укажи:
1. Название ошибки (SPN, FMI или P-код / U-код).
2. За какой блок отвечает (EDC17, TraXon, EBS, CBCU, SCR).
3. Причина появления на Ситраке.
4. Где физически находится датчик/узел на тягаче.
5. Как устранить (быстрый ремонт в дороге и на сервисе).
Будь кратким, конкретным и практичным.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        success: true,
        result: response.text,
      });
    } catch (err: any) {
      console.error("AI Lookup error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Не удалось расшифровать код через AI",
      });
    }
  });

  // Google Drive Export simulation / file generation proxy
  app.post("/api/export-report", async (req, res) => {
    try {
      const reportData = req.body;
      // Generate formatted JSON / text report
      const reportContent = {
        title: `Диагностический отчет Sitrak S7H 480 - ${new Date().toLocaleDateString("ru-RU")}`,
        timestamp: new Date().toISOString(),
        vin: reportData.vin || "LZZ5CCVE9PN123456",
        mileage: reportData.mileage || 184500,
        ecuInfo: reportData.ecuInfo || {
          engine: "Bosch EDC17CV44 (MC13.48-50)",
          gearbox: "ZF 12TX2620TD TraXon",
          brakes: "WABCO EBS3",
          body: "CBCU-V3.2",
          scr: "DeNOx 2.2",
        },
        dtcCount: reportData.dtcs?.length || 0,
        dtcs: reportData.dtcs || [],
        telemetry: reportData.telemetry || {},
        configurations: reportData.configurations || {},
        notes: reportData.notes || "Плановая проверка автопоезда",
      };

      res.json({
        success: true,
        reportId: "SITRAK-" + Date.now().toString(36).toUpperCase(),
        report: reportContent,
        downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(reportContent, null, 2))}`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sitrak S7H Diagnostic Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
