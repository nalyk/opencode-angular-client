export interface ConfigInfo {
  provider: string;
  model: string;
  [key: string]: any;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  cost?: {
    input: number;
    output: number;
  };
  reasoning?: boolean;
  tool_call?: boolean;
  release_date?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: Record<string, ModelInfo>;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
  default: Record<string, string>;
}
