import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { DetectDiseaseBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/disease/detect", async (req, res): Promise<void> => {
  const parsed = DetectDiseaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg", language = "en" } = parsed.data;

  const isHindi = language === "hi";

  const prompt = isHindi
    ? `आप भारत में चावल की बीमारियों के विशेषज्ञ कृषि वैज्ञानिक हैं। इस चावल के पौधे की छवि का विश्लेषण करें और किसी भी बीमारी की पहचान करें।

केवल इस सटीक JSON प्रारूप में उत्तर दें:
{
  "diseaseName": "बीमारी का नाम हिंदी में, या 'स्वस्थ चावल का पौधा'",
  "isHealthy": true या false,
  "confidence": "उच्च" या "मध्यम" या "कम",
  "severity": "हल्की" या "मध्यम" या "गंभीर" या null,
  "description": "1-2 वाक्यों में विवरण हिंदी में",
  "symptoms": ["लक्षण 1", "लक्षण 2"],
  "treatment": {
    "immediate": "किसान को तुरंत क्या करना चाहिए",
    "chemical": "रासायनिक दवा का सुझाव (नाम सहित)",
    "organic": "स्थानीय सामग्री से प्राकृतिक उपचार",
    "prevention": "अगली फसल में रोकथाम के उपाय"
  }
}

भारत में चावल की सामान्य बीमारियाँ: ब्लास्ट (झुलसा), भूरा धब्बा, जीवाणु झुलसा, शीथ ब्लाइट, झूठी कंड, नेक रॉट, टुंग्रो वायरस।

यदि पौधा स्वस्थ है, तो isHealthy को true रखें, severity को null, और treatment में देखभाल की सलाह दें।`
    : `You are an expert agricultural scientist specializing in rice diseases in India. Analyze this rice plant image and identify any diseases present.

Respond ONLY with a valid JSON object in this exact format:
{
  "diseaseName": "Name of disease or 'Healthy Rice Plant'",
  "isHealthy": true or false,
  "confidence": "High" or "Medium" or "Low",
  "severity": "Mild" or "Moderate" or "Severe" or null,
  "description": "Brief 1-2 sentence description of what you observe",
  "symptoms": ["symptom 1", "symptom 2"],
  "treatment": {
    "immediate": "What the farmer should do immediately",
    "chemical": "Chemical fungicide/pesticide recommendation with name",
    "organic": "Natural/organic treatment using locally available materials",
    "prevention": "How to prevent this disease in the next crop"
  }
}

Common Indian rice diseases to look for: Blast (Magnaporthe oryzae), Brown Spot (Helminthosporium oryzae), Bacterial Blight (Xanthomonas oryzae), Sheath Blight (Rhizoctonia solani), False Smut (Ustilaginoidea virens), Neck Rot, Tungro Virus.

If the plant is healthy, set isHealthy to true, severity to null, and provide preventive care advice in the treatment fields.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    result = JSON.parse(jsonMatch[0]);
  } catch {
    req.log.error({ content }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "Failed to parse disease analysis result" });
    return;
  }

  res.json(result);
});

export default router;
