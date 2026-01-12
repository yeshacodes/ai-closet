import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Define the return type for our vision prediction
export type VisionPrediction = {
    rawLabel: string;
    confidence: number;
    mappedCategory?: string; // Top, Bottom, Footwear, Outerwear, Dress, Accessory
};

// Singleton to hold the model instance
let model: mobilenet.MobileNet | null = null;
let modelLoadingPromise: Promise<mobilenet.MobileNet> | null = null;

/**
 * Lazy-loads the MobileNetV2 model.
 * Uses a singleton pattern to ensure we only load it once.
 */
async function loadModel(): Promise<mobilenet.MobileNet> {
    if (model) {
        return model;
    }

    if (modelLoadingPromise) {
        return modelLoadingPromise;
    }

    // Start loading
    modelLoadingPromise = (async () => {
        try {
            // Ensure backend is ready (WebGL is standard for browser)
            await tf.ready();
            const loadedModel = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
            model = loadedModel;
            return loadedModel;
        } catch (error) {
            console.error("Failed to load MobileNet model:", error);
            modelLoadingPromise = null; // Reset so we can try again
            throw new Error("AI analysis unavailable, please fill details manually.");
        }
    })();

    return modelLoadingPromise;
}

/**
 * Maps raw ImageNet labels to our App's categories.
 */
function mapLabelToCategory(label: string): string | undefined {
    const lowerLabel = label.toLowerCase();

    // 1. Dress
    if (["dress", "gown", "sundress", "frock", "sarong", "kimono"].some(k => lowerLabel.includes(k))) {
        return "Dress";
    }

    // 2. Outerwear
    if (["coat", "jacket", "parka", "overcoat", "trench", "blazer", "cardigan", "sweater", "hoodie", "vest", "poncho", "cloak"].some(k => lowerLabel.includes(k))) {
        return "Outerwear";
    }

    // 3. Footwear
    if (["shoe", "sneaker", "boot", "sandal", "heel", "loafer", "slipper", "clog", "moccasin", "pump"].some(k => lowerLabel.includes(k))) {
        return "Footwear";
    }

    // 4. Shorts/Skirts
    if (["short", "skirt", "miniskirt", "sarong"].some(k => lowerLabel.includes(k))) {
        return "Shorts/Skirts";
    }

    // 5. Bottoms
    if (["jean", "pant", "trouser", "legging", "sweatpant", "jogger", "trunk"].some(k => lowerLabel.includes(k))) {
        return "Bottom";
    }

    // 5. Tops
    // Note: 'jersey' often matches shirts. 'shirt' matches t-shirts.
    if (["shirt", "tee", "top", "blouse", "jersey", "tunic", "sweatshirt", "polo"].some(k => lowerLabel.includes(k))) {
        return "Top";
    }

    // 6. Accessories
    if (["bag", "backpack", "cap", "hat", "scarf", "belt", "glove", "wallet", "purse", "sunglass", "tie", "bowtie", "umbrella"].some(k => lowerLabel.includes(k))) {
        return "Accessory";
    }

    return undefined;
}

/**
 * Main function to classify an image file.
 */
export async function classifyClothingFromFile(file: File): Promise<VisionPrediction | null> {
    try {
        const net = await loadModel();

        // Convert File to HTMLImageElement
        const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
        });

        // Classify with additional error handling for WebGL issues
        let predictions;
        try {
            predictions = await net.classify(imageElement);
        } catch (classifyError) {
            // Clean up object URL before handling error
            URL.revokeObjectURL(imageElement.src);

            // Handle WebGL shader errors gracefully
            if (classifyError instanceof Error &&
                (classifyError.message.includes('shader') ||
                    classifyError.message.includes('WebGL') ||
                    classifyError.message.includes('vertex'))) {
                console.warn("WebGL error during classification, vision analysis unavailable:", classifyError.message);
                return null;
            }
            throw classifyError;
        }

        // Clean up object URL
        URL.revokeObjectURL(imageElement.src);

        if (!predictions || predictions.length === 0) {
            return null;
        }

        // Take the top prediction
        const topPrediction = predictions[0];
        const rawLabel = topPrediction.className;
        const confidence = topPrediction.probability;

        // Map to our category
        const mappedCategory = mapLabelToCategory(rawLabel);

        return {
            rawLabel,
            confidence,
            mappedCategory
        };

    } catch (error) {
        console.error("Error classifying image:", error);
        // Re-throw if it's our specific "unavailable" error, otherwise return null
        if (error instanceof Error && error.message.includes("unavailable")) {
            throw error;
        }
        return null;
    }
}
