import QuoteProfile from "../models/QuoteProfileSchema.js";
import {
    QUOTE_BRANDING,
    DEFAULT_PAYMENT_NOTES,
    buildPaymentNotesFromProfile,
} from "../config/quoteBranding.js";

/** Map DB profile → HTML/PDF branding object */
export const profileToBranding = (profile) => {
    if (!profile) return null;
    return {
        companyName: profile.companyName,
        tagline: profile.tagline || "#TeamDigiCoders",
        website: profile.website || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        gstNote: profile.gstNote || QUOTE_BRANDING.gstNote,
        validityDays: profile.validityDays ?? 30,
        paymentTerms: (profile.paymentTerms || "").trim(),
        paymentBankDetails: (profile.paymentBankDetails || "").trim(),
        paymentTimeline: (profile.paymentTimeline || "").trim(),
        paymentOtherNotes: (profile.paymentOtherNotes || "").trim(),
        paymentNotes: buildPaymentNotesFromProfile(profile),
        logoUrl: profile.logo?.url || null,
        paymentQrUrl: profile.paymentQr?.url || null,
        profileName: profile.name,
    };
};

export const defaultBranding = () => ({
    ...QUOTE_BRANDING,
    paymentTerms: "",
    paymentBankDetails: "",
    paymentTimeline: "",
    paymentOtherNotes: "",
    paymentNotes: DEFAULT_PAYMENT_NOTES,
    logoUrl: null,
    paymentQrUrl: null,
    profileName: null,
});

/**
 * Resolve branding for a quote: profile on quote → company default profile → static config.
 */
export const resolveQuoteBranding = async (quote, companyId) => {
    const cid = companyId || quote?.companyId;
    let profile = null;

    if (quote?.quoteProfileId) {
        profile = await QuoteProfile.findOne({
            _id: quote.quoteProfileId,
            companyId: cid,
            isDeleted: false,
        }).lean();
    }

    if (!profile && cid) {
        profile = await QuoteProfile.findOne({
            companyId: cid,
            isDefault: true,
            isDeleted: false,
        }).lean();
    }

    return profileToBranding(profile) || defaultBranding();
};
