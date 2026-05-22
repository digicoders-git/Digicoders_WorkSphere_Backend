export const QUOTE_BRANDING = {
    companyName: "DigiCoders Technologies (P) Ltd.",
    tagline: "#TeamDigiCoders",
    website: "www.digicoders.in",
    email: "digicoderstech@gmail.com",
    phone: "+91-6394296293",
    address:
        "2nd Floor, B-36, Sector 'O', CMS School Road, Ram Ram Bank Chauraha, Aliganj, Lucknow, UP, 226024",
    gstNote: "18% GST (Tax) — Excluded unless specified",
    validityDays: 30,
};

export const DEFAULT_PAYMENT_TERMS = `Payment Terms:
• 1st installment 40% in advance to start development.
• 2nd installment 30% at completion of 50% of working modules.
• Final 30% at delivery of all modules as per requirements.`;

export const DEFAULT_PAYMENT_BANK = `Bank / UPI:
DigiCoders Technologies Private Limited
Central Bank of India · A/c 3755419817 · IFSC CBIN0280145`;

export const DEFAULT_PAYMENT_TIMELINE =
    "Development timeline: Typically 20–25 working days for this scope (subject to client inputs and approvals).";

export const DEFAULT_PAYMENT_OTHER = "GST 18% excluded from offered development price unless specified.";

/** Combined block for legacy callers */
export const DEFAULT_PAYMENT_NOTES = [
    DEFAULT_PAYMENT_TERMS,
    DEFAULT_PAYMENT_BANK,
    DEFAULT_PAYMENT_TIMELINE,
    DEFAULT_PAYMENT_OTHER,
].join("\n\n");

export const buildPaymentNotesFromProfile = (profile = {}) => {
    const parts = [
        profile.paymentTerms,
        profile.paymentBankDetails,
        profile.paymentTimeline,
        profile.paymentOtherNotes,
    ].map((s) => (s || "").trim()).filter(Boolean);
    if (parts.length) return parts.join("\n\n");
    return (profile.paymentNotes || "").trim() || DEFAULT_PAYMENT_NOTES;
};
