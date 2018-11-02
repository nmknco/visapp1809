class CustomError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

// TODO: Use a factory, use object 
// const CreateCustomErrorClass = {
 
// }

export class NoMedianError extends CustomError {
  constructor(attrName: string, message?: string) {
    super(message || `Can't find median for attribute ${attrName}. (d3.median() returns undefined)`);
    this.name = 'NoMedianError';
  }
}

export class NoExtentError extends CustomError {
  constructor(attrName: string, message?: string) {
    super(message || `Invalid extent for attribute ${attrName}. (d3.extent() returns undefined extremes)`);
    this.name = 'NoExtentError';
  }
}

export class InvalidHSLStringError extends CustomError {
  constructor(message?: string) {
    super(message || 'Invalid HSL string. Valid format: hsl(240, 80%, 50%)');
    this.name = 'InvalidHSLStringError';
  }
}

export class FilterIdError extends CustomError {
  constructor(message?: string) {
    super(message || 'Filter id passed to setFilter() or removeFilter() does not exist in the list');
    this.name = 'FilterIdError';
  }
}