import { APIResponse } from '@playwright/test';

// Prints URL, STATUS and BODY of a response. A "token" field is masked so it never reaches the logs.
export async function logResponse(response: APIResponse): Promise<void> {
  const text = await response.text();
  console.log('URL:', response.url());
  console.log('STATUS:', response.status());
  console.log('BODY:', text.replace(/("token"\s*:\s*")[^"]*"/g, '$1***"'));
}
