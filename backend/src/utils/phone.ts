/**
 * Normalizes phone numbers to standard international format (+91XXXXXXXXXX for India by default)
 */
export const normalizePhoneNumber = (phone: string, defaultCountryCode = '91'): string => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number must be a non-empty string');
  }

  // Remove whitespace, dashes, parens
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    // Already in international format
    const digitsOnly = cleaned.slice(1).replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      throw new Error('Invalid international phone number length');
    }
    return `+${digitsOnly}`;
  }

  // Handle leading 00 (common international prefix)
  if (cleaned.startsWith('00')) {
    const digitsOnly = cleaned.slice(2).replace(/\D/g, '');
    return `+${digitsOnly}`;
  }

  // Handle leading 0 (domestic trunk prefix e.g. 09876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  // If 10 digits (standard Indian mobile format)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // If 12 digits starting with country code e.g. 919876543210
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Generic fallback if all digits
  const allDigits = cleaned.replace(/\D/g, '');
  if (allDigits.length >= 10 && allDigits.length <= 15) {
    return `+${allDigits}`;
  }

  throw new Error('Invalid phone number format');
};
