/**
 * Masks sensitive IDs for display purposes
 * Shows first 4 and last 4 characters with asterisks in between
 * Example: "abc123def456ghi789" -> "abc1****i789"
 */
export function maskId(id: string | undefined | null, showChars: number = 4): string {
  if (!id) return "N/A";
  
  // If ID is too short, just show asterisks
  if (id.length <= showChars * 2) {
    return "*".repeat(id.length);
  }
  
  const start = id.slice(0, showChars);
  const end = id.slice(-showChars);
  return `${start}****${end}`;
}

/**
 * Masks email addresses for display
 * Example: "user@example.com" -> "us***@example.com"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return "N/A";
  
  const [localPart, domain] = email.split("@");
  if (!domain) return maskId(email);
  
  const maskedLocal = localPart.length <= 2 
    ? "*".repeat(localPart.length)
    : localPart.slice(0, 2) + "*".repeat(Math.min(localPart.length - 2, 5));
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Generates a short display ID from a full ID
 * Example: "abc123def456ghi789jkl" -> "ABC1-I789"
 */
export function shortDisplayId(id: string | undefined | null, prefix?: string): string {
  if (!id) return "N/A";
  
  const start = id.slice(0, 4).toUpperCase();
  const end = id.slice(-4).toUpperCase();
  
  if (prefix) {
    return `${prefix}-${start}${end}`;
  }
  
  return `${start}-${end}`;
}

/**
 * Creates a provider-friendly display ID
 * Example: "abc123def456" -> "PRV-ABC1-F456"
 */
export function providerDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "PRV");
}

/**
 * Creates a property-friendly display ID
 * Example: "abc123def456" -> "PROP-ABC1-F456"
 */
export function propertyDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "PROP");
}

/**
 * Creates a user-friendly display ID
 * Example: "abc123def456" -> "USR-ABC1-F456"
 */
export function userDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "USR");
}

/**
 * Creates a student-friendly display ID
 * Example: "abc123def456" -> "STU-ABC1-F456"
 */
export function studentDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "STU");
}

/**
 * Creates an invoice-friendly display ID
 * Example: "abc123def456" -> "INV-ABC1-F456"
 */
export function invoiceDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "INV");
}

/**
 * Creates a ticket-friendly display ID
 * Example: "abc123def456" -> "TKT-ABC1-F456"
 */
export function ticketDisplayId(id: string | undefined | null): string {
  return shortDisplayId(id, "TKT");
}
