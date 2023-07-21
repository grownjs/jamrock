export async function http(conn) {
  if (['PUT', 'POST', 'PATCH'].includes(conn.method)) {
    await conn.req.parseBody();
  }
}

export async function csrf(conn) {
  await conn.req.csrfProtect();
}
