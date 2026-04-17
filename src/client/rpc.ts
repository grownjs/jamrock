let _prefix = '';

export function setPrefix(prefix: string): void {
  _prefix = prefix;
}

export async function rpc(endpoint: string, ...args: any[]): Promise<any> {
  const url = `/${_prefix}/_rpc/${endpoint}`;
  const csrf = (window as any).Jamrock?.Browser?.csrf_token || '';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      ...(csrf ? { 'csrf-token': csrf } : {}),
    },
    body: JSON.stringify(args),
    credentials: 'same-origin',
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || `RPC call failed: ${endpoint}`);
  }

  return result.data;
}