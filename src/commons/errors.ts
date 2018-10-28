class UserError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export class NoMedianError extends UserError {
  constructor(message?: string) {
    super(message || 'Can\'t find median of group for interpolating color scale');
    this.name = 'NoMedianError';
  }
}

export class InvalidHSLStringError extends UserError {
  constructor(message?: string) {
    super(message || 'Invalid HSL string. Valid format: hsl(240, 80%, 50%)');
    this.name = 'InvalidHSLStringError';
  }
}