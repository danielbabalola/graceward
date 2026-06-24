import type {
  AnalyzeReflectionRequest,
  AnalyzeReflectionResponse,
} from "@graceward/ai-schemas";

/**
 * Provider boundary for reflection analysis. Keeping this behind an interface
 * lets us swap OpenAI for another backend-only provider without touching the
 * route. Implementations must never let raw reflection content leak into logs.
 */
export interface ReflectionAnalysisProvider {
  readonly name: string;
  readonly model: string;
  analyze(input: AnalyzeReflectionRequest): Promise<AnalyzeReflectionResponse>;
}

/** Error carrying a non-sensitive code and HTTP status for the API envelope. */
export class AiError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}
