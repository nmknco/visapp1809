// import * as React from 'react';

// import {
//   MINIMAP_D,
//   MINIMAP_D_PREVIEW,
//   MINIMAP_MAR,
//   MINIMAP_PAD,
// } from './commons/constants';
// import {
//   Data,
//   HandleHoverFilter,
//   HandleRemoveFilter,
//   MinimapScaleMap,
// } from './commons/types';

// interface MinimapProps {
//   readonly dataFiltered: Data,
//   readonly scales: Readonly<MinimapScaleMap>,
//   readonly xAttrName: string,
//   readonly yAttrName: string,
//   readonly onClick: HandleRemoveFilter,
//   readonly onHover: HandleHoverFilter,
//   readonly dimension: number,
//   readonly isPreview?: boolean,
// }

// class Minimap extends React.PureComponent<MinimapProps> {

//   private getFilteredIds = () => 
//     new Set(this.props.dataFiltered.map(d => d.__id_extra__));

//   private handleClick = () =>
//     this.props.onClickRestore(this.getFilteredIds());

//   private handleHover = (ev: React.MouseEvent<Element>) =>
//     this.props.onHover(ev, this.getFilteredIds())

//   render() {
//     const { dataFiltered, xAttrName, yAttrName, isPreview, } = this.props;

//     const dimension = this.props.dimension || isPreview ? MINIMAP_D_PREVIEW : MINIMAP_D
//     const r = isPreview ? 1 : 2;

//     let {scales: {xScale, yScale}} = this.props;
//     xScale = xScale && xScale.copy().range([MINIMAP_PAD, dimension - MINIMAP_PAD]);
//     yScale = yScale && yScale.copy().range([dimension - MINIMAP_PAD, MINIMAP_PAD]);
    
//     return (
//       <div
//         className="minimap"
//         style={{padding: MINIMAP_MAR, flex: `0 0 ${dimension + MINIMAP_MAR * 2}px`}}
//       >
//         <svg 
//           className="minimap__svg" 
//           width={dimension}
//           height={dimension}
//         >
//           {xScale && yScale &&
//             dataFiltered.map(
//             d => <circle
//               key={d.__id_extra__}
//               className="minimap__dot"
//               cx={xScale!(d[xAttrName])} 
//               cy={yScale!(d[yAttrName])} 
//               r={r}
//             />
//           )}
//         </svg>
//         {!isPreview &&
//           <div 
//             className="minimap__overlay text-right"
//             style={{
//               top: MINIMAP_MAR,
//               left: MINIMAP_MAR,
//               width: dimension,
//               height: dimension,
//             }}
//             onClick={this.handleClick}
//             onMouseEnter={this.handleHover}
//             onMouseLeave={this.handleHover}
//           >
//             <div 
//               className="minimap__restore-text text-center"
//             > 
//               Click to restore
//             </div>
//           </div>
//         }
//       </div>
//     );
//   }
// }

// export { Minimap };