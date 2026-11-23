import { chromium } from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:5173');await page.waitForTimeout(1500);
  await page.screenshot({path:'artifacts/laboratory-desktop.png',fullPage:true});
  await page.locator('.laboratory').screenshot({path:'artifacts/material-playground.png'});
  await page.getByRole('button',{name:'Test grid',exact:true}).click();await page.getByRole('button',{name:'Merge surfaces',exact:false}).click();await page.waitForTimeout(1000);
  await page.locator('.laboratory').screenshot({path:'artifacts/material-calibration.png'});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173');await page.waitForTimeout(1500);
  await page.screenshot({path:'artifacts/laboratory-mobile.png',fullPage:true});
} finally {await browser.close();}
