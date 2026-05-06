import puppeteer from "puppeteer";
import fsPromises from "fs/promises";

async function scrapeLeetcodeProblems() {
  const response = await fetch("https://leetcode.com/api/problems/all/");
  const data = await response.json();

  const problems = data.stat_status_pairs
    .slice(0, 100)
    .map((item) => ({
      title: item.stat.question__title,
      url: `https://leetcode.com/problems/${item.stat.question__title_slug}/`,
      description: "",
    }));

  await fsPromises.mkdir("./problems", { recursive: true });

  await fsPromises.writeFile(
    "./problems/leetcode_problems.json",
    JSON.stringify(problems, null, 2)
  );

  console.log(`✅ Saved ${problems.length} LeetCode problems`);
}

async function scrapeCodeforcesProblems() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/114.0.5735.199 Safari/537.36"
  );

  const problems = [];
  const TARGET = 1;

  for (let i = 0; i <= TARGET; i++) {
    const url = `https://codeforces.com/problemset/page/${i}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const problemSelector =
      "table.problems tr td:nth-of-type(2) > div:first-of-type > a";

    const links = await page.evaluate((sel) => {
      const anchors = document.querySelectorAll(sel);
      return Array.from(anchors).map((a) => a.href);
    }, problemSelector);

    for (let j = 0; j < 5; j++) {
      const link = links[j];

      try {
        await page.goto(link, { waitUntil: "domcontentloaded" });

        const { title, description } = await page.evaluate(() => {
          const titleEl = document.querySelector(".problem-statement .title");
          const title = titleEl ? titleEl.textContent.split(". ")[1] || titleEl.textContent : "";

          const descEl = document.querySelector(
            ".problem-statement > div:nth-of-type(2)"
          );
          const description = descEl ? descEl.textContent : "";

          return { title, description };
        });

        problems.push({ title, url: link, description });
      } catch (err) {
        console.warn(`❌ Failed to scrape ${link}: ${err.message}`);
      }
    }
  }

  await fsPromises.mkdir("./problems", { recursive: true });

  await fsPromises.writeFile(
    "./problems/codeforces_problems.json",
    JSON.stringify(problems, null, 2)
  );

  await browser.close();
}

scrapeCodeforcesProblems();
scrapeLeetcodeProblems();