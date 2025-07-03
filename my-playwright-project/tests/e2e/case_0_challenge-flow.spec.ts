import { test, chromium } from '@playwright/test';
import { BASE_URL, accounts } from '../test-data/config';

// Selectors
const SELECTOR_PLAY_NOW = 'button.primary:has-text("Play Now")';
const SELECTOR_LOGIN = '#FormInput-login';
const SELECTOR_PASSWORD = '#FormInput-password';
const SELECTOR_LOGIN_SUBMIT = 'button.primary[type="submit"]:has-text("Log In")';
const SELECTOR_FRIENDS_BUTTON = '[class*="bottomLeft"] [class^="battleButtonContainer"]';
const SELECTOR_CHALLENGE_ROW = (opponent: string) => '[class*="row"] [class*="partner"]:has-text("' + opponent + '")';
const SELECTOR_CHALLENGE_BUTTON = 'button:has-text("Challenge")';
const SELECTOR_ACCEPT_BUTTON = 'button[class*="primary"]:has-text("Accept")';

// Shared variables for before/after hooks
let browsers: import('@playwright/test').Browser[] = [];
let contexts: import('@playwright/test').BrowserContext[] = [];
let pages: import('@playwright/test').Page[] = [];

test.beforeEach(async () => {
  browsers = [];
  contexts = [];
  pages = [];
  for (let i = 0; i < accounts.length; i++) {
    const browser = await chromium.launch({ headless: true });
    browsers.push(browser);
    const context = await browser.newContext();
    contexts.push(context);
    const page = await context.newPage();
    pages.push(page);
    await page.goto(BASE_URL);
    await page.click(SELECTOR_PLAY_NOW);
    await page.fill(SELECTOR_LOGIN, accounts[i]);
    await page.fill(SELECTOR_PASSWORD, accounts[i]);
    await page.click(SELECTOR_LOGIN_SUBMIT);
    await page.click(SELECTOR_PLAY_NOW);
  }
});

test.afterEach(async () => {
  for (const browser of browsers) {
    await browser.close();
  }
});

test.setTimeout(999999);
test('Challenge flow between N instances', async () => {
  // Each odd account challenges the next even account, and the even accepts
  for (let i = 0; i < accounts.length; i += 2) {
    // User_1 Open Friends
    const battleButton = await pages[i].waitForSelector(SELECTOR_FRIENDS_BUTTON, { timeout: 15000 });
    await battleButton.scrollIntoViewIfNeeded();
    await battleButton.click();

    // User_1 Initiate Challenge
    const challengeRow = await pages[i].waitForSelector(SELECTOR_CHALLENGE_ROW(accounts[i + 1]), { timeout: 999000 });
    const rowElement = await challengeRow.evaluateHandle(node => node.closest('[class*="row"]'));
    const challengeButton = await rowElement.asElement()?.$(SELECTOR_CHALLENGE_BUTTON);
    if (challengeButton) {
      await challengeButton.click();
    } else {
      throw new Error(`Challenge button not found for ${accounts[i + 1]}`);
    }

    // User_2 Accept
    const acceptButton = await pages[i + 1].waitForSelector(SELECTOR_ACCEPT_BUTTON, { timeout: 15000 });
    await acceptButton.click();
  }

  // Wait for 2 minutes
  await pages[0].waitForTimeout(2 * 60 * 1000);

  // Close all browsers
  for (const browser of browsers) {
    await browser.close();
  }
});
