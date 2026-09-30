import type { WeatherType } from "@/lib/recommender";

export type CurrentWeatherResult = {
    temperatureF: number;
    temperatureC: number;
    category: WeatherType;
    mappedWeatherCategory: WeatherType;
    temperatureFahrenheit: number;
    conditionText?: string;
    weatherCode?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    rainChanceNext2Hours?: number;
    rainChanceNext3Hours?: number;
    forecastOverrideApplied: boolean;
    nextTwoHourPrecipitationProbabilities: number[];
    nextTwoHourWeatherCodes: number[];
    nextThreeHourPrecipitationProbabilities: number[];
    nextThreeHourWeatherCodes: number[];
    latitude: number;
    longitude: number;
    source: "live";
    detectedAt: string;
}

type GeolocationCoordinatesResult = {
    latitude: number;
    longitude: number;
}

export async function fetchCurrentWeather(): Promise<CurrentWeatherResult> {
    const position = await getBrowserLocation();
    console.info("Live weather geolocation", {
        latitude: position.latitude,
        longitude: position.longitude
    });

    const params = new URLSearchParams({
        latitude: String(position.latitude),
        longitude: String(position.longitude)
    });

    let response: Response;
    try {
        response = await fetch(`/api/weather?${params.toString()}`);
    } catch (error) {
        console.error("Live weather API request failed", error);
        throw new Error("Unable to reach the live weather service. Please choose weather manually.");
    }

    if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Unable to load live weather. Please choose weather manually.");
    }

    const data = await response.json() as CurrentWeatherResult;
    if (!data || typeof data.temperatureF !== "number" || !data.category) {
        console.error("Live weather response malformed", data);
        throw new Error("Live weather response was incomplete. Please choose weather manually.");
    }

    console.info("Live weather mapped", {
        latitude: data.latitude,
        longitude: data.longitude,
        temperatureF: data.temperatureF,
        conditionText: data.conditionText,
        weatherCode: data.weatherCode,
        precipitation: data.precipitation,
        rainChanceNext3Hours: data.rainChanceNext3Hours,
        mappedCategory: data.category
    });

    return data;
}

function getBrowserLocation(): Promise<GeolocationCoordinatesResult> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
        return Promise.reject(new Error("Browser location is unavailable."));
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            position => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            error => {
                const reason = error.code === error.PERMISSION_DENIED
                    ? "Location permission was denied. Please allow location access or choose weather manually."
                    : error.code === error.TIMEOUT
                        ? "Location detection timed out. Please try again or choose weather manually."
                        : "Location is unavailable. Please choose weather manually.";
                reject(new Error(reason));
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}
