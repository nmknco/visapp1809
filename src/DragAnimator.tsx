import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Attribute } from './Attribute';
import { AttrTag } from './Attributes';

import { ElementNotFoundError } from './commons/errors';
import { VField } from './commons/types';
import { Pos } from './commons/util';

const FRAME_INTV = 10;
const DRAGSPEED = 500;
const START_DELAY = 1000;
const END_DELAY = 1000;

const threshold = (FRAME_INTV / 1000) * DRAGSPEED

class DragAnimator {

  static showDragAnimation = (
    element: HTMLElement,
    start: Pos,
    end: Pos,
  ) => new Promise((resolve, reject) => {
    console.log('creating dragging animation');
    const dragContainer = document.querySelector('.drag-animation-container')!;
    dragContainer.appendChild(element);
    element.style.position = 'absolute';
    element.style['z-index'] = 20;

    const { x: x0, y: y0 } = start;
    const { x: x1, y: y1 } = end;
    const d = start.distTo(end);
    const xRate = (x1 - x0) / d;
    const yRate = (y1 - y0) / d;

    let currentPos = start;
    setPosition(element, currentPos);
    let t = 0;

    const pointer = document.createElement('i');
    pointer.className = 'far fa-hand-paper';
    Object.assign(pointer.style, {
      position: 'absolute',
      left: '20px',
      top: '20px',
    });
    // const handGrab = document.createElement('i');
    // handGrab.className = 'far fa-hand-rock';
    element.appendChild(pointer);
    
    setTimeout(() => {
      pointer.className = 'far fa-hand-rock';
    }, START_DELAY / 2);

    setTimeout(() => {
      const genFrame = () => {
        // console.log(currentPos.distTo(end));
        if (currentPos.distTo(end) < threshold) {
          clearInterval(anim);
          setTimeout(() => {
            pointer.className = 'far fa-hand-paper';
          }, END_DELAY / 2);
          setTimeout(() => {
            dragContainer.removeChild(element);
            resolve();
          }, END_DELAY);
        } else {
          t += FRAME_INTV;
          // console.log(currentPos.x, currentPos.y)
          currentPos = new Pos(
            x0 + xRate * (t / 1000) * DRAGSPEED,
            y0 + yRate * (t / 1000) * DRAGSPEED,
          );
          setPosition(element, currentPos);
        }
      };
      const anim = setInterval(genFrame, FRAME_INTV);
    }, START_DELAY);
  });

  static showDragAttrTagAnimation = (
    field: VField,
    attrName: string,
  ) => {
    console.log('creating dragging attribute tag animation');

    const originalEl: HTMLElement | null = document.querySelector('#attr-' + attrName);
    const destEl: HTMLElement | null = document.querySelector('#encoding-' + field);
    if (!originalEl || !destEl) {
      throw new ElementNotFoundError('Cannot find origin or destination element for dragging animation.');
    }
    const start = getPos(originalEl);
    const end = getPos(destEl);
    const endPadded = new Pos(end.x + 5, end.y + 5);
    
    const dragged = document.createElement('div');
    ReactDOM.render(
      <AttrTag 
        attribute={new Attribute(attrName, 'number')}
      />,
      dragged,
    );

    return DragAnimator.showDragAnimation(dragged, start, endPadded);
  };

}

const setPosition = (
  element: HTMLElement,
  pos: Pos,
) => {
  element.style.left = pos.x + 'px';
  element.style.top = pos.y + 'px';
};

const getPos = (element: HTMLElement) => {
  const scrollLeft = window.pageXOffset || document.documentElement!.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement!.scrollTop;
  const rect = element.getBoundingClientRect();
  return new Pos(
    rect.left + scrollLeft,
    rect.top + scrollTop,
  );
}

export { DragAnimator };