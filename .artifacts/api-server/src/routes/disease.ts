import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { DetectDiseaseBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;
if (!PLANTNET_API_KEY) {
  logger.warn("PLANTNET_API_KEY is not set — PlantNet identification will be skipped");
}

async function identifyWithPlantNet(
  imageBase64: string,
  mimeType: string
): Promise<{ species: string; score: number } | null> {
  if (!PLANTNET_API_KEY) return null;

  try {
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([imageBuffer], { type: mimeType });

    const form = new FormData();
    form.append("images", blob, "leaf.jpg");
    form.append("organs", "leaf");

    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}&lang=en&nb-results=1`;
    const response = await fetch(url, { method: "POST", body: form });

    if (!response.ok) {
      const text = await response.text();
      logger.warn({ status: response.status, body: text }, "PlantNet API non-OK response");
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        species?: { scientificNameWithoutAuthor?: string };
        score?: number;
      }>;
    };

    const top = data.results?.[0];
    if (!top) return null;

    return {
      species: top.species?.scientificNameWithoutAuthor ?? "Unknown",
      score: top.score ?? 0,
    };
  } catch (err) {
    logger.warn({ err }, "PlantNet identification failed");
    return null;
  }
}

router.post("/disease/detect", async (req, res): Promise<void> => {
  const parsed = DetectDiseaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg" } = parsed.data;

  // Step 1: Identify with PlantNet
  const plantNetResult = await identifyWithPlantNet(imageBase64, mimeType);
  const plantNetContext = plantNetResult
    ? `PlantNet has identified the plant as "${plantNetResult.species}" (confidence: ${(plantNetResult.score * 100).toFixed(1)}%). Use this as additional context when assessing the disease.`
    : "PlantNet identification was unavailable for this image.";

  req.log.info({ plantNetResult }, "PlantNet result");

  // Step 2: OpenAI bilingual disease analysis
  const prompt = `You are an expert agricultural scientist specializing in rice diseases in India.
Analyze this rice plant image and provide a bilingual disease assessment in both English AND Hindi.

${plantNetContext}

Respond ONLY with a valid JSON object in this EXACT format — no extra text outside the JSON:
{
  "diseaseName": "Disease name in English (e.g. 'Rice Blast') or 'Healthy Rice Plant'",
  "diseaseNameHi": "हिंदी में बीमारी का नाम (जैसे 'धान का झुलसा') या 'स्वस्थ धान का पौधा'",
  "isHealthy": true or false,
  "confidence": "High" or "Medium" or "Low",
  "severity": "Mild" or "Moderate" or "Severe" or null,
  "description": "1-2 sentences describing what you observe in English",
  "descriptionHi": "हिंदी में 1-2 वाक्यों में जो दिखा उसका विवरण",
  "symptoms": ["English symptom 1", "English symptom 2"],
  "symptomsHi": ["हिंदी लक्षण 1", "हिंदी लक्षण 2"],
  "treatment": {
    "immediate": "Immediate action the farmer should take (English)",
    "chemical": "Chemical fungicide/pesticide with product name (English)",
    "organic": "Natural treatment using locally available materials (English)",
    "prevention": "How to prevent this in the next crop (English)"
  },
  "treatmentHi": {
    "immediate": "किसान को तुरंत क्या करना चाहिए",
    "chemical": "रासायनिक दवा का नाम और उपयोग हिंदी में",
    "organic": "स्थानीय सामग्री से जैविक उपचार",
    "prevention": "अगली फसल में रोकथाम के उपाय"
  }
}

Common Indian rice diseases: Blast (Magnaporthe oryzae), Brown Spot (Helminthosporium oryzae), Bacterial Blight (Xanthomonas oryzae), Sheath Blight (Rhizoctonia solani), False Smut (Ustilaginoidea virens), Neck Rot, Tungro Virus.
If the plant is healthy: isHealthy=true, severity=null, fill treatment fields with preventive care advice in both languages.`;

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const content = aiResponse.choices[0]?.message?.content ?? "";

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    result = JSON.parse(jsonMatch[0]);
  } catch {
    req.log.error({ content }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "Failed to parse disease analysis result" });
    return;
  }

  res.json({
    ...result,
    plantNetSpecies: plantNetResult?.species ?? null,
    plantNetScore: plantNetResult?.score ?? null,
  });
});

export default router;
