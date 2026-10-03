/** Navega y espera a que React termine de hidratar (evita interactuar antes de tiempo). */
export async function open(page, path) {
  const response = await page.goto(path);
  await page.waitForSelector('html[data-hydrated="true"]', { state: 'attached' });
  return response;
}
