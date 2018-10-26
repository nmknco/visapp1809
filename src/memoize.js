const arrSame = (arr1, arr2) => {
  return (arr1.length === arr2.length) && arr1.every((d, i) => d === arr2[i]);
}

export const memoizeLast = (fn) => {
  let called = false;
  let lastArgs;
  let lastResult;
  let lastThis;

  const wrap = function(...args) { 
    // Use function expr declaration to get the right `this`
    // `arguments` may not work for arrow funcs
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