import { APIResponse } from '@playwright/test';

// Safety net for the negative cases: if the API unexpectedly creates the resource (201),
// its id is kept so the afterEach can delete it.
export async function rememberIfCreated(response: APIResponse, ids: string[]): Promise<void> {
  if (response.status() !== 201) return;
  const body = await response.json();
  if (body?.id) ids.push(body.id);
}
