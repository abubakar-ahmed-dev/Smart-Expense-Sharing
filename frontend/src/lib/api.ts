const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4500/api/v1';

type HealthResponse = {
  success: boolean;
  data: {
    service: string;
    version: string;
    timestamp: string;
  };
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Failed to fetch health: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
