// Stands in for the Apps Script web app, so no end-to-end run touches the real spreadsheet.
export async function fakeSheet(page, rows = new Map()) {
  await page.route('**/script.google.com/**', async (route) => {
    const request = route.request();
    const answer = (payload) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    });

    if (request.method() === 'POST') {
      const row = JSON.parse(request.postData());
      rows.set(row.id, row);
      return answer({ ok: true, id: row.id, updated: new Date().toISOString() });
    }

    const id = new URL(request.url()).searchParams.get('id');
    const row = rows.get(id);
    if (!row) return answer({ ok: false, error: 'not_found' });
    return answer({ ok: true, id, name: row.name, data: row.data, updated: new Date().toISOString() });
  });

  return rows;
}

export async function unreachableSheet(page) {
  await page.route('**/script.google.com/**', (route) => route.abort('failed'));
}
