export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "Au moins 8 caractères", test: (password) => password.length >= 8 },
  { key: "uppercase", label: "Une lettre majuscule", test: (password) => /[A-Z]/.test(password) },
  { key: "number", label: "Un chiffre", test: (password) => /[0-9]/.test(password) },
  { key: "special", label: "Un caractère spécial", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function getPasswordRequirements(password = "") {
  return PASSWORD_REQUIREMENTS.map(({ key, label, test }) => ({ key, label, met: test(password) }));
}

export function isStrongPassword(password = "") {
  return getPasswordRequirements(password).every(({ met }) => met);
}
