import { expect, it } from "vitest";
import {
  animatedScore,
  scoreFeedback,
  SCORE_REVEAL_MS,
} from "../apps/web/src/score-feedback.js";

it("a revelação cresce sem ultrapassar a média e termina no valor real, sem arredondar a regra", () => {
  for (const average of [0, 3.5, 8.333333, 9.95, 10]) {
    const steps = [0, 100, 500, 1200, 2000, SCORE_REVEAL_MS].map((t) =>
      animatedScore(average, t),
    );
    expect(steps[0]).toBe(0);
    expect(
      steps.every(
        (n, i) => n >= 0 && n <= average && (i === 0 || n >= steps[i - 1]),
      ),
    ).toBe(true);
    expect(steps.at(-1)).toBe(average);
    expect(animatedScore(average, SCORE_REVEAL_MS + 10000)).toBe(average);
  }
});
it("sem nota é confuso, nota zero recebe incentivo e a frase é estável entre telas", () => {
  expect(scoreFeedback(null, "show").mood).toBe("confused");
  expect(scoreFeedback(0, "show").mood).toBe("encouraging");
  expect(scoreFeedback(6, "show").mood).toBe("groove");
  expect(scoreFeedback(8.5, "show").mood).toBe("celebration");
  expect(scoreFeedback(10, "show")).toEqual(scoreFeedback(10, "show"));
  expect(scoreFeedback(9.95, "show").phrase).not.toBe(
    scoreFeedback(10, "show").phrase,
  );
});
