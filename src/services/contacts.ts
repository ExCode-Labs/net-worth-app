/**
 * Thin wrapper over the OS contact picker. Opens the native picker and returns
 * the chosen person's name + first phone number. Degrades to a no-op (null) when
 * the contacts module isn't built into this binary (Expo Go / web).
 */
type ContactsMod = typeof import("expo-contacts");
let contacts: ContactsMod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  contacts = require("expo-contacts") as ContactsMod;
} catch {
  contacts = null;
}

export const contactsAvailable = !!contacts;

export interface PickedContact {
  name: string;
  phone: string;
}

/** Open the OS contact picker. Returns {name, phone}, or null if cancelled /
 *  unavailable. The native picker handles its own permission prompt. */
export async function pickContact(): Promise<PickedContact | null> {
  if (!contacts) return null;
  const c = await contacts.Contact.presentPicker();
  if (!c) return null;
  const [givenName, familyName, phones] = await Promise.all([
    c.getGivenName(),
    c.getFamilyName(),
    c.getPhones(),
  ]);
  const name = [givenName, familyName].filter(Boolean).join(" ").trim() || "";
  return {
    name,
    phone: phones?.[0]?.number?.trim() ?? "",
  };
}
