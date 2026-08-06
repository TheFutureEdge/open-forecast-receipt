export interface ReconstructionStep {
  stepNumber: number;
  validAt: string;       // ISO date string, UTC
  stepReturnBps: number;
  stepReturnPercent: string;
  cumulativeReturnPercent: string;
  impliedPrice: number;   // in target anchor unit
}

export interface ReconstructionResult {
  anchorValue: number;
  anchorAt: string;
  cadenceMonths: number;
  pointCount: number;
  terminalPrice: number;
  terminalReturnPercent: string;
  steps: ReconstructionStep[];
}