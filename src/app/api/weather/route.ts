import { NextRequest, NextResponse } from "next/server";
import type { WeatherType } from "@/lib/recommender";
import { mapWeatherToCategory } from "@/lib/weatherMapping";

type WeatherApiResponse = {
    current?: {
        temp_f?: number;
        temp_c?: number;
        precip_in?: number;
        condition?: {
            text?: string;
            code?: number;
        };
    };
    forecast?: {
        forecastday?: Array<{
            hour?: Array<{
                time_epoch?: number;
                chance_of_rain?: number;
                chance_of_snow?: number;
                precip_in?: number;
                condition?: {
                    text?: string;
                    code?: number;
                };
            }>;
        }>;
    };
}

type ForecastHour = {
    time_epoch?: number;
    chance_of_rain?: number;
    chance_of_snow?: number;
    precip_in?: number;
    condition?: {
        text?: string;
        code?: number;
    };
}

export async function GET(request: NextRequest) {
    const latitude = request.nextUrl.searchParams.get("latitude");
    const longitude = request.nextUrl.searchParams.get("longitude");
    const apiKey = process.env.WEATHER_API_KEY;

    if (!latitude || !longitude) {
        return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
    }

    if (!apiKey) {
        return NextResponse.json({ error: "Weather API key is not configured." }, { status: 500 });
    }

    const params = new URLSearchParams({
        key: apiKey,
        q: `${latitude},${longitude}`,
        days: "2",
        aqi: "no",
        alerts: "no"
    });

    const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?${params.toString()}`, {
        cache: "no-store"
    });

    if (!response.ok) {
        return NextResponse.json({ error: "Unable to load live weather." }, { status: response.status });
    }

    const data = await response.json() as WeatherApiResponse;
    const current = data.current;

    if (!current || typeof current.temp_f !== "number") {
        return NextResponse.json({ error: "Live weather response was incomplete." }, { status: 502 });
    }

    const forecastHours = getUpcomingForecastHours(data.forecast?.forecastday?.flatMap(day => day.hour || []) || []);
    const nextThreeHours = forecastHours.slice(0, 3);
    const rainChances = nextThreeHours
        .map(hour => hour.chance_of_rain)
        .filter((value): value is number => typeof value === "number");
    const snowChances = nextThreeHours
        .map(hour => hour.chance_of_snow)
        .filter((value): value is number => typeof value === "number");
    const forecastOverrideApplied = rainChances.some(chance => chance >= 50);
    const conditionText = [
        current.condition?.text,
        ...nextThreeHours.map(hour => hour.condition?.text)
    ].filter(Boolean).join(" ");
    const category = mapWeatherToCategory({
        temperatureFahrenheit: current.temp_f,
        conditionText,
        precipitationInches: current.precip_in,
        rainChanceNextHours: rainChances,
        snowChanceNextHours: snowChances
    });

    console.info("Live weather debug", {
        currentWeatherCode: current.condition?.code,
        currentConditionText: current.condition?.text,
        currentPrecipitation: current.precip_in,
        hour1Probability: nextThreeHours[0]?.chance_of_rain,
        hour2Probability: nextThreeHours[1]?.chance_of_rain,
        hour3Probability: nextThreeHours[2]?.chance_of_rain,
        forecastOverrideApplied,
        finalMappedCategory: category
    });

    return NextResponse.json({
        temperatureF: current.temp_f,
        temperatureC: typeof current.temp_c === "number" ? current.temp_c : fahrenheitToCelsius(current.temp_f),
        category,
        mappedWeatherCategory: category,
        temperatureFahrenheit: current.temp_f,
        conditionText: current.condition?.text || "",
        weatherCode: current.condition?.code,
        precipitation: current.precip_in,
        rainChanceNext2Hours: getMaxChance(rainChances.slice(0, 2)),
        rainChanceNext3Hours: getMaxChance(rainChances),
        forecastOverrideApplied,
        nextTwoHourPrecipitationProbabilities: rainChances.slice(0, 2),
        nextTwoHourWeatherCodes: nextThreeHours
            .slice(0, 2)
            .map(hour => hour.condition?.code)
            .filter((value): value is number => typeof value === "number"),
        nextThreeHourPrecipitationProbabilities: rainChances,
        nextThreeHourWeatherCodes: nextThreeHours
            .map(hour => hour.condition?.code)
            .filter((value): value is number => typeof value === "number"),
        latitude: Number(latitude),
        longitude: Number(longitude),
        source: "live",
        detectedAt: new Date().toISOString()
    } satisfies WeatherApiRouteResponse);
}

function getUpcomingForecastHours(hours: ForecastHour[]) {
    const nowSeconds = Date.now() / 1000;

    return hours
        .filter(hour => typeof hour.time_epoch === "number" && hour.time_epoch >= nowSeconds - 30 * 60)
        .sort((a, b) => (a.time_epoch || 0) - (b.time_epoch || 0));
}

function getMaxChance(chances: number[]) {
    return chances.length > 0 ? Math.max(...chances) : undefined;
}

function fahrenheitToCelsius(value: number) {
    return Number((((value - 32) * 5) / 9).toFixed(1));
}

type WeatherApiRouteResponse = {
    temperatureF: number;
    temperatureC: number;
    category: WeatherType;
    mappedWeatherCategory: WeatherType;
    temperatureFahrenheit: number;
    conditionText: string;
    weatherCode?: number;
    precipitation?: number;
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
