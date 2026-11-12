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
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
            />
            {image && (
              <img
                src={image.preview}
                alt="Preview"
                className="mt-3 max-h-52 rounded-lg border border-slate-700 object-contain"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              2. Mô tả cấu tạo cụm máy & thông số kích thước chính
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Thiết kế máy ép khung chữ H: Tấm đế dưới 800x600x40mm. Hai trụ dẫn hướng tròn đường kính 60mm cao 1200mm đặt cách tâm 300mm về hai bên trái phải. Xà ngang đỉnh máy 800x300x60mm đặt trên đầu hai trụ. Chính giữa xà ngang gắn xi lanh tròn đường kính 140mm dài 350mm hướng xuống dưới, đầu xi lanh gắn bàn ép kích thước 300x300x30mm..."
              className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-slate-100 focus:border-amber-400 focus:outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition disabled:opacity-50 shadow-lg"
          >
            {loading
              ? "Đang tính toán & Dựng máy..."
              : `Dựng cụm máy trên ${software === "inventor" ? "Autodesk Inventor" : "SolidWorks"}`}
          </button>
        </form>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-sm flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-400">Trạng thái: </span>
            <span className="text-slate-100">{status}</span>
          </div>
          <span className="text-xs text-slate-500">Local Port: 5000</span>
        </div>

        {generatedCode && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-400">
                Kịch bản lắp ráp & Tọa độ AI đã xuất:
              </h3>
              <span className="text-xs text-slate-500">
                File lưu tại: C:\AI_CAD_Projects\
              </span>
            </div>
            <pre className="p-4 rounded-lg bg-black text-emerald-400 text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {generatedCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
