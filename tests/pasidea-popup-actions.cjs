const assert=require('node:assert/strict');
const {withApp,openGames,selectGame}=require('./helpers/browser.cjs');
withApp(async page=>{
 await openGames(page);await selectGame(page,'othello');
 const cell=page.locator('#othello-board .is-playable').first();
 await cell.waitFor();
 const board=await page.locator('#othello-board').boundingBox();
 assert.ok(board.width>100&&board.width<=1440&&board.height>100&&board.y+board.height<=1000,'playable board inside fullscreen');
 await cell.click();
 await page.screenshot({path:'test-artifacts/pasidea-game-popup.png'});
 await page.locator('#mini-app-dialog > header [data-cancel]').click();
 await page.locator('#mini-app-dialog').waitFor({state:'detached'});
 await require('./helpers/browser.cjs').quickTile(page,'files');
 await page.locator('#cc-dialog').waitFor();
 const files=await page.locator('#cc-dialog').boundingBox();
 assert.ok(files.width>1000&&files.width>files.height,'landscape Files popup');
 assert.equal(await page.locator('#cc-app-section').isVisible(),false);
 await page.locator('#cc-dialog [data-cc=panel][data-id=search]').click();
 for(const width of [768,375,320]){
  await page.setViewportSize({width,height:900});
  const box=await page.locator('#cc-dialog').boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width,'Files/Search stays in viewport');
  assert.equal(await page.locator('#cc-app-section').isVisible(),true);
  await page.locator('#cc-app-section').selectOption('workspace');
  await page.locator('#cc-app-section').selectOption('search');
  await page.locator('#cc-query').fill('テスト');
  assert.equal(await page.locator('#cc-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'no horizontal overflow');
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#cc-dialog [data-cc=close]').click();
 await page.locator('#cc-dialog').waitFor({state:'detached'});
 await page.locator('#home-calendar-card').click();
 await page.locator('.cc-calendar-cell').first().waitFor();
 assert.equal(await page.locator('.cc-calendar-cell').count(),42);
 assert.ok((await page.locator('#cc-dialog').boundingBox()).width<=1200);
 console.log('PASS: fullscreen GameBox play, landscape Files/Search switching and Calendar');
}).catch(e=>{console.error(e);process.exitCode=1;});
