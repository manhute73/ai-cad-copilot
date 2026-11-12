import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trên Vercel" },
        { status: 500 }
      );
    }

    const { prompt, imageBase64, mimeType } = await req.json();

    // 1. Tự động lấy danh sách các model ĐANG HOẠT ĐỘNG thực tế trên chính API Key của bạn
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const listData = await listRes.json();

    if (!listRes.ok) {
      return NextResponse.json(
        { error: listData.error?.message || "API Key không hợp lệ" },
        { status: 500 }
      );
    }

    // Lọc ra các model hỗ trợ generateContent, ưu tiên bản flash cho tốc độ tức thì
    const validModels = (listData.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => m.name.replace("models/", ""))
      .filter((name) => !name.includes("embedding") && !name.includes("aqa"));

    validModels.sort((a, b) => {
      const aFlash = a.includes("flash") ? 0 : 1;
      const bFlash = b.includes("flash") ? 0 : 1;
      return aFlash - bFlash;
    });

    if (validModels.length === 0) {
      return NextResponse.json(
        { error: "Tài khoản chưa kích hoạt model nào trên Google AI Studio" },
        { status: 500 }
      );
    }

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

    const parts = [];
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      });
    }
    parts.push({
      text: `${systemInstruction}\n\nYêu cầu thiết kế: ${
        prompt || "Dựng cụm chi tiết cơ khí theo ảnh phác thảo."
      }`,
    });

    // 2. Gọi lần lượt các model sống cho đến khi lấy được kết quả (bỏ qua ngay nếu model nào bận 503)
    let rawText = "";
    let lastError = "";

    for (const modelName of validModels.slice(0, 4)) {
      const genRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      const genData = await genRes.json();
      if (genRes.ok && genData.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = genData.candidates[0].content.parts[0].text;
        break;
      } else {
        lastError = genData.error?.message || `Lỗi từ ${modelName}`;
      }
    }

    if (!rawText) {
      return NextResponse.json(
        { error: lastError || "Không nhận được phản hồi từ AI" },
        { status: 500 }
      );
    }

    const cleanCode = rawText
      .replace(/```python/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({ code: cleanCode });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
