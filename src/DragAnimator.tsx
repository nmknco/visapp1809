import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Attribute } from './Attribute';
import { AttrTag } from './Attributes';

import { MINIMAP_D } from './commons/constants';
import { ElementNotFoundError } from './commons/errors';
import { 
  AnimationConfig,
  VField,
} from './commons/types';
import { Pos } from './commons/util';

const FRAME_INTV = 10;

class DragAnimator {
  
  static showDragAnimation = (
    element: HTMLElement,
    start: Pos,
    end: Pos,
    animationConfig: AnimationConfig,
    showPointer: boolean,
  ) => new Promise((resolve, reject) => {
    console.log('creating dragging animation');
    
    const {dragSpeed, startDelay, endDelay} = animationConfig;
    const threshold = (FRAME_INTV / 1000) * dragSpeed;

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

    let pointer: HTMLElement;
    if (showPointer) {
      pointer = document.createElement('i');
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
      }, startDelay / 2);
    }

    setTimeout(() => {
      const genFrame = () => {
        // console.log(currentPos.distTo(end));
        if (currentPos.distTo(end) < threshold) {
          clearInterval(anim);
          if (showPointer) {
            setTimeout(() => {
              pointer.className = 'far fa-hand-paper';
            }, endDelay / 2);
          }
          setTimeout(() => {
            dragContainer.removeChild(element);
            resolve();
          }, endDelay);
        } else {
          t += FRAME_INTV;
          // console.log(currentPos.x, currentPos.y)
          currentPos = new Pos(
            x0 + xRate * (t / 1000) * dragSpeed,
            y0 + yRate * (t / 1000) * dragSpeed,
          );
          setPosition(element, currentPos);
        }
      };
      const anim = setInterval(genFrame, FRAME_INTV);
    }, startDelay);
  });

  static showDragAttrTagAnimation = (
    field: VField,
    attrName: string,
  ) => {
    console.log('creating dragging attribute tag animation');

    const dragged = document.createElement('div');
    ReactDOM.render(
      <AttrTag 
        attribute={new Attribute(attrName, 'number')}
      />,
      dragged,
    );

    const start = getPosBySelector('#attr-' + attrName);
    const end = getPosBySelector('#encoding-' + field);
    const endPadded = new Pos(end.x + 5, end.y + 5);
    const animConfig = {
      dragSpeed: 500,
      startDelay: 1000,
      endDelay: 1000,
    }

    return DragAnimator.showDragAnimation(dragged, start, endPadded, animConfig, true);
  };

  static showDragFilteredPointsAnimation = (
    filteredIds: string[],
  ) => {
    // console.log('creating drag animation for filtered points');
    // console.log(filteredIds);
    
    const animationPromises: Array<Promise<{}>> = [];
    for (const id of filteredIds) {
      
      // only copy the ring
      const point: HTMLElement | null = document.querySelector(`#point-${id}>.circle-ring`);
      if (!point) {
        console.log(id)
        throw new ElementNotFoundError(`Cannot find point`);
      }
      const r = point.getAttribute('r');
      if (!r) { continue; }
      const containerSize = Number(r) * 2 + 2;
      const pointCopy = point.cloneNode(true) as HTMLElement;
      pointCopy.id += '-copy';
      pointCopy.classList.remove('hidden');
      pointCopy.setAttribute('transform', `translate(${containerSize/2}, ${containerSize/2})`);

      const pointCopyDiv = document.createElement('div');
      const pointCopySvg = document.createElementNS(
        'http://www.w3.org/2000/svg', 'svg'); // seems to has transparent-background by default
      pointCopySvg.setAttribute('width', containerSize + 'px');
      pointCopySvg.setAttribute('height', containerSize + 'px');
      pointCopySvg.appendChild(pointCopy);
      pointCopyDiv.appendChild(pointCopySvg);
      
      const start = getPosBySelector('#point-' + id);
      const end = getPosBySelector('#filtered-point-minimap');
      const endPadded = new Pos(end.x + MINIMAP_D/2, end.y + MINIMAP_D/2);
      const animConfig = {
        dragSpeed: 1200,
        startDelay: 0,
        endDelay: 0,
      }

      animationPromises.push(
        DragAnimator.showDragAnimation(pointCopyDiv, start, endPadded, animConfig, false)
      );
    }

    return Promise.all(animationPromises);
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

const getPosBySelector = (selector: string) => {
  const el: HTMLElement | null = document.querySelector(selector);
  if (!el) {
    throw new ElementNotFoundError(`Cannot find element "${selector}"`);
  }
  return getPos(el);
}

export { DragAnimator };