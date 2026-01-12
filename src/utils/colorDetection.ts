
// Basic color palette for mapping
const PRESET_COLORS = [
    { name: "Black", rgb: [0, 0, 0] },
    { name: "White", rgb: [255, 255, 255] },
    { name: "Blue", rgb: [0, 0, 255] },
    { name: "Red", rgb: [255, 0, 0] },
    { name: "Green", rgb: [0, 128, 0] },
    { name: "Yellow", rgb: [255, 255, 0] },
    { name: "Pink", rgb: [255, 192, 203] },
    { name: "Purple", rgb: [128, 0, 128] },
    { name: "Beige", rgb: [245, 245, 220] },
    { name: "Grey", rgb: [128, 128, 128] },
    { name: "Brown", rgb: [165, 42, 42] },
    { name: "Orange", rgb: [255, 165, 0] },
    { name: "Navy", rgb: [0, 0, 128] },
    { name: "Maroon", rgb: [128, 0, 0] },
    { name: "Teal", rgb: [0, 128, 128] },
    { name: "Olive", rgb: [128, 128, 0] }
];

/**
 * Calculates Euclidean distance between two RGB colors
 */
function colorDistance(rgb1: number[], rgb2: number[]): number {
    return Math.sqrt(
        Math.pow(rgb1[0] - rgb2[0], 2) +
        Math.pow(rgb1[1] - rgb2[1], 2) +
        Math.pow(rgb1[2] - rgb2[2], 2)
    );
}

/**
 * Maps an RGB triplet to the closest preset color name
 */
function mapToClosestColor(r: number, g: number, b: number): string {
    let minDistance = Infinity;
    let closestColor = "Other";

    for (const color of PRESET_COLORS) {
        const distance = colorDistance([r, g, b], color.rgb);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color.name;
        }
    }

    return closestColor;
}

/**
 * Detects the dominant color from an image file using a canvas.
 * Returns the name of the closest matching preset color.
 * Uses a smarter algorithm that prioritizes vibrant colors over neutral ones.
 */
export async function detectDominantColor(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Use a larger sample for better accuracy
                canvas.width = 50;
                canvas.height = 50;

                // Draw image to canvas
                ctx.drawImage(img, 0, 0, 50, 50);

                // Get image data
                const imageData = ctx.getImageData(0, 0, 50, 50).data;

                // Collect color samples with saturation filtering
                const colorSamples: { r: number; g: number; b: number; saturation: number }[] = [];

                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const alpha = imageData[i + 3];

                    // Skip transparent pixels
                    if (alpha < 128) continue;

                    // Calculate saturation to filter out greys/neutrals
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const saturation = max === 0 ? 0 : (max - min) / max;

                    // Only consider pixels with significant color (not pure grey/black/white)
                    // Increased threshold from 0.15 to 0.2 to avoid detecting grey in slightly desaturated images
                    if (saturation > 0.2) {
                        colorSamples.push({ r, g, b, saturation });
                    }
                }

                // If we have vibrant colors, use them
                if (colorSamples.length > 0) {
                    // Sort by saturation and take the most vibrant colors
                    colorSamples.sort((a, b) => b.saturation - a.saturation);

                    // Average the top 30% most vibrant colors
                    const topCount = Math.max(1, Math.floor(colorSamples.length * 0.3));
                    let r = 0, g = 0, b = 0;

                    for (let i = 0; i < topCount; i++) {
                        r += colorSamples[i].r;
                        g += colorSamples[i].g;
                        b += colorSamples[i].b;
                    }

                    r = Math.round(r / topCount);
                    g = Math.round(g / topCount);
                    b = Math.round(b / topCount);

                    const detectedColor = mapToClosestColor(r, g, b);
                    console.log(`Detected vibrant color: RGB(${r}, ${g}, ${b}) -> ${detectedColor}`);
                    resolve(detectedColor);
                } else {
                    // Fallback to simple average if no vibrant colors found
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let i = 0; i < imageData.length; i += 4) {
                        const alpha = imageData[i + 3];
                        if (alpha < 128) continue;

                        r += imageData[i];
                        g += imageData[i + 1];
                        b += imageData[i + 2];
                        count++;
                    }

                    if (count > 0) {
                        r = Math.round(r / count);
                        g = Math.round(g / count);
                        b = Math.round(b / count);

                        const detectedColor = mapToClosestColor(r, g, b);
                        console.log(`Detected average color: RGB(${r}, ${g}, ${b}) -> ${detectedColor}`);
                        resolve(detectedColor);
                    } else {
                        resolve(null);
                    }
                }

            } catch (error) {
                console.error("Color detection error:", error);
                resolve(null);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            console.error("Failed to load image for color detection", err);
            resolve(null);
        };

        img.src = objectUrl;
    });
}
