import { test, expect } from '@playwright/test';

test('live geometry catches both defects, isolates game storage, and policy preferences expose trade-offs', async ({
  page,
}) => {
  await page.goto('/lab/');
  await page.evaluate(() =>
    localStorage.setItem('arc-lab-isolation', 'preserve'),
  );
  const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
  await expect(page.getByTestId('miss-count')).toHaveText('0');
  await page.getByRole('checkbox', { name: /故意只查询终点/ }).check();
  await expect(page.getByTestId('miss-count')).not.toHaveText('0');
  await page.getByRole('checkbox', { name: /故意只查询终点/ }).uncheck();
  await expect(page.getByTestId('miss-count')).toHaveText('0');
  await page.getByRole('button', { name: '跨格击退', exact: true }).click();
  await page.getByRole('checkbox', { name: /故意不更新击退后的索引/ }).check();
  await expect(page.getByTestId('miss-count')).not.toHaveText('0');
  await page
    .getByRole('checkbox', { name: /故意不更新击退后的索引/ })
    .uncheck();
  await expect(page.getByTestId('miss-count')).toHaveText('0');
  await page.getByRole('button', { name: /02 \/ AEGIS ARENA/ }).click();
  await expect(page).toHaveURL(/#aegis$/);
  await expect(page.getByTestId('policy-ranking')).toContainText(
    'Utility 排在前面',
  );
  await page.locator('.preset-buttons button').nth(1).click();
  await expect(page.getByTestId('policy-ranking')).toContainText(
    'Priority 排在前面',
  );
  await page.getByRole('combobox', { name: /种子/ }).selectOption('1027');
  await expect(
    page.getByRole('link', { name: /种子 1027 \/ Priority 原始 JSON/ }),
  ).toHaveAttribute('href', /episode-026.json$/);
  for (const slider of await page.locator('.controls input[type=range]').all())
    await slider.fill('0');
  await expect(page.getByTestId('policy-ranking')).toContainText(
    '请至少保留一项非零偏好',
  );
  await page.goBack();
  await expect(page.getByTestId('miss-count')).toHaveText('0');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
    storageBefore,
  );
});

test('recorded cases preserve rejected green tests, retrieval regression, transaction and abstention evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/lab/#repopilot');
  await expect(page.getByTestId('real-model-result')).toHaveText('1 / 1');
  await page.getByRole('button', { name: '查看独立验收结果 →' }).click();
  await expect(page.getByTestId('candidate-decision')).toContainText('拒收');
  await expect(page.locator('.candidate-checks')).toContainText('93');
  await page.getByRole('button', { name: '候选 B / 包含对角线' }).click();
  await page.getByRole('button', { name: '查看独立验收结果 →' }).click();
  await expect(page.getByTestId('candidate-decision')).toContainText('接受');
  await expect(page.locator('.candidate-checks')).toContainText('93');
  await page.getByRole('button', { name: /04 \/ OPSPILOT AI/ }).click();
  await expect(page.getByTestId('retrieval-rank')).toHaveText('#1');
  await expect(page.getByTestId('real-model-result')).toHaveText('5 / 6');
  await page.getByRole('button', { name: '加入词项重排' }).click();
  await expect(page.getByTestId('retrieval-rank')).toHaveText('#4');
  await page.getByLabel('选择问题').selectOption('rag_29');
  await expect(page.getByTestId('retrieval-rank')).toHaveText('本应拒答');
  await expect(page.getByTestId('refund-count')).toHaveText('0');
  await page.locator('.step-navigation button').nth(3).click();
  await expect(page.getByTestId('refund-count')).toHaveText('1');
  await page.locator('.step-navigation button').nth(4).click();
  await expect(page.getByTestId('refund-count')).toHaveText('0');
  await page.getByRole('button', { name: /05 \/ DESIGNLENS AI/ }).click();
  await expect(page.locator('.checks-row .good')).toHaveCount(2);
  await expect(page.getByTestId('design-task-result')).toHaveText('失败');
  await expect(page.getByTestId('real-model-result')).toHaveText('2 / 3');
  await page.getByRole('button', { name: '增加上下文门槛' }).click();
  await expect(page.getByTestId('design-task-result')).toHaveText('通过');
  await expect(page.locator('.workflow-trace')).toContainText(
    '观察到 0 条上下文',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['arc', 'aegis', 'repopilot', 'opspilot', 'designlens']) {
    await page.goto(`/lab/#${id}`);
    await expect(page.locator('.experiment')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
