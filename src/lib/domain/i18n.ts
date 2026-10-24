/**
 * SynapseEvent — India-First Internationalization & Localization Module
 *
 * Provides utilities for:
 * - Indian number and currency formatting (₹, Lakhs, Crores, integer paise)
 * - Indian date presentation (DD MMM YYYY)
 * - Timezone defaults (Asia/Kolkata, IST)
 * - Indian phone number validation (+91 support & international E.164)
 * - Indian PIN code validation (6-digit postal code)
 */

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const INDIAN_TIMEZONE = "Asia/Kolkata";
export const SUPPORTED_CURRENCIES = ["INR", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a YYYY-MM-DD date string into an Indian-friendly presentation:
 * e.g., "2026-11-24" -> "24 Nov 2026"
 */
export function formatIndianDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return dateStr || "";

  // Match YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    // Attempt parsing ISO date or return original
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = MONTH_NAMES[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }

  const [, year, monthNum, day] = match;
  const monthIdx = parseInt(monthNum!, 10) - 1;
  const month = MONTH_NAMES[monthIdx] ?? monthNum;
  return `${day} ${month} ${year}`;
}

/**
 * Validates Indian mobile numbers (+91, 0, or plain 10 digits starting with 6-9)
 * while permitting international numbers (starting with +).
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  normalized?: string;
  isIndian: boolean;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, isIndian: false, error: "Phone number is required." };
  }

  const clean = phone.trim().replace(/[\s\-()]/g, "");

  // Indian phone formats:
  // +919876543210 (13 chars)
  // 919876543210 (12 chars)
  // 09876543210 (11 chars)
  // 9876543210 (10 chars)
  const indian10DigitRegex = /^[6-9]\d{9}$/;

  if (clean.startsWith("+91")) {
    const raw10 = clean.slice(3);
    if (indian10DigitRegex.test(raw10)) {
      return { isValid: true, normalized: `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`, isIndian: true };
    }
    return { isValid: false, isIndian: true, error: "Indian mobile number must be 10 digits starting with 6-9." };
  }

  if (clean.startsWith("91") && clean.length === 12) {
    const raw10 = clean.slice(2);
    if (indian10DigitRegex.test(raw10)) {
      return { isValid: true, normalized: `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`, isIndian: true };
    }
  }

  if (clean.startsWith("0") && clean.length === 11) {
    const raw10 = clean.slice(1);
    if (indian10DigitRegex.test(raw10)) {
      return { isValid: true, normalized: `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`, isIndian: true };
    }
  }

  if (clean.length === 10 && indian10DigitRegex.test(clean)) {
    return { isValid: true, normalized: `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`, isIndian: true };
  }

  // International format: + followed by 8 to 15 digits
  if (/^\+\d{8,15}$/.test(clean)) {
    return { isValid: true, normalized: clean, isIndian: false };
  }

  return {
    isValid: false,
    isIndian: false,
    error: "Please enter a valid 10-digit Indian phone (+91) or international phone (+XXX).",
  };
}

/**
 * Validates an Indian 6-digit Postal Index Number (PIN Code).
 * Cannot start with 0.
 */
export function validateIndianPinCode(pin: string): {
  isValid: boolean;
  clean?: string;
  error?: string;
} {
  if (!pin || typeof pin !== "string") {
    return { isValid: false, error: "PIN code is required." };
  }
  const clean = pin.trim().replace(/\s/g, "");
  const isValid = /^[1-9]\d{5}$/.test(clean);
  if (!isValid) {
    return {
      isValid: false,
      error: "PIN code must be a 6-digit Indian postal code starting with 1-9.",
    };
  }
  return { isValid: true, clean };
}

/**
 * Prominent Indian celebration hubs for autofill / suggestion.
 */
export const INDIAN_CELEBRATION_HUBS = [
  { city: "Bengaluru", state: "Karnataka", label: "Bengaluru, Karnataka" },
  { city: "Jaipur", state: "Rajasthan", label: "Jaipur, Rajasthan" },
  { city: "Udaipur", state: "Rajasthan", label: "Udaipur, Rajasthan" },
  { city: "Mumbai", state: "Maharashtra", label: "Mumbai, Maharashtra" },
  { city: "Delhi NCR", state: "Delhi", label: "Delhi NCR" },
  { city: "Hyderabad", state: "Telangana", label: "Hyderabad, Telangana" },
  { city: "Goa", state: "Goa", label: "Goa (Coastal Destination)" },
  { city: "Chennai", state: "Tamil Nadu", label: "Chennai, Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal", label: "Kolkata, West Bengal" },
  { city: "Pune", state: "Maharashtra", label: "Pune, Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat", label: "Ahmedabad, Gujarat" },
  { city: "Chandigarh", state: "Punjab/Haryana", label: "Chandigarh" },
  { city: "Lucknow", state: "Uttar Pradesh", label: "Lucknow, Uttar Pradesh" },
  { city: "Kochi", state: "Kerala", label: "Kochi, Kerala" },
];
