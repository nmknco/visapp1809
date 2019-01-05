class CustomError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

// TODO: Either get rid of all these or 
//        Use a factory, use object 
// const CreateCustomErrorClass = {
 
// }


export class NoStatError extends CustomError {
  constructor(attrName: string, statName: 'median' | 'average' | 'extent', message?: string) {
    super(message || `Can't find ${statName} for attribute ${attrName}. (d3.mean() returns undefined)`);
    this.name = 'NoStatError';
  }
}

export class NoMeanError extends CustomError {
  constructor(attrName: string, message?: string) {
    super(message || `Can't find mean for attribute ${attrName}. (d3.mean() returns undefined)`);
    this.name = 'NoMeanError';
  }
}

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

export class ElementNotFoundError extends CustomError {
  constructor(message?: string) {
    super(message || 'Cannot find the html element');
    this.name = 'ElementNotFoundError';
  }
}
