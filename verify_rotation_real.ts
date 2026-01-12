import { HybridRecommender } from "./src/lib/recommender";
import fs from 'fs';

// Load real data
const data = JSON.parse(fs.readFileSync('outerwear_summary.json', 'utf-8'));
const realOuterwear = data.outerwear;

// Create some mock tops/bottoms/shoes that match a specific style/weather
// IMPORTANT: Include color to avoid being filtered out by isValidColorCombination
const mockItems = [
    { id: "top1", name: "Top 1", category: "Top", color: "White", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    { id: "top2", name: "Top 2", category: "Top", color: "White", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    { id: "top3", name: "Top 3", category: "Top", color: "White", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    { id: "bot1", name: "Bot 1", category: "Bottom", color: "Black", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    { id: "bot2", name: "Bot 2", category: "Bottom", color: "Black", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    { id: "shoe1", name: "Shoe 1", category: "Footwear", color: "White", styles: ["Casual"], weather: ["Cold"], created_at: "", image_url: "", description: "", tags: [] },
    ...realOuterwear.map((o: any) => ({ ...o, category: "Outerwear" }))
];

const recommender = new HybridRecommender();

function runRotationSimulation() {
    console.log(`\n--- Running Simulation with ${realOuterwear.length} real outerwear items ---`);

    // We want to see if a SINGLE call returns 5 DIFFERENT outerwear items if available
    const prefs = { weather: "Cold", occasion: "Casual" } as any;
    const result = recommender.generateOutfit(mockItems as any, prefs);

    if (result.success && result.outfits) {
        console.log(`\nResults in this batch (${result.outfits.length} outfits):`);
        const seenOuterwear = new Set<string>();

        result.outfits.forEach((o, i) => {
            const outerName = o.outerwear?.name || "NONE";
            const outerId = o.outerwear?.id || "NONE";
            console.log(`${i + 1}. [${o.type}] Top: ${o.type === 'separates' ? o.top.name : 'Dress'} | Outerwear: ${outerName} (${outerId})`);
            if (o.outerwear) seenOuterwear.add(o.outerwear.id);
        });

        console.log(`\nUnique outerwear items in this batch: ${seenOuterwear.size}`);
        const eligibleOuterCount = result.outfits.length; // Max possible unique in this batch
        const uniqueNeeded = Math.min(5, 6); // We know 6 outerwear items pass the filter from previous logs

        if (seenOuterwear.size >= uniqueNeeded) {
            console.log("PASS: Batch diversity works! (Outerwear rotated in single batch)");
        } else {
            console.log("FAIL: Batch diversity is weak. Repeated outerwear detected.");
        }
    } else {
        console.error("Failed to generate outfits:", result.error);
    }
}

runRotationSimulation();
