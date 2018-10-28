import * as React from 'react';
import * as ReactDOM from 'react-dom';

import AppContainer from './AppContainer';
import './css/bootstrap.min.css';
import './css/index.css';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(
  <AppContainer />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();