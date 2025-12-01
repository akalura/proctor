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
  const startTime = Date.now();
  console.log(`⏱️  Starting browserPlay execution for: ${imagePath}`);
  
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0];

  page.bringToFront();
  
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

  await page.locator("button[aria-label='Send message']").click();
  await page.waitForTimeout(3000);  //wait for three second
  await page.locator("button[aria-label='Send message']").focus()  //wait for send button to visible, it means, the response has processed

  //console.log(sendMessage.textContent());
  //await page.waitForTimeout(6000);
  //const data = await page.locator('code:visible').textContent();

  const data = await page.locator('code:visible')
                        .or(page.locator("p[data-path-to-node='0']"))
                        .textContent();

  console.log(data);

  await browser.close();

  const endTime = Date.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`✅ browserPlay completed in ${executionTime} seconds`);

  return data;
}


// Export functions
module.exports = {
  copyImageToClipboard,
  browserPlay
};


// Execute if called directly
if (require.main === module) {
  const imagePath = "C:/projects/proctor/sharedFolder/screenshot_20251129_143303_348172.jpeg";
  (async () => {
    await browserPlay(imagePath);
  })();
}