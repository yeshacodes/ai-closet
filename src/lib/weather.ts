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
    const params = new URLSearchParams({
        latitude: String(position.latitude),
        longitude: String(position.longitude)
    });

    const response = await fetch(`/api/weather?${params.toString()}`);

    if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Unable to load live weather.");
    }

    return response.json() as Promise<CurrentWeatherResult>;
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
            () => reject(new Error("Location permission was denied or unavailable.")),
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 10 * 60 * 1000
            }
        );
    });
}
