"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  type ColorParams,
  PRESETS,
  applyTable,
  buildPreviewTable,
} from "@/lib/effects/color";
import {
  ANCHOR_OPTIONS,
  STICKERS,
  type Sticker,
  drawStickerOnFace,
  faceFrame,
  imageSticker,
} from "@/lib/effects/stickers";
import { buildBundle, download, slug } from "@/lib/effects/export";

// Mesma versão do pacote em package.json: o wasm precisa casar com o JS.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MAX_SIDE = 960;

type Source =
  | { kind: "camera"; el: HTMLVideoElement }
  | { kind: "foto"; el: HTMLImageElement };

const SLIDERS: { key: keyof ColorParams; label: string; min: number }[] = [
  { key: "brilho", label: "Brilho", min: -1 },
  { key: "contraste", label: "Contraste", min: -1 },
  { key: "saturacao", label: "Saturação", min: -1 },
  { key: "temperatura", label: "Temperatura", min: -1 },
  { key: "matiz", label: "Matiz (verde ↔ magenta)", min: -1 },
  { key: "desbotado", label: "Desbotado", min: 0 },
];

const card =
  "flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
const title = "text-sm font-medium text-zinc-900 dark:text-zinc-50";
const muted = "text-xs text-zinc-500 dark:text-zinc-400";
const button =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800";
const primary =
  "rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível abrir a imagem"));
    img.src = URL.createObjectURL(file);
  });
}

export default function TiktokEffectStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<Source | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const tableRef = useRef<Uint8Array | null>(null);
  const stickersRef = useRef<Sticker[]>([]);
  const pausedRef = useRef(false);

  const [nome, setNome] = useState("Meu efeito");
  const [presetId, setPresetId] = useState("glow");
  const [params, setParams] = useState<ColorParams>(PRESETS[1].params);
  const [filtroAtivo, setFiltroAtivo] = useState(true);
  const [ativos, setAtivos] = useState<string[]>(["blush", "brilhos"]);
  const [customImg, setCustomImg] = useState<HTMLImageElement | null>(null);
  const [customAnchor, setCustomAnchor] = useState("topo");
  const [customSize, setCustomSize] = useState(0.6);
  const [fonte, setFonte] = useState<Source["kind"] | null>(null);
  const [status, setStatus] = useState("Ligue a câmera ou envie uma foto de rosto para ver a prévia.");
  const [exportando, setExportando] = useState(false);

  const stickers = useMemo(() => {
    const list = STICKERS.filter((s) => ativos.includes(s.id));
    if (customImg) list.push(imageSticker(customImg, customAnchor, customSize));
    return list;
  }, [ativos, customImg, customAnchor, customSize]);

  useEffect(() => {
    tableRef.current = filtroAtivo ? buildPreviewTable(params) : null;
  }, [params, filtroAtivo]);

  useEffect(() => {
    stickersRef.current = stickers;
  }, [stickers]);

  useEffect(() => {
    const video = videoRef.current;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (pausedRef.current) return;
      const src = sourceRef.current;
      const canvas = canvasRef.current;
      if (!src || !canvas) return;
      if (src.kind === "camera" && src.el.readyState < 2) return;

      const sw = src.kind === "camera" ? src.el.videoWidth : src.el.naturalWidth;
      const sh = src.kind === "camera" ? src.el.videoHeight : src.el.naturalHeight;
      if (!sw || !sh) return;
      const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
      const w = Math.round(sw * scale);
      const h = Math.round(sh * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(src.el, 0, 0, w, h);

      const table = tableRef.current;
      if (table) {
        const img = ctx.getImageData(0, 0, w, h);
        applyTable(img.data, table);
        ctx.putImageData(img, 0, 0);
      }

      const landmarker = landmarkerRef.current;
      if (landmarker && stickersRef.current.length) {
        const face = landmarker.detectForVideo(src.el, performance.now()).faceLandmarks[0];
        if (face) {
          const frame = faceFrame(face, w, h);
          for (const s of stickersRef.current) drawStickerOnFace(ctx, s, frame);
        }
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  async function ensureLandmarker() {
    if (landmarkerRef.current) return;
    setStatus("Carregando o rastreamento de rosto…");
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  }

  function stopCamera() {
    const video = videoRef.current;
    (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
  }

  async function startCamera() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stopCamera();
      video.srcObject = stream;
      await video.play();
      sourceRef.current = { kind: "camera", el: video };
      setFonte("camera");
      await ensureLandmarker();
      setStatus("Câmera ligada.");
    } catch (e) {
      setStatus(`Não foi possível ligar a câmera: ${(e as Error).message}`);
    }
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    try {
      const img = await loadImage(file);
      stopCamera();
      sourceRef.current = { kind: "foto", el: img };
      setFonte("foto");
      await ensureLandmarker();
      setStatus("Foto carregada.");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  async function chooseCustomSticker(file: File | undefined) {
    if (!file) return;
    try {
      setCustomImg(await loadImage(file));
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  function snapshot() {
    canvasRef.current?.toBlob((b) => b && download(b, `${slug(nome)}-previa.png`), "image/png");
  }

  async function exportar() {
    setExportando(true);
    // A prévia ocupa a thread principal; pausada, o pacote sai bem mais rápido.
    pausedRef.current = true;
    try {
      const blob = await buildBundle(nome, params, filtroAtivo, stickers);
      download(blob, `${slug(nome)}.zip`);
    } catch (e) {
      setStatus(`Erro ao exportar: ${(e as Error).message}`);
    } finally {
      pausedRef.current = false;
      setExportando(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Estúdio de efeitos para TikTok
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Monte um filtro de câmera (cor + adesivos no rosto), teste na webcam e baixe o pacote
          para publicar pelo Effect House, o programa oficial de efeitos do TikTok.
        </p>
        <Link
          href="/efeitos/sorteios"
          className="mt-2 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Sorteios prontos (os que mais rendem no programa de recompensas) →
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section className={card}>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={startCamera}>
              Ligar câmera
            </button>
            <label className={`${button} cursor-pointer`}>
              Usar foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => choosePhoto(e.target.files?.[0])}
              />
            </label>
            <button className={button} onClick={snapshot} disabled={!fonte}>
              Baixar prévia (PNG)
            </button>
          </div>
          <p className={muted}>{status}</p>
          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-950">
            <video ref={videoRef} className="hidden" muted playsInline />
            <canvas
              ref={canvasRef}
              className={`max-h-[70vh] max-w-full ${fonte ? "" : "hidden"}`}
              style={fonte === "camera" ? { transform: "scaleX(-1)" } : undefined}
            />
            {!fonte && <span className={muted}>Sem prévia ainda</span>}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className={card}>
            <label className={title} htmlFor="nome-efeito">
              Nome do efeito
            </label>
            <input
              id="nome-efeito"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </section>

          <section className={card}>
            <label className={`${title} flex items-center gap-2`}>
              <input
                type="checkbox"
                checked={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.checked)}
              />
              Filtro de cor
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  disabled={!filtroAtivo}
                  onClick={() => {
                    setPresetId(p.id);
                    setParams(p.params);
                  }}
                  className={`${button} ${presetId === p.id ? "border-zinc-900 dark:border-zinc-100" : ""}`}
                >
                  {p.nome}
                </button>
              ))}
            </div>
            {SLIDERS.map((s) => (
              <label key={s.key} className="flex flex-col gap-1">
                <span className={muted}>
                  {s.label}: {params[s.key].toFixed(2)}
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={1}
                  step={0.01}
                  disabled={!filtroAtivo}
                  value={params[s.key]}
                  onChange={(e) => {
                    setPresetId("");
                    setParams({ ...params, [s.key]: Number(e.target.value) });
                  }}
                />
              </label>
            ))}
          </section>

          <section className={card}>
            <span className={title}>Adesivos no rosto</span>
            {STICKERS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={ativos.includes(s.id)}
                  onChange={(e) =>
                    setAtivos(e.target.checked ? [...ativos, s.id] : ativos.filter((id) => id !== s.id))
                  }
                />
                {s.nome}
              </label>
            ))}
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <span className={muted}>Seu adesivo (PNG com fundo transparente, ex.: logo)</span>
              <div className="flex flex-wrap gap-2">
                <label className={`${button} cursor-pointer`}>
                  {customImg ? "Trocar imagem" : "Enviar imagem"}
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="hidden"
                    onChange={(e) => chooseCustomSticker(e.target.files?.[0])}
                  />
                </label>
                {customImg && (
                  <button className={button} onClick={() => setCustomImg(null)}>
                    Remover
                  </button>
                )}
              </div>
              {customImg && (
                <>
                  <select
                    value={customAnchor}
                    onChange={(e) => setCustomAnchor(e.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {ANCHOR_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                  <label className="flex flex-col gap-1">
                    <span className={muted}>Tamanho: {Math.round(customSize * 100)}% do rosto</span>
                    <input
                      type="range"
                      min={0.2}
                      max={1.5}
                      step={0.05}
                      value={customSize}
                      onChange={(e) => setCustomSize(Number(e.target.value))}
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          <button
            className={primary}
            onClick={exportar}
            disabled={exportando || (!filtroAtivo && stickers.length === 0)}
          >
            {exportando ? "Gerando pacote…" : "Baixar pacote para o Effect House (.zip)"}
          </button>
          <p className={muted}>
            O pacote traz as texturas (LUT do filtro e PNGs dos adesivos) e um LEIAME com o passo a
            passo de montagem e publicação no Effect House.
          </p>
        </aside>
      </div>
    </main>
  );
}
