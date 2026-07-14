import { apiFetch } from './client';

// Mirrors materialservice/MaterialsController.java's MaterialDto exactly —
// this one DOES have explicit @JsonProperty annotations (snake_case),
// unlike the plain-entity endpoints elsewhere (notifications/marketplace/
// files/payments). Hardcoded server-side (no DB table) but a real,
// authoritative endpoint — cost_per_gram matches EstimateService's actual
// rates (PLA 0.05, RESIN 0.15, ABS 0.08).
export type MaterialApiResponse = {
  material_id: string;
  material_name: string;
  colors: string[];
  cost_per_gram: number;
  availability_status: string;
  description: string;
};

export type Material = {
  id: string;
  name: string;
  colors: string[];
  costPerGram: number;
  availabilityStatus: string;
  description: string;
};

export function toMaterial(res: MaterialApiResponse): Material {
  return {
    id: res.material_id,
    name: res.material_name,
    colors: res.colors,
    costPerGram: res.cost_per_gram,
    availabilityStatus: res.availability_status,
    description: res.description,
  };
}

/** Maps to GET /api/materials. */
export async function fetchMaterials(token: string): Promise<Material[]> {
  const data = await apiFetch<MaterialApiResponse[]>('/api/materials', { token });
  return data.map(toMaterial);
}
