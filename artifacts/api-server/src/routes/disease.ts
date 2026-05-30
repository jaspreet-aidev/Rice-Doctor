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

  const { imageBase64, mimeType = "image/jpeg" } = parsed.data;

  const prompt = `You are an expert agricultural scientist specializing in rice diseases in India. Analyze this rice plant image and identify any diseases present.

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
