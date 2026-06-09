import { calculateScoringDetails } from "../src/lib/recommender";

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function closeTo(actual: number, expected: number, tolerance = 0.01) {
    return Math.abs(actual - expected) <= tolerance;
}

const highRuleHighMl = calculateScoringDetails({
    ruleScoreRaw: 16,
    mlScorePercent: 92
});
assert(highRuleHighMl.finalScore > 85, "High rule + high ML should produce a high final score.");

const lowRuleHighMl = calculateScoringDetails({
    ruleScoreRaw: 4,
    mlScorePercent: 95
});
assert(lowRuleHighMl.finalScore >= 60 && lowRuleHighMl.finalScore <= 70, "Low rule + high ML should produce a medium-high final score under the heuristic-weighted formula.");

const highRuleLowMl = calculateScoringDetails({
    ruleScoreRaw: 14,
    mlScorePercent: 20
});
assert(highRuleLowMl.finalScore >= 45 && highRuleLowMl.finalScore <= 55, "High rule + low ML should remain limited by weak heuristic confidence.");

const unpenalized = calculateScoringDetails({
    ruleScoreRaw: 12,
    mlScorePercent: 92
});
const penalized = calculateScoringDetails({
    ruleScoreRaw: 12,
    mlScorePercent: 92,
    rotationPenalty: -10,
    feedbackAdjustment: -5
});
assert(closeTo(unpenalized.finalScore - penalized.finalScore, 15), "Penalties should reduce the final score predictably.");

const bounded = calculateScoringDetails({
    ruleScoreRaw: 99,
    mlScorePercent: 150,
    randomAdjustment: 25
});
assert(bounded.finalScore === 100, "Final score should be clamped to 100.");
assert(bounded.ruleScorePercent === 100, "Rule score percent should be clamped to 100.");
assert(bounded.mlScorePercent === 100, "ML score percent should be clamped to 100.");

console.log("Scoring details checks passed.");
