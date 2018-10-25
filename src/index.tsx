import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './App.js';
import './css/bootstrap.min.css';
import './css/index.css';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(
  <App />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();