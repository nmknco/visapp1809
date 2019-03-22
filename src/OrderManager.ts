import * as d3 from 'd3';

import {
  NestedDataEntry,
  Order,
  PField,
  RecommendedEncoding,
} from './commons/types';

// stores persistent order info and make recommendations

class OrderManager {
  private order: Order | null;

  constructor(
  ) {
    this.order = null;
  };

  getOrder = () => this.order;

  setOrder = (order: Order) => {
    this.order = order;
  };

}

class OrderUtil {
  static getOrderFunction = (order: Order) => 
    (a: NestedDataEntry, b: NestedDataEntry) => 
      (order.asce ? d3.ascending : d3.descending)(a.value![order.attrName], b.value![order.attrName]);

  static getRecommendedOrder = (
    customOrderedNestedData: NestedDataEntry[],
    numberOfResult: number,
  ): Order[] => {
    const e0 = customOrderedNestedData[0];
    if (!e0 || !e0.value) {
      return [];
    }

    const scores = [];
    const attrList = Object.keys(e0.value);
    for (const attrName of attrList) {
      scores.push({
        attrName,
        score: OrderUtil.getOrderDiffScore(customOrderedNestedData, attrName)
      });
    }

    scores.sort((a: {attrName: string, score: number}, b: {attrName: string, score: number}) =>
      Math.abs(b.score) - Math.abs(a.score) // score ordered by abs (so that both asce/desc covered)
    );

    return scores.slice(0, numberOfResult)
        .map((d): Order =>
          ({attrName: d.attrName, asce: d.score > 0})
        );
  };

  private static getOrderDiffScore = (
    customOrderedNestedData: NestedDataEntry[],
    attrName: string,
  ) => {
    // positive score = ascending
    const a = customOrderedNestedData;
    let score = 0;
    for (let i = 0; i < a.length - 1; i++) {
      const cmp = (a[i+1].value![attrName] - a[i].value![attrName]); 
      score += Math.sign(cmp);
    }
    return score;
  };

  static getRecommendedYByOrder = (
    nestedData: NestedDataEntry[],
    heights: {[key: string]: number},
    numberOfResult: number,
  ) => {
    const e0 = nestedData[0];
    if (!e0 || !e0.value) {
      return [];
    }

    const scores = [];
    const attrList = Object.keys(e0.value);
    for (const attrName of attrList) {
      scores.push({
        attrName,
        score: OrderUtil.getOrderDiffScoreFromHeights(nestedData, heights, attrName)
      });
    }

    scores.sort((a: {attrName: string, score: number}, b: {attrName: string, score: number}) =>
      b.score - a.score
    );

    return scores.slice(0, numberOfResult)
        .map((d): RecommendedEncoding =>
          ({field: PField.Y, attrName: d.attrName})
        );
  }

  private static getOrderDiffScoreFromHeights = (
    nestedData: NestedDataEntry[],
    heights: {[key: string]: number},
    attrName: string,
  ) => {
    const a = nestedData;
    let score = 0;
    for (let i = 0; i < a.length - 1; i++) {
      const cmp = (a[i].value![attrName] - a[i + 1].value![attrName]) * 
        (heights[a[i].key] - heights[a[i + 1].key]);
      score += Math.sign(cmp);
    }
    return score;
  }
}

export { OrderManager, OrderUtil };