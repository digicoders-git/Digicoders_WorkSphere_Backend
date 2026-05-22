import { DEFAULT_PAYMENT_NOTES } from "../config/quoteBranding.js";
import { defaultBranding } from "./resolveQuoteBranding.js";

const esc = (s) =>
    String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")} /-`;

const isClientSidePrice = (req) => {
    if (!req) return false;
    if (req.priceType === "client_side") return true;
    if (req.priceType === "amount") return false;
    const term = (req.term || "").trim().toLowerCase();
    return term === "client side" && !(Number(req.price) > 0);
};

const formatReqPrice = (req) => {
    if (isClientSidePrice(req)) return "Client Side";
    if (Number(req.price) > 0) return fmt(req.price);
    return "—";
};

export const buildQuoteHtml = (quote, lead, options = {}) => {
    const baseUrl = (options.clientBaseUrl || "http://localhost:5173").replace(/\/$/, "");
    const b = options.branding || defaultBranding();
    const logoUrl = b.logoUrl || `${baseUrl}/logo.png`;

    const currentDate = new Date(quote.createdAt || Date.now()).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const proposedLabel = quote.proposedSystemCategory
        ? quote.proposedSystemCategory === "Other"
            ? quote.proposedSystemOther || "Other"
            : quote.proposedSystemCategory
        : quote.proposedSystem || "Website/Application/Portal";

    const pages = quote.pages?.filter((p) => p.name) || [];
    const tech = quote.techStack?.filter((t) => t.label) || [];
    const reqs = quote.otherRequirements?.filter((r) => r.requirement) || [];
    const quoteNotesOverride = quote.notes?.trim() || "";

    const buildPaymentSection = () => {
        if (quoteNotesOverride) {
            return `<div class="notes">${esc(quoteNotesOverride)}</div>`;
        }
        const blocks = [];
        if (b.paymentTerms) {
            blocks.push(
                `<p class="pay-label">Payment terms</p><div class="notes">${esc(b.paymentTerms)}</div>`
            );
        }
        if (b.paymentBankDetails) {
            blocks.push(
                `<p class="pay-label">Bank &amp; payment details</p><div class="notes">${esc(b.paymentBankDetails)}</div>`
            );
        }
        if (b.paymentTimeline) {
            blocks.push(
                `<p class="pay-label">Development timeline</p><div class="notes">${esc(b.paymentTimeline)}</div>`
            );
        }
        if (b.paymentOtherNotes) {
            blocks.push(
                `<p class="pay-label">Additional notes</p><div class="notes">${esc(b.paymentOtherNotes)}</div>`
            );
        }
        if (b.paymentQrUrl) {
            blocks.push(
                `<div class="payment-qr-wrap"><p class="pay-label">Scan to pay (UPI / QR)</p><img class="payment-qr" src="${esc(b.paymentQrUrl)}" alt="Payment QR" /></div>`
            );
        }
        if (blocks.length) return blocks.join("");
        return `<div class="notes">${esc(b.paymentNotes || DEFAULT_PAYMENT_NOTES)}</div>`;
    };

    const paymentSectionHtml = buildPaymentSection();

    const pagesRows = pages
        .map(
            (page, i) => `
        <tr>
            <td><strong>${String.fromCharCode(97 + i)}. ${esc(page.name)}</strong></td>
            <td>One Time</td>
            <td class="amount">${fmt(page.cost)}</td>
        </tr>`
        )
        .join("");

    const moduleBlocks = pages
        .map(
            (page, i) => `
        <div class="module-card">
            <div class="module-head">
                <span class="module-letter">${String.fromCharCode(97 + i)}.</span>
                <span class="module-title">${esc(page.name)}</span>
                <span class="module-cost">[Cost: ${fmt(page.cost)}]</span>
            </div>
            ${
                page.descriptions?.filter(Boolean).length
                    ? `<ul class="feature-list">${page.descriptions
                          .filter(Boolean)
                          .map((d) => `<li>${esc(d)}</li>`)
                          .join("")}</ul>`
                    : ""
            }
        </div>`
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${esc(quote.title)} — ${esc(quote.systemName)}</title>
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 210mm; max-width: 210mm; color: #1e293b; background: #fff; font-size: 12px; line-height: 1.45; font-family: "Segoe UI", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { width: 100%; max-width: 186mm; margin: 0 auto; padding: 8mm 10mm 12mm; }
        .cover { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #0d47a1; margin-bottom: 24px; }
        .cover img { height: 56px; margin-bottom: 10px; }
        .cover h1 { margin: 0; font-size: 20px; color: #0d47a1; font-weight: 700; }
        .cover .company { font-size: 14px; color: #334155; margin-top: 6px; font-weight: 600; }
        .cover .tag { font-size: 12px; color: #64748b; margin-top: 4px; }
        .salutation { background: #f8fafc; border-left: 4px solid #0d47a1; padding: 14px 16px; margin-bottom: 22px; font-size: 13px; color: #475569; }
        .salutation strong { color: #0f172a; }
        h2.section { font-size: 14px; color: #0d47a1; margin: 18px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; break-after: avoid; page-break-after: avoid; }
        .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 700; margin-bottom: 2px; }
        .value { font-size: 13px; margin-bottom: 10px; }
        .system-banner { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
        .system-banner .line1 { font-size: 12px; color: #1d4ed8; font-weight: 600; }
        .system-banner .line2 { font-size: 18px; font-weight: 700; color: #0d47a1; margin-top: 4px; }
        .module-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        .module-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-bottom: 8px; }
        .module-letter { font-weight: 700; color: #0d47a1; }
        .module-title { font-weight: 700; font-size: 14px; flex: 1; }
        .module-cost { font-weight: 700; color: #0d47a1; font-size: 12px; }
        .feature-list { margin: 0; padding-left: 20px; color: #475569; }
        .feature-list li { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
        th { background: #0d47a1; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .amount { text-align: right; white-space: nowrap; font-weight: 600; }
        tr.subtotal td { background: #f1f5f9; font-weight: 700; }
        tr.grand td { background: #0d47a1; color: #fff; font-size: 15px; font-weight: 700; }
        tr.gst td { background: #fef3c7; color: #92400e; font-size: 12px; }
        .tech-line { padding: 8px 12px; background: #f8fafc; border-left: 3px solid #3b82f6; margin-bottom: 8px; font-size: 12px; }
        .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; white-space: pre-wrap; font-size: 12px; color: #78350f; margin-bottom: 10px; }
        .pay-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #0d47a1; font-weight: 700; margin: 14px 0 6px; }
        .payment-qr-wrap { text-align: center; margin: 16px 0 8px; break-inside: avoid; page-break-inside: avoid; }
        .payment-qr { max-width: 168px; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #fff; }
        .footer { margin-top: 28px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #64748b; }
        .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
        .sign-box { border-top: 1px solid #94a3b8; padding-top: 8px; min-height: 48px; font-size: 11px; color: #64748b; }
        @media print {
            html, body { width: 210mm; margin: 0; padding: 0; background: #fff !important; }
            .page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; }
            .module-card, table, tr, .notes, .sign-row { break-inside: avoid; page-break-inside: avoid; }
            h2.section { break-after: avoid; page-break-after: avoid; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="cover">
            <img src="${logoUrl}" alt="DigiCoders" onerror="this.style.display='none'" />
            <h1>Proposal For ${esc(proposedLabel)} from ${b.tagline}</h1>
            <p class="company">${esc(b.companyName)}</p>
            <p class="tag">${esc(b.website)} · ${esc(b.email)}</p>
        </div>

        <div class="salutation">
            <strong>Hello ${esc(lead?.contactPerson || "Sir/Ma'am")},</strong><br/>
            As per your requirements, we at ${b.tagline} have prepared this proposal for
            <strong>${esc(lead?.orgName || "your organization")}</strong>.
            Please review the scope, costing, and terms below.
        </div>

        <div class="client-grid">
            <div>
                <div class="label">Prepared for</div>
                <div class="value"><strong>${esc(lead?.orgName || "—")}</strong></div>
                <div class="label">Contact</div>
                <div class="value">${esc(lead?.contactPerson || "—")}</div>
                <div class="label">Email / Phone</div>
                <div class="value">${esc(lead?.email || "—")} · ${esc(lead?.contactNumber || "—")}</div>
            </div>
            <div>
                <div class="label">Quote date</div>
                <div class="value">${currentDate}</div>
                <div class="label">Status</div>
                <div class="value" style="text-transform:capitalize;">${esc(quote.status)}</div>
                ${
                    quote.createdBy
                        ? `<div class="label">Prepared by</div><div class="value">${esc(quote.createdBy.firstName)} ${esc(quote.createdBy.lastName)}</div>`
                        : ""
                }
            </div>
        </div>

        <div class="system-banner">
            <div class="line1">Proposed System for &rarr; ${esc(proposedLabel)}</div>
            <div class="line2">1. System Name &rarr; ${esc(quote.systemName)}</div>
        </div>

        ${
            moduleBlocks
                ? `<h2 class="section">Modules &amp; features</h2>${moduleBlocks}`
                : ""
        }

        ${
            tech.length
                ? `<h2 class="section">Tech Stack</h2>${tech
                      .map((t) => `<div class="tech-line">${esc(t.label)}${t.value ? ` — ${esc(t.value)}` : ""}</div>`)
                      .join("")}`
                : ""
        }

        ${
            reqs.length
                ? `
        <h2 class="section">Other Requirements for &rarr; ${esc(quote.systemName)}</h2>
        <table>
            <thead><tr><th>Requirement</th><th>Term</th><th class="amount">Price</th></tr></thead>
            <tbody>
                ${reqs
                    .map(
                        (r) => `
                <tr>
                    <td>${esc(r.requirement)}</td>
                    <td>${esc(r.term || "—")}</td>
                    <td class="amount">${formatReqPrice(r)}</td>
                </tr>`
                    )
                    .join("")}
            </tbody>
        </table>`
                : ""
        }

        ${
            pages.length
                ? `
        <h2 class="section">Costing for development</h2>
        <table>
            <thead><tr><th>Module / Page</th><th>Term</th><th class="amount">Price</th></tr></thead>
            <tbody>
                ${pagesRows}
                <tr class="subtotal"><td colspan="2">Sub Total</td><td class="amount">${fmt(quote.totalPagesCost)}</td></tr>
                ${
                    quote.totalRequirementsCost
                        ? `<tr class="subtotal"><td colspan="2">Other requirements</td><td class="amount">${fmt(quote.totalRequirementsCost)}</td></tr>`
                        : ""
                }
                <tr class="gst"><td colspan="2">${esc(b.gstNote)}</td><td class="amount">—</td></tr>
                <tr class="grand"><td colspan="2">Offered Price / Net Amount</td><td class="amount">${fmt(quote.grandTotal)}</td></tr>
            </tbody>
        </table>`
                : `
        <table><tbody>
            <tr class="grand"><td colspan="2">Offered Price / Net Amount</td><td class="amount">${fmt(quote.grandTotal)}</td></tr>
        </tbody></table>`
        }

        <h2 class="section">Payment method &amp; terms</h2>
        ${paymentSectionHtml}

        <div class="sign-row">
            <div class="sign-box"><strong>Client</strong><br/>Authorized signatory</div>
            <div class="sign-box"><strong>${esc(b.companyName)}</strong><br/>${esc(b.address)}<br/>Authorized signatory</div>
        </div>

        <div class="footer">
            <p>Valid for ${b.validityDays} days from quote date. * Terms &amp; Conditions apply.</p>
            <p>Contact: ${esc(b.phone)} · ${esc(b.email)} · ${esc(b.website)}</p>
        </div>
    </div>
</body>
</html>`;
};
