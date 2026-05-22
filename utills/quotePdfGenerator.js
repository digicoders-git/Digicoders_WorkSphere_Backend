import puppeteer from "puppeteer";

let browserPromise = null;

const getBrowser = async () => {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
    }
    return browserPromise;
};

/**
 * Render quote HTML to A4 PDF buffer (for email attachment).
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
export const generateQuotePdfBuffer = async (html) => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
        });
        return Buffer.from(pdf);
    } finally {
        await page.close();
    }
};
