function validateEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  // Check there's exactly one '@'
  const atIndex = email.indexOf("@");
  if (atIndex === -1) {
    return false; // No '@' symbol
  }
  if (email.indexOf("@", atIndex + 1) !== -1) {
    return false; // More than one '@'
  }

  // Split local and domain parts using slice
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // Local and domain parts must not be empty
  if (local.length === 0 || domain.length === 0) {
    return false;
  }

  // Local part cannot start or end with '.'
  if (local.startsWith(".") || local.endsWith(".")) {
    return false;
  }

  // Domain must contain at least one '.' and not start or end with '-'
  const dotIndex = domain.indexOf(".");
  if (dotIndex === -1) {
    return false; // No '.' in domain
  }
  if (domain.startsWith("-") || domain.endsWith("-")) {
    return false;
  }

  // Check domain does not have consecutive dots '..'
  if (domain.includes("..")) {
    return false;
  }

  // Check domain parts don't start or end with '-'
  // We'll check each domain label by splitting manually using indexOf and slice:

  let start = 0;
  while (start < domain.length) {
    let nextDot = domain.indexOf(".", start);
    if (nextDot === -1) nextDot = domain.length;
    const label = domain.slice(start, nextDot);

    if (label.length === 0) {
      return false; // Empty label like "example..com"
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return false;
    }

    start = nextDot + 1;
  }

  // If all checks pass
  return true;
}
//task
regular expressions

