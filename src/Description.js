import React, { Component } from 'react';

import { Panel } from './Panel';

export class Description extends Component {
  render() {
    return (
      <Panel 
        className="description_panel"
        heading="Tips"
      >
        <ul className="pt-2 pr-4">
          <li>Click or drag to select data points. Hold CTRL to add or remove from the selection.</li>
          <li>Right click on selected points to open the colorpicker and assign a color to the group.</li>
          <li>Color one or more groups to see suggestions for color encoding. There must be at least one group with more than one points. </li>
        </ul>
      </Panel>
    );
  }
}