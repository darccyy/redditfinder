console.log("\n  --- Starting RedditFinder by darcy ---\n");
then = Date.now();
// Import modules
const F = require("fnct");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

var fails = 0;
var headless = true;
// headless = false; // Uncomment to see browser
async function main() {
  fails = 0;
  fs.writeFileSync(path.join(__dirname, "output.txt"), "");
  // Start puppeteer
  console.log("Launching");
  while (true) {
    try {
      browser = await puppeteer.launch({headless, defaultViewport: null, args: ['--start-maximized']});
      [page] = await browser.pages();
      await page.goto("https://www.reddit.com/login");
      break;
    } catch {
      await error();
    }
  }
  
  // Log into reddit account
  console.log("Authenticating Account");
  if (process.argv[2] && process.argv[3]) {
    user = {username: process.argv[2], password: process.argv[3]};
  } else {
    try {
      user = JSON.parse(fs.readFileSync(path.join(__dirname, "user.json")));
    } catch {
      console.log("No username / password given.");
      process.exit();
    }
  }
  var {username, password} = user;
  if (!user) {
    console.error("No username given.");
    process.exit();
  }
  if (!password) {
    console.error("No password given.");
    process.exit();
  }
  while (true) {
    try {
      // Fill username
      await page.$$eval("#loginUsername", (el, username) => {
        el[0].value = username;
      }, username);

      // Fill password
      await page.$$eval("#loginPassword", (el, password) => {
        el[0].value = password;

        // Click button
        document.querySelector("body > div > main > div.OnboardingStep.Onboarding__step.mode-auth > div > div.Step__content > form > fieldset:nth-child(8) > button").click();
      }, password);
      break;
    } catch {
      await error();
    }
  }
  
  // Wait for page to finish loading
  while (true) {
    try {
      await page.waitForNavigation();
      break;
    } catch {
      await error();
    }
  }

  console.log("Beginning Search\n");
  subs = fs.readFileSync(path.join(__dirname, "input.txt")).toString().toLowerCase().split("\r\n");
  subs = subs.shuffle() // Shuffles the order
  output = [];
  for (i = 0; i < subs.length; i++) {
    // Check if name is valid
    if (!subs || subs[i].replaceAll(/[a-z0-9_]{3,21}/gi, "")) {
      continue;
    }

    url = "https://www.reddit.com/r/{0}".format(subs[i]);
    process.stdout.write("{perc}% - {name} {url}{fill}".format({
      perc: ((i / subs.length) * 100).round(2).toFixed(2).fill(5),
      name: "< {0} >".format(subs[i]).capWords().center(15, " ", ),
      url,
      fill: " ".repeat(15 - subs[i].length),
    }));

    // Navigate to link
    while (true) {
      try {
        await page.goto(url);
        break;
      } catch {
        await error();
      }
    }
    
    // Check for 'Create Community' button
    while (true) {
      try {
        available = await page.evaluate(async () => {
          return await new Promise(resolve => {
            el = document.querySelector("#create-community-button");
            resolve(el ? true : false);
          });
        });
        break;
      } catch {
        await error();
      }
    }

    // Output value
    console.log(available ? ":) Available <--------" : "Unavailable :(");
    if (available) {
      output.push("{name}{fill}https://reddit.com/r/{0}".format({
        name: subs[i],
        fill: " ".repeat(35 - subs[i].length),
      }));
    }
    fs.writeFileSync(path.join(__dirname, "output.txt"), output.join("\r\n"));
  }

  // Final things
  browser.close();
  time = (Date.now() - then).toTime();
  console.log("\nCompleted in {time} {unit}\n{amount} / {total} Available ({perc}%)\n{fails} Program fails\n".format({
    amount: output.length,
    total: subs.length,
    perc: ((output.length / subs.length) * 100).round(2),
    fails,
    time: time[0].round(2),
    unit: time[1],
  }));
};

main();

// Error message
function error() {
  console.log("> Failed. Retrying");
  fails++;
  return new Promise(resolve => {
    setTimeout(resolve, 1000);
  });
}