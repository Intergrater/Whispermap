/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {Object} - Validation result with isValid flag and feedback message
 */
export const validatePassword = (password) => {
  // Check if password is at least 8 characters long
  const isLongEnough = password.length >= 8;
  
  // Check if password contains at least one uppercase letter
  const hasUppercase = /[A-Z]/.test(password);
  
  // Check if password contains at least one lowercase letter
  const hasLowercase = /[a-z]/.test(password);
  
  // Check if password contains at least one number
  const hasNumber = /\d/.test(password);
  
  // Check if password contains at least one special character
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  // Calculate password strength (0-4)
  const strength = [isLongEnough, hasUppercase, hasLowercase, hasNumber, hasSpecialChar]
    .filter(Boolean).length;
  
  // Determine feedback message based on strength
  let feedback = '';
  let isValid = false;
  
  switch (strength) {
    case 0:
    case 1:
      feedback = 'Very weak password. Please make it stronger.';
      break;
    case 2:
      feedback = 'Weak password. Add more variety.';
      break;
    case 3:
      feedback = 'Medium strength password. Could be stronger.';
      break;
    case 4:
      feedback = 'Strong password!';
      isValid = true;
      break;
    case 5:
      feedback = 'Very strong password!';
      isValid = true;
      break;
    default:
      feedback = 'Please enter a password.';
  }
  
  // Create detailed feedback for missing requirements
  const missingRequirements = [];
  if (!isLongEnough) missingRequirements.push('at least 8 characters');
  if (!hasUppercase) missingRequirements.push('an uppercase letter');
  if (!hasLowercase) missingRequirements.push('a lowercase letter');
  if (!hasNumber) missingRequirements.push('a number');
  if (!hasSpecialChar) missingRequirements.push('a special character (!@#$%^&*(),.?":{}|<>)');
  
  const detailedFeedback = missingRequirements.length > 0
    ? `Your password needs ${missingRequirements.join(', ')}.`
    : '';
  
  return {
    isValid,
    strength,
    feedback,
    detailedFeedback,
    strengthText: ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'][Math.min(strength, 4)]
  };
}; 