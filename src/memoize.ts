const arrSame = (arr1: any[], arr2: any[]) => {
  return (arr1.length === arr2.length) && arr1.every((d, i) => d === arr2[i]);
}

export const memoizeLast = (fn: (...args: any[]) => any) => {
  let called: boolean = false;
  let lastArgs: any[];
  let lastResult: any;
  let lastThis: any;

  const wrap = function(this: any, ...args: any[]) {
    // Use function expr declaration to get the right, unbounded, `this`.
    // Also `arguments` may not work for arrow funcs
    if (called && this === lastThis && arrSame(args, lastArgs)) {
      return lastResult;
    }

    lastResult = fn.apply(this, args);
    called = true;
    lastArgs = args;
    lastThis = this;

    return lastResult
  }

  return wrap;
}