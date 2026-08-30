"use client";

import { useState } from "react";
import DeviceFrame from "@/components/DeviceFrame";

const devices = [
  { id: "desktop", label: "Navigateur desktop" },
  { id: "iphone15", label: "iPhone 15" },
  { id: "iphone15ProMax", label: "iPhone 15 Pro Max" },
  { id: "iphone12Mini", label: "iPhone 12 mini" },
  { id: "iphoneSE", label: "iPhone SE" },
  { id: "pixel8", label: "Pixel 8" },
  { id: "pixel9", label: "Pixel 9" },
  { id: "galaxyS23", label: "Galaxy S23" },
  { id: "galaxyA54", label: "Galaxy A54" },
  { id: "xiaomi14", label: "Xiaomi 14" },
];

export default function DevicePreviewPage() {
  const [device, setDevice] = useState("desktop");
  const [orientation, setOrientation] = useState("landscape");
  const [scale, setScale] = useState(0.82);

  return (
    <main className="device-preview-page">
      <section className="device-preview-toolbar" aria-label="Contrôles de prévisualisation">
        <div>
          <p className="device-preview-eyebrow">LynoraLink / aperçu</p>
          <h1>Aperçu navigateur desktop</h1>
          <p className="device-preview-subtitle">Visualisez le feed dans une fenêtre desktop isolée.</p>
        </div>

        <div className="device-preview-controls">
          <label>
            Appareil
            <select value={device} onChange={(event) => setDevice(event.target.value)}>
              {devices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Orientation
            <select value={orientation} onChange={(event) => setOrientation(event.target.value)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Paysage</option>
            </select>
          </label>
          <label>
            Échelle
            <input type="range" min="0.55" max="1" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            <span>{Math.round(scale * 100)}%</span>
          </label>
        </div>
      </section>

      <section className="device-preview-stage">
        <DeviceFrame
          src="/feed?view=feed&devicePreview=1"
          device={device}
          orientation={orientation}
          scale={scale}
          label="Aperçu LynoraLink"
        />
      </section>

      <style jsx>{`
        .device-preview-page {
          min-height: 100dvh;
          padding: 32px clamp(16px, 4vw, 56px);
          background: #eff4f9;
          color: #132433;
          font-family: "Inter", sans-serif;
        }
        .device-preview-toolbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 28px;
          max-width: 1180px;
          margin: 0 auto;
          padding-bottom: 24px;
          border-bottom: 1px solid #dce7f1;
        }
        .device-preview-eyebrow {
          margin: 0 0 7px;
          color: #a9781f;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          color: #0f3352;
          font-family: "Sora", sans-serif;
          font-size: 28px;
          line-height: 1.15;
        }
        .device-preview-subtitle {
          margin: 8px 0 0;
          color: #5c7488;
          font-size: 14px;
        }
        .device-preview-controls {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #5c7488;
          font-size: 11px;
          font-weight: 700;
        }
        select {
          min-width: 132px;
          padding: 9px 30px 9px 10px;
          border: 1px solid #cbd9e5;
          border-radius: 8px;
          background: #fff;
          color: #132433;
          font: inherit;
          font-size: 13px;
        }
        input[type="range"] {
          width: 130px;
          accent-color: #2c6ba0;
        }
        label > span {
          color: #0f3352;
          font-size: 12px;
          text-align: right;
        }
        .device-preview-stage {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: calc(100dvh - 150px);
          padding: 28px 0;
        }
        @media (max-width: 700px) {
          .device-preview-page { padding: 20px 12px; }
          .device-preview-toolbar { align-items: stretch; flex-direction: column; gap: 18px; }
          h1 { font-size: 23px; }
          .device-preview-controls { align-items: stretch; }
          .device-preview-controls label { flex: 1 1 130px; }
          .device-preview-stage { min-height: 0; padding-top: 24px; }
        }
      `}</style>
    </main>
  );
}
