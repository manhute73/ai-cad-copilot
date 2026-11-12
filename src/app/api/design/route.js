import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "gemini-3-flash-preview",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req) {
  try {
    const { prompt, imageBase64, mimeType } = await req.json();

    const systemInstruction = `Bạn là Kỹ sư Thiết kế Máy chuyên nghiệp (Mechanical Design Architect).
Nhiệm vụ: Phân tích yêu cầu hoặc bản vẽ phác thảo, tính toán chính xác kích thước (đơn vị mm) và tọa độ lắp ráp (X, Y, Z trong hệ tọa độ Z hướng lên trên, gốc (0,0,0) nằm ở tâm mặt sàn).
Chỉ xuất ra đoạn mã Python sử dụng đối tượng 'builder' có sẵn với 3 hàm duy nhất:
1. path = builder.create_box_part(part_name, length_mm, width_mm, height_mm)
2. path = builder.create_cylinder_part(part_name, diameter_mm, height_mm)
3. builder.place_part(path, x_mm, y_mm, z_mm)

Quy tắc bắt buộc:
- Chỉ trả về mã Python thuần túy, KHÔNG dùng markdown \`\`\`python, KHÔNG giải thích thêm.
- Tên chi tiết (part_name) viết không dấu, nối bằng dấu gạch dưới (ví dụ: Tam_De, Tru_Dan_Huong).
- Đảm bảo các chi tiết lắp khít với nhau theo trục Z (ví dụ: tấm đế dày 40mm đặt tại z=0 thì chi tiết đặt trên mặt tấm đế phải có z=40).`;

    const contents = [];
    if (imageBase64 && mimeType) {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      });
    }
    contents.push(prompt || "Dựng cụm chi tiết cơ khí theo ảnh phác thảo.");

    let response = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      for (const modelName of MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.1,
            },
          });
          if (response?.text) break;
        } catch (err) {
          lastError = err;
          await sleep(1500);
          continue;
        }
      }
      if (response?.text) break;
    }

    if (!response?.text) {
      throw lastError || new Error("Máy chủ AI đang bận, vui lòng bấm thử lại sau vài giây.");
    }

    let cleanCode = response.text
      .replace(/```python/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({ code: cleanCode });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý từ Gemini API" },
      { status: 500 }
    );
  }
}
