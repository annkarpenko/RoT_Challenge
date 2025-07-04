import { test, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { BASE_URL, accounts } from '../test-data/config_copy';

// Selectors
const SELECTOR_PLAY_NOW = 'button.primary:has-text("Play Now")';
const SELECTOR_LOGIN = '#FormInput-login';
const SELECTOR_PASSWORD = '#FormInput-password';
const SELECTOR_LOGIN_SUBMIT = 'button.primary[type="submit"]:has-text("Log In")';
const SELECTOR_FRIENDS_BUTTON = '[class*="bottomLeft"] [class^="battleButtonContainer"]';
const SELECTOR_CHALLENGE_ROW = (opponent: string) => '[class*="row"] [class*="partner"]:has-text("' + opponent + '")';
const SELECTOR_CHALLENGE_BUTTON = 'button:has-text("Challenge")';
const SELECTOR_ACCEPT_BUTTON = 'button[class*="primary"]:has-text("Accept")';
const SELECTOR_BATTLE_START_BUTTON = 'div[class*="battleButtonContainer"] span:text("Battle")';
const SELECTOR_SELECT_BUTTON = 'button[class*="selectButton"]';
const SELECTOR_TITAN_IMAGE = 'div[class*="titanImage"][class*="characterImage"]';

let browser: Browser;
let contexts: BrowserContext[] = [];
let pages: Page[] = [];

test.beforeEach(async () => {
  browser = await chromium.launch({ headless: true });
  contexts = [];
  pages = [];
  for (let i = 0; i < accounts.length; i++) {
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
  for (const context of contexts) {
    await context.close();
  }
  await browser.close();
});

test.setTimeout(999999);
test('Challenge flow between N contexts', async () => {
  // Each odd account challenges the next even account, and the even accepts
  for (let i = 0; i < accounts.length - 1; i += 2) {
    // User_1 Open Friends
    const battleButton = await pages[i].waitForSelector(SELECTOR_FRIENDS_BUTTON, { timeout: 15000 });
    await battleButton.scrollIntoViewIfNeeded();
    await battleButton.click();

    // User_1 Initiate Challenge
    const challengeRow = await pages[i].waitForSelector(SELECTOR_CHALLENGE_ROW(accounts[i + 1]), { timeout: 15000 });
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

    // User_1
    const titanImage1 = await pages[i].waitForSelector(SELECTOR_TITAN_IMAGE, { timeout: 999000 });
    await titanImage1.click();
    const selectButton1 = await pages[i].waitForSelector(SELECTOR_SELECT_BUTTON, { timeout: 15000 });
    await selectButton1.click();

    // User_1 clicks the Battle button after select
    const battleStartButton1 = await pages[i].waitForSelector(SELECTOR_BATTLE_START_BUTTON, { timeout: 15000 });
    await battleStartButton1.click();

    //User_2
    const titanImage2 = await pages[i + 1].waitForSelector(SELECTOR_TITAN_IMAGE, { timeout: 999000 });
    await titanImage2.click();

    const selectButton2 = await pages[i + 1].waitForSelector(SELECTOR_SELECT_BUTTON, { timeout: 15000 });
    await selectButton2.click();

    const battleStartButton2 = await pages[i + 1].waitForSelector(SELECTOR_BATTLE_START_BUTTON, { timeout: 15000 });
    await battleStartButton2.click();

  }

  //
  await Promise.all(
    pages.map(async (page, idx) => {
      if (idx % 2 === 0) {
        // User_1
        await page.waitForTimeout(2 * 60 * 1000);
        await contexts[idx].close();
      } else {
        // User_2
        await page.waitForTimeout(3 * 70 * 1000);
        await contexts[idx].close();
      }
    })
  );
});
