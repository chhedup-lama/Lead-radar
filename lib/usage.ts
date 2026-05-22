import { prisma } from "@/lib/prisma";

const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

export async function logApiUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  callType: string;
  sourceId?: string | null;
  scanRunId?: string | null;
}): Promise<void> {
  const costUsd =
    params.inputTokens * INPUT_COST_PER_TOKEN +
    params.outputTokens * OUTPUT_COST_PER_TOKEN;
  await prisma.apiUsage.create({
    data: {
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
      callType: params.callType,
      sourceId: params.sourceId ?? null,
      scanRunId: params.scanRunId ?? null,
    },
  });
}
