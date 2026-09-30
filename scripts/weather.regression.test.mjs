import assert from "node:assert/strict";
import test from "node:test";
import {
    fetchCurrentWeather,
    isExpectedWeatherFailure,
    WeatherLocationError
} from "../src/lib/weather.ts";

const originalNavigator = globalThis.navigator;
const originalFetch = globalThis.fetch;

function setMockNavigator(geolocation) {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { geolocation }
    });
}

function restoreGlobals() {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator
    });
    globalThis.fetch = originalFetch;
}

test("denied location is an expected weather failure and does not call the weather API", async () => {
    let fetchCalled = false;
    setMockNavigator({
        getCurrentPosition(_success, failure) {
            failure({
                code: 1,
                PERMISSION_DENIED: 1,
                TIMEOUT: 3
            });
        }
    });
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("fetch should not run");
    };

    try {
        await assert.rejects(
            fetchCurrentWeather(),
            error => {
                assert.equal(isExpectedWeatherFailure(error), true);
                assert.equal(error instanceof WeatherLocationError, true);
                assert.equal(error.reason, "permission-denied");
                assert.match(error.message, /Choose weather manually/);
                return true;
            }
        );
        assert.equal(fetchCalled, false);
    } finally {
        restoreGlobals();
    }
});

test("timeout and unavailable location are expected weather failures", async () => {
    const cases = [
        { code: 2, expectedReason: "unavailable" },
        { code: 3, expectedReason: "timeout" }
    ];

    for (const testCase of cases) {
        setMockNavigator({
            getCurrentPosition(_success, failure) {
                failure({
                    code: testCase.code,
                    PERMISSION_DENIED: 1,
                    TIMEOUT: 3
                });
            }
        });

        try {
            await assert.rejects(
                fetchCurrentWeather(),
                error => {
                    assert.equal(isExpectedWeatherFailure(error), true);
                    assert.equal(error.reason, testCase.expectedReason);
                    assert.match(error.message, /Choose weather manually/);
                    return true;
                }
            );
        } finally {
            restoreGlobals();
        }
    }
});

test("allowed location fetches live weather and returns mapped weather data", async () => {
    setMockNavigator({
        getCurrentPosition(success) {
            success({
                coords: {
                    latitude: 40.7128,
                    longitude: -74.006
                }
            });
        }
    });

    globalThis.fetch = async input => {
        const url = new URL(String(input), "http://localhost");
        assert.equal(url.pathname, "/api/weather");
        assert.equal(url.searchParams.get("latitude"), "40.7128");
        assert.equal(url.searchParams.get("longitude"), "-74.006");

        return {
            ok: true,
            async json() {
                return {
                    temperatureF: 72,
                    temperatureC: 22.2,
                    category: "Warm",
                    mappedWeatherCategory: "Warm",
                    temperatureFahrenheit: 72,
                    forecastOverrideApplied: false,
                    nextTwoHourPrecipitationProbabilities: [],
                    nextTwoHourWeatherCodes: [],
                    nextThreeHourPrecipitationProbabilities: [],
                    nextThreeHourWeatherCodes: [],
                    latitude: 40.7128,
                    longitude: -74.006,
                    source: "live",
                    detectedAt: "2026-09-30T12:00:00.000Z"
                };
            }
        };
    };

    try {
        const result = await fetchCurrentWeather();
        assert.equal(result.category, "Warm");
        assert.equal(result.source, "live");
        assert.equal(result.temperatureF, 72);
    } finally {
        restoreGlobals();
    }
});
