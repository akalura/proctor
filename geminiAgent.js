 //import { chromium } from '@playwright/test';
 const { chromium } = require('@playwright/test');

fs = require("fs");
const PowerShell = require("powershell");


async function copyImageToClipboard(imagePath) {
  const command = `Add-Type -AssemblyName System.Drawing, System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile("${imagePath}"))`;
 
  await new Promise((resolve, reject) => {
    new PowerShell(command)
      .on("error", reject)
      .on("output", console.log)
      .on("error-output", console.error)
      .on("end", resolve);
  });
  console.log("Image copied to clipboard");
}


async function browserPlay(imagePath) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0];

  await page.goto('https://gemini.google.com/app');
  await page.waitForTimeout(1500);
  const elementLocator = page.locator('button:has-text("Explore Gems")')
  if (await elementLocator.isVisible() == false) {
    console.log('The Sidebar that shows preivous chats and gem is not visible');
    //await page.locator("//button[aria-label='Main menu']").click()
    await page.waitForTimeout(1500);
    await page.locator("//mat-icon[@fonticon='menu']").click()
  }

  await page.locator('span:has-text("Quiz")').click();

  await copyImageToClipboard(imagePath);

  await page.locator("//div[@aria-label='Enter a prompt here']").focus();
  await page.keyboard.press('Control+KeyV'); // Simulate Control+V

/*
  await page.locator("button[aria-label='Send message']").click();
  const data = await page.locator('code:visible').textContent();
  console.log(data);
*/

  await browser.close();
}



const imagePath = "C:/projects/certificationAssistant/sharedFolder/actual-question.jpg";
(async () => {
  await browserPlay(imagePath);

})();