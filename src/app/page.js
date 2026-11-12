"use client";
import { useState } from "react";

export default function UniversalCadCopilot() {
  const [software, setSoftware] = useState("inventor");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [status, setStatus] = useState("Sẵn sàng kết nối tới máy trạm...");
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage({
        data: reader.result.split(",")[1],
        type: file.type,
        preview: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleBuild = async (e) => {
    e.preventDefault();
    if (!prompt && !image) return;

    setLoading(true);
    setStatus("1/2: Kỹ sư AI đang phân tích kết cấu & tính tọa độ lắp ráp...");

    try {
      const resAi = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageBase64: image?.data,
          mimeType: image?.type,
        }),
      });
      const dataAi = await resAi.json();
      if (dataAi.error) throw new Error(dataAi.error);

      setGeneratedCode(dataAi.code);
      setStatus(`2/2: Đang truyền lệnh dựng máy sang ${software.toUpperCase()}...`);

      const resCad = await fetch("http://127.0.0.1:5000/build-machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          software: software,
          code: dataAi.code,
        }),
      });
      const dataCad = await resCad.json();

      if (dataCad.status === "success") {
        setStatus(`✅ ${dataCad.message}`);
      } else {
        setStatus(`❌ Lỗi CAD: ${dataCad.message}`);
      }
    } catch (err) {
      setStatus(`❌ Lỗi kết nối: ${err.message} (Kiểm tra xem đã chạy cad_bridge.py chưa)`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">
              AI Machine Architect → Live CAD
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Tự động thiết kế & lắp ráp cụm máy trực tiếp trên Inventor hoặc SolidWorks
            </p>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSoftware("inventor")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                software === "inventor"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Autodesk Inventor
            </button>
            <button
              type="button"
              onClick={() => setSoftware("solidworks")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                software === "solidworks"
                  ? "bg-red-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SolidWorks
            </button>
          </div>
        </div>

        <form onSubmit={handleBuild} className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              1. Ảnh phác thảo / Ảnh máy tham khảo (Tùy chọn)
            </label>
            <input
              type="file"
              accept="image/*"
              on