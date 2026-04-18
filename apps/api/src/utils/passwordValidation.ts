export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  rules: PasswordRule[];
  message: string;
}

// Top 100 most common passwords
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', '111111', 'iloveyou', 'master',
  'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja',
  'mustang', 'password123', 'starwars', '123456789', 'batman', 'access', 'login',
  'princess', 'solo', 'passpass', 'stargate', 'qwertyuiop', 'abc123456', 'gorgeous',
  'morgan', 'bear', 'cookie', 'yellow', 'soccer', 'london', 'summer', 'fitness',
  'thomas', 'robert', 'password1', 'orange', 'swordfish', 'purple', 'coffee',
  'ginger', 'cooper', 'hunter', 'awesome', 'flower', 'master', 'hammer', 'silver',
  'diamond', 'venture', 'pepper', 'bridge', 'thunder', 'danger', 'winter', 'random',
  'pencil', 'turtle', 'twelve', 'doctor', 'garden', 'rabbit', 'falcon', 'castle',
  'puzzle', 'wizard', 'travel', 'school', 'mother', 'father', 'sister', 'brother',
  'friend', 'secret', 'profit', 'freedom', 'liberty', 'justice',
]);

const SPECIAL_CHARS = new Set('!@#$%^&*()_+-=[]{}|;:,.<>?');
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const DIGIT_REGEX = /\d/;

export function validatePasswordStrength(
  password: string,
  emailUsername?: string
): PasswordValidationResult {
  const rules: PasswordRule[] = [];
  let passedRules = 0;

  // Rule 1: Minimum 8 characters
  const minLength = password.length >= 8;
  rules.push({
    id: 'min-length',
    label: 'At least 8 characters',
    passed: minLength,
  });
  if (minLength) passedRules++;

  // Rule 2: Maximum 128 characters
  const maxLength = password.length <= 128;
  rules.push({
    id: 'max-length',
    label: 'Maximum 128 characters',
    passed: maxLength,
  });
  if (maxLength) passedRules++;

  // Rule 3: At least 1 uppercase letter
  const hasUppercase = UPPERCASE_REGEX.test(password);
  rules.push({
    id: 'uppercase',
    label: 'At least 1 uppercase letter (A-Z)',
    passed: hasUppercase,
  });
  if (hasUppercase) passedRules++;

  // Rule 4: At least 1 lowercase letter
  const hasLowercase = LOWERCASE_REGEX.test(password);
  rules.push({
    id: 'lowercase',
    label: 'At least 1 lowercase letter (a-z)',
    passed: hasLowercase,
  });
  if (hasLowercase) passedRules++;

  // Rule 5: At least 1 digit
  const hasDigit = DIGIT_REGEX.test(password);
  rules.push({
    id: 'digit',
    label: 'At least 1 digit (0-9)',
    passed: hasDigit,
  });
  if (hasDigit) passedRules++;

  // Rule 6: At least 1 special character
  const hasSpecialChar = Array.from(password).some((char) =>
    SPECIAL_CHARS.has(char)
  );
  rules.push({
    id: 'special-char',
    label: 'At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
    passed: hasSpecialChar,
  });
  if (hasSpecialChar) passedRules++;

  // Rule 7: Not a common password
  const isCommonPassword = COMMON_PASSWORDS.has(password.toLowerCase());
  rules.push({
    id: 'not-common',
    label: 'Not a commonly used password',
    passed: !isCommonPassword,
  });
  if (!isCommonPassword) passedRules++;

  // Rule 8: No more than 3 consecutive identical characters
  const hasConsecutiveChars = /(.)\1{3,}/.test(password);
  rules.push({
    id: 'no-consecutive',
    label: 'No more than 3 consecutive identical characters',
    passed: !hasConsecutiveChars,
  });
  if (!hasConsecutiveChars) passedRules++;

  // Rule 9: Not just the email username portion
  const isEmailUsername =
    emailUsername && password.toLowerCase() === emailUsername.toLowerCase();
  rules.push({
    id: 'not-email-username',
    label: 'Not the same as email username',
    passed: !isEmailUsername,
  });
  if (!isEmailUsername) passedRules++;

  // Calculate score (0-100)
  let score = Math.round((passedRules / rules.length) * 100);

  // Bonus points for password length > 12
  if (password.length > 12) {
    score = Math.min(100, score + 5);
  }

  // Bonus points for mixed special characters (more than 1 type of special char)
  const specialCharTypes = new Set(
    Array.from(password).filter((char) => SPECIAL_CHARS.has(char))
  );
  if (specialCharTypes.size > 1) {
    score = Math.min(100, score + 3);
  }

  // Bonus points for length > 16
  if (password.length > 16) {
    score = Math.min(100, score + 2);
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 75) {
    strength = 'good';
  } else if (score < 90) {
    strength = 'strong';
  } else {
    strength = 'excellent';
  }

  // Determine valid (must pass core rules: min length, max length, and at least 4 of the character type rules)
  const coreRulesPassed =
    minLength &&
    maxLength &&
    [hasUppercase, hasLowercase, hasDigit, hasSpecialChar].filter(Boolean)
      .length >= 4;
  const valid =
    coreRulesPassed &&
    !isCommonPassword &&
    !hasConsecutiveChars &&
    !isEmailUsername;

  // Generate message
  let message = '';
  if (valid) {
    if (strength === 'excellent') {
      message = 'Excellent password strength';
    } else if (strength === 'strong') {
      message = 'Strong password';
    } else if (strength === 'good') {
      message = 'Good password strength';
    } else {
      message = 'Fair password strength, but acceptable';
    }
  } else {
    const failedRules = rules.filter((rule) => !rule.passed);
    if (failedRules.length === 1) {
      message = `Password does not meet: ${failedRules[0].label}`;
    } else {
      message = `Password does not meet requirements: ${failedRules
        .map((r) => r.label)
        .join(', ')}`;
    }
  }

  return {
    valid,
    score,
    strength,
    rules,
    message,
  };
}
