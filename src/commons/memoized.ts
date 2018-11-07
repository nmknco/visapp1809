import * as d3 from 'd3';

import { Attribute } from '../Attribute';

import { NoExtentError } from './errors';
import { Data } from './types';

const arrSame = (arr1: any[], arr2: any[]) => {
  return (arr1.length === arr2.length) && arr1.every((d, i) => d === arr2[i]);
}

export const memoizeLast = (fn: (...args: any[]) => any) => {
  let called: boolean = false;
  let lastArgs: any[];
  let lastResult: any;
  let lastThis: any;

  const wrap = function(this: any, ...args: any[]) { // `this` in the signature is a Typescript thing
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

// attributes
// extent
// valueSet

// TODO

// x and y scales
// color and size scales

export const memoizePureDataFn = (fn: (data: Data, attrName: string) => any) => {
  
  // assuming fn won't read `this` so we don't have to worry about it
  
  let lastData: Data;
  let results: object;

  const wrap = (data: Data, attrName: string) => { // can use arrow function
    if (data !== lastData) {
      lastData = data;
      results = {};
    }
    if (results.hasOwnProperty(attrName)) {
      return results[attrName];
    } else {
      const res = fn(data, attrName);
      results[attrName] = res;
      return res;
    }
  }

  return wrap;
}


export const memoizedGetExtent: (
  data: Data,
  attrName: string
) => Readonly<[number, number]> = memoizePureDataFn(
  (data: Data, attrName: string): Readonly<[number, number]> => {
    console.log('computing extent for: ', attrName);
    const [min, max] = d3.extent(data, d => d[attrName] as number);
    if (min === undefined || max === undefined) {
      throw new NoExtentError(attrName);
    }
    return [min, max];
  }
);

export const memoizedGetValueSet: (
  data: Data,
  attrName: string,
) => ReadonlySet<number|string> = memoizePureDataFn(
  (data: Data, attrName: string): ReadonlySet<number|string> => {
    console.log('computing value set for: ', attrName);
    return new Set(
      data.map(d => d[attrName])
          .sort((a, b) => (a === b) ? 0 :(a < b) ? -1 : 1)
    )
  }
)

export const memoizedGetAttributes = memoizeLast(
  (data: Data) => {
    console.log('computing attributes list')
    let attrList: Readonly<Attribute[]>
    if (data && data.length > 0) {
      const d0 = data[0];
      attrList = Object.keys(d0)
        .filter(attrName => attrName !== '__id_extra__')
        .map(attrName => new Attribute(
          attrName,
          (typeof d0[attrName] === 'number') ? 'number' : 'string'
        ));
    } else {
      attrList = [];
    };
    return attrList;
  }
);