import { describe, expect, it } from "vitest";
import { publicForecasterClass } from "../../lib/forecasters/presentation";

describe("publicForecasterClass", () => {
  it("reduces detailed forecaster types to the three public ledger values", () => {
    expect(publicForecasterClass("human")).toBe("Human");
    expect(publicForecasterClass("ai_model")).toBe("AI");
    expect(publicForecasterClass("hybrid_ai_workflow")).toBe("AI");
    expect(publicForecasterClass("algorithm")).toBe("Quant Model");
    expect(publicForecasterClass("econometric_model")).toBe("Quant Model");
  });
});
