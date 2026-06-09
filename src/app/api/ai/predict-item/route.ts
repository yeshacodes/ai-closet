import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { CLOSET_CATEGORIES, normalizeClosetCategory } from "@/lib/categories";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Strict validation schema matching App enums
const CategoryEnum = z.enum(CLOSET_CATEGORIES);
const StyleEnum = z.enum(["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]);
const WeatherEnum = z.enum(["Sunny", "Rainy", "Cold", "Warm", "Snowy"]);

const predictSchema = z.object({
    name: z.string(),
    category: CategoryEnum,
    color: z.string(),
    styles: z.array(StyleEnum),
    suggestedStyles: z.array(StyleEnum).max(3),
    styleReasoning: z.string(),
    styleConfidence: z.number().min(0).max(1),
    weather: z.array(WeatherEnum),
    weatherReasoning: z.string(),
    weatherConfidence: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    reasoning_tags: z.array(z.string())
});

export async function GET() {
    return NextResponse.json({ message: "AI Predict API is online. Use POST to analyze images." });
}

export async function POST(req: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const { image_url, hints } = await req.json();

        if (!image_url) {
            return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
        }

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: `You are an expert fashion consultant. Analyze the clothing image provided and return accurate attributes in JSON format.
                    
                    STRICT RULES:
                    1. Use ONLY the following categories: ${CLOSET_CATEGORIES.map(c => `"${c}"`).join(", ")}.
                    2. category rules: T-shirts -> "T-Shirt"; hoodies -> "Hoodie"; sweaters/knits -> "Sweater"; blouses/tanks/camisoles/lace tops/crop tops -> "Top"; jeans -> "Jeans"; trousers -> "Pants"; leggings -> "Leggings"; shorts or skirts -> "Shorts/Skirts"; jackets/coats/blazers/cardigans -> "Outerwear"; shoes -> "Footwear"; accessories/bags/jewelry/hats/scarves -> "Accessory".
                    3. Use ONLY the following styles: "Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear".
                    4. Return suggestedStyles as up to 3 likely style tags, but these are suggestions only. Use garment type, fabric, silhouette, visual appearance, and formality.
                    5. styleReasoning should explain why those styles are likely. styleConfidence should be 0-1.
                    6. Use ONLY the following weather: "Sunny", "Rainy", "Snowy", "Cold", "Warm".
                    7. Weather rules: hoodies/sweaters/jackets/coats/sweatshirts/heavy knits -> Cold; rain jackets/waterproof outerwear/boots -> Rainy; t-shirts/tanks/shorts/skirts/light dresses/breathable tops/lace sleeveless tops -> Warm or Sunny; sandals -> Sunny/Warm; sneakers -> Warm/Sunny unless clearly winter/rain footwear. Do not default to Warm if uncertain; return [] for weather when low confidence.
                    8. weatherReasoning should explain the selected weather tags. weatherConfidence should be 0-1.
                    4. color MUST be one of these exact values: Black, White, Grey, Beige, Brown, Navy, Blue, Red, Pink, Green, Yellow, Orange, Purple, Maroon, Teal, Olive. (Choose the closest color).
                    5. name must be a 2-5 word description in the format: "<Color> <ItemType>" (e.g., "Pink Puffer Jacket", "Navy Blue Polo").
                    6. Confidence should be a float between 0 and 1.
                    7. reasoning_tags should be short (e.g. ["collared shirt", "linen texture"]).
                    
                    Return ONLY raw JSON.`
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: `Analyze this clothing item. Hints from user: Name: ${hints?.name || "none"}, Category: ${hints?.category || "none"}` },
                        {
                            type: "input_image",
                            image_url: image_url,
                            detail: "auto"
                        },
                    ],
                },
            ],
            max_output_tokens: 500,
        });

        const content = response.output_text;
        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        let rawData;
        try {
            // Robust extraction: slice from the first '{' to the last '}'
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");

            if (start === -1 || end === -1 || end < start) {
                console.error("[AI Invalid Response]:", content);
                throw new Error("AI response did not contain a valid JSON object");
            }

            const jsonText = content.slice(start, end + 1);
            rawData = JSON.parse(jsonText);
        } catch (e: unknown) {
            console.error("[AI Parsing Error]:", content);
            throw new Error(e instanceof Error ? e.message : "AI returned invalid JSON");
        }

        // Log raw data for dev debugging
        console.log("[AI Raw Output Text]:", content);
        console.log("[AI Parsed Raw Data]:", rawData);

        // --- IMPROVED NORMALIZATION (Color Mapping & Better Fallbacks) ---

        // Match existing options in UI dropdown
        const allowedColors = ["Black", "White", "Blue", "Red", "Green", "Yellow", "Pink", "Purple", "Beige", "Grey", "Brown", "Orange", "Navy", "Maroon", "Teal", "Olive"];

        // Map common AI color variations to allowed palette
        const colorMap: Record<string, string> = {
            "ivory": "Beige",
            "cream": "Beige",
            "off white": "Beige",
            "off-white": "Beige",
            "navy": "Navy",
            "navy blue": "Navy",
            "light yellow": "Yellow",
            "pale yellow": "Yellow",
            "dark blue": "Navy",
            "light blue": "Blue",
            "sky blue": "Blue",
            "charcoal": "Grey",
            "dark grey": "Grey",
            "light grey": "Grey",
            "olive green": "Olive",
            "forest green": "Green",
            "burgundy": "Maroon",
            "wine": "Maroon",
            "crimson": "Red",
            "khaki": "Beige",
            "tan": "Brown",
            "sand": "Beige",
        };

        const rawColorStr = typeof rawData.color === "string" ? rawData.color.trim() : "";
        const lowerColor = rawColorStr.toLowerCase();

        // Priority: 1. Direct allowed match, 2. Map match, 3. Empty string
        let finalColor = "";
        const directMatch = allowedColors.find(c => c.toLowerCase() === lowerColor);

        if (directMatch) {
            finalColor = directMatch;
        } else if (colorMap[lowerColor]) {
            finalColor = colorMap[lowerColor];
        } else {
            // No valid color found - do NOT default to Black as per request
            finalColor = "";
        }

        let finalConfidence = typeof rawData.confidence === "number"
            ? rawData.confidence
            : Number(rawData.confidence) || 0.5;

        // Lower confidence if color had to be ignored
        if (rawColorStr && !finalColor) {
            finalConfidence = Math.min(finalConfidence, 0.4);
        }

        const finalCategory = typeof rawData.category === "string"
            ? normalizeClosetCategory(rawData.category.trim())
            : "Top";

        let finalName = typeof rawData.name === "string" && rawData.name.trim()
            ? rawData.name.trim()
            : "";

        // Fallback name to "<Color> <Category>" if blank
        // Note: If finalColor is empty, it will just be the category name (e.g. "Top")
        if (!finalName) {
            finalName = finalColor ? `${finalColor} ${finalCategory}` : finalCategory;
        }

        const normalizedData = {
            name: finalName,
            category: finalCategory,
            color: finalColor,
            styles: Array.isArray(rawData.styles)
                ? rawData.styles
                : typeof rawData.styles === "string"
                    ? [rawData.styles]
                    : [],
            suggestedStyles: Array.isArray(rawData.suggestedStyles)
                ? rawData.suggestedStyles.slice(0, 3)
                : Array.isArray(rawData.styles)
                    ? rawData.styles.slice(0, 3)
                    : [],
            styleReasoning: typeof rawData.styleReasoning === "string"
                ? rawData.styleReasoning
                : "Suggested from the garment's visible formality, silhouette, and material.",
            styleConfidence: typeof rawData.styleConfidence === "number"
                ? rawData.styleConfidence
                : finalConfidence,

            weather: Array.isArray(rawData.weather)
                ? rawData.weather
                : typeof rawData.weather === "string"
                    ? [rawData.weather]
                    : [],
            weatherReasoning: typeof rawData.weatherReasoning === "string"
                ? rawData.weatherReasoning
                : "Weather tags were inferred from garment type, coverage, and visible material.",
            weatherConfidence: typeof rawData.weatherConfidence === "number"
                ? rawData.weatherConfidence
                : finalConfidence,

            confidence: finalConfidence,

            reasoning_tags: Array.isArray(rawData.reasoning_tags)
                ? rawData.reasoning_tags
                : []
        };


        // Runtime validation with Zod
        const validatedData = predictSchema.safeParse(normalizedData);

        if (!validatedData.success) {
            console.error("[AI Validation Failed]:", validatedData.error);
            return NextResponse.json({
                error: "Invalid AI response structure",
                details: validatedData.error.format()
            }, { status: 422 });
        }

        return NextResponse.json(validatedData.data);

    } catch (error: unknown) {
        console.error("[AI Predict Error]:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to analyze image" }, { status: 500 });
    }
}
