import { test, expect, chromium } from '@playwright/test';

test('Challenge flow between ten instances', async () => {
  // Launch 10 separate browsers
  const browsers: import('@playwright/test').Browser[] = [];
  const contexts: import('@playwright/test').BrowserContext[] = [];
  const pages: import('@playwright/test').Page[] = [];
  const accounts = [
    'testaccount11', 'testaccount12', 'testaccount13', 'testaccount14', 'testaccount15',
    'testaccount16', 'testaccount17', 'testaccount18', 'testaccount19', 'testaccount20'
  ];

  for (let i = 0; i < 10; i++) {
    const browser = await chromium.launch({ headless: false });
    browsers.push(browser);
    const context = await browser.newContext();
    contexts.push(context);
    const page = await context.newPage();
    pages.push(page);
    await page.goto('https://mysticplayground.org');
    await page.click('button.primary:has-text("Play Now")');
    await page.fill('#FormInput-login', accounts[i]);
    await page.fill('#FormInput-password', accounts[i]);
    await page.click('button.primary[type="submit"]:has-text("Log In")');
    await page.click('button.primary:has-text("Play Now")');
  }

  // Example: Each odd account challenges the next even account, and the even accepts
  for (let i = 0; i < 10; i += 2) {
    // Challenger
    const battleButton = await pages[i].waitForSelector('.corner-f5735 .battleButtonContainer-45247.flex.center', { timeout: 15000 });
    await battleButton.scrollIntoViewIfNeeded();
    await battleButton.click();

    const challengeRow = await pages[i].waitForSelector(`.row-88542 .partner-0a6bd:has-text("${accounts[i + 1]}")`, { timeout: 15000 });
    const rowElement = await challengeRow.evaluateHandle(node => node.closest('.row-88542'));
    const challengeButton = await rowElement.asElement()?.$('button:has-text("Challenge")');
    if (challengeButton) {
      await challengeButton.click();
    } else {
      throw new Error(`Challenge button not found for ${accounts[i + 1]}`);
    }

    // Acceptor
    const acceptButton = await pages[i + 1].waitForSelector('button.primary-9a794:has-text("Accept")', { timeout: 15000 });
    await acceptButton.click();
  }

  // Wait for 2 minutes
  await pages[0].waitForTimeout(2 * 60 * 1000);

  // Close all browsers
  for (const browser of browsers) {
    await browser.close();
  }
});
