
import { HybridRecommender, Preferences, Outfit } from "./src/lib/recommender"
import { Item } from "./src/types"

// Items including an umbrella
const items: Item[] = [
    { id: "1", name: "White T-Shirt", category: "Top", color: "White", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "2", name: "Blue Jeans", category: "Bottom", color: "Blue", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "3", name: "Sneakers", category: "Footwear", color: "White", styles: ["Casual"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Casual" },
    { id: "4", name: "Black Umbrella", category: "Accessory", color: "Black", styles: ["All Styles"], tags: ["umbrella"], image_url: "url", created_at: "2024-01-01", description: "", style: "All Styles" },
    { id: "5", name: "Formal Suit", category: "Dress", color: "Black", styles: ["Formal"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Formal" },
    { id: "6", name: "Formal Shoes", category: "Footwear", color: "Black", styles: ["Formal"], tags: [], image_url: "url", created_at: "2024-01-01", description: "", style: "Formal" },
]

const recommender = new HybridRecommender()

async function testRainyWeather() {
    console.log("--- Testing Rainy Weather (Casual) ---")
    const prefs: Preferences = { weather: "Rainy", occasion: "Casual" }
    const result = recommender.generateOutfit(items, prefs)

    if (!result.success || !result.outfits) {
        console.error("FAIL: No outfit generated for Rainy weather:", result.error)
        return
    }

    const hasUmbrella = result.outfits.every(o => o.accessory?.name.toLowerCase().includes("umbrella"))
    if (hasUmbrella) {
        console.log("PASS: All rainy recommendations have an umbrella")
    } else {
        console.error("FAIL: Some or all rainy recommendations missing an umbrella")
        result.outfits.forEach((o, i) => {
            console.log(`Outfit ${i + 1}: Accessory = ${o.accessory?.name || 'None'}`)
        })
    }
}

async function testRainyWeatherFormal() {
    console.log("\n--- Testing Rainy Weather (Formal) ---")
    // Umbrella might be filtered out if it doesn't match Formal style (currently it has "All Styles" which matches everything)
    const prefs: Preferences = { weather: "Rainy", occasion: "Formal" }
    const result = recommender.generateOutfit(items, prefs)

    if (!result.success || !result.outfits) {
        console.error("FAIL: No outfit generated for Rainy weather:", result.error)
        return
    }

    const hasUmbrella = result.outfits.every(o => o.accessory?.name.toLowerCase().includes("umbrella"))
    if (hasUmbrella) {
        console.log("PASS: All rainy recommendations have an umbrella (Formal)")
    } else {
        console.error("FAIL: Some or all rainy recommendations missing an umbrella (Formal)")
        result.outfits.forEach((o, i) => {
            console.log(`Outfit ${i + 1}: Accessory = ${o.accessory?.name || 'None'}`)
        })
    }
}

testRainyWeather()
testRainyWeatherFormal()
