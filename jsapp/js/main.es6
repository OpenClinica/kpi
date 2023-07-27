/**
 * The Project Management app bundle file. All the required setup is done here
 * plus it is the file that is handling the root rendering.
 */

require('jquery-ui/ui/widgets/sortable');
require('jquery-ui/ui/widgets/resizable');

import 'select2/dist/js/select2.full';

import moment from 'moment';
import AllRoutes from 'js/router/allRoutes';
import RegistrationPasswordApp from './registrationPasswordApp';
import {AppContainer} from 'react-hot-loader';
import '@babel/polyfill'; // required to support Array.prototypes.includes in IE11
import React from 'react';
import {Cookies} from 'react-cookie';
import {render} from 'react-dom';
import {csrfSafeMethod, currentLang} from 'utils';
import {
  initCrossStorageClient,
  addCustomEventListener,
  setPeriodicCrossStorageCheck,
  checkCrossStorageTimeOut,
  checkCrossStorageUser,
  updateCrossStorageTimeOut
} from './ocutils';
import actions from './actions';
import sessionStore from './stores/session';

require('../scss/main.scss');
import Modal from 'react-modal';

// Tell moment library what is the app language
moment.locale(currentLang());

// Setup the authentication of AJAX calls
$.ajaxSetup({
  beforeSend: function (xhr, settings) {
    let csrfToken = '';
    try {
      csrfToken = document.cookie.match(/csrftoken=(\w{64})/)[1];
    } catch (err) {
      console.error('Cookie not matched');
    }
    if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
      const cookies = new Cookies();
      xhr.setRequestHeader(
        'X-CSRFToken',
        csrfToken || cookies.get('csrftoken')
      );
    }
  },
});

initCrossStorageClient();

function crossStorageCheck() {
  const currentUserName = sessionStore.currentAccount.username;
  if (currentUserName !== '') {
    // console.log('crossStorageCheck');
    const crossStorageUserName = currentUserName.slice(0, currentUserName.lastIndexOf('+'))
    checkCrossStorageUser(crossStorageUserName)
      .then(checkCrossStorageTimeOut)
      .catch(function(err) {
        if (err == 'logout' || err == 'user-changed') {
          logout();
        }
      });
  }
}

function crossStorageCheckAndUpdate() {
  const currentUserName = sessionStore.currentAccount.username;
  if (currentUserName !== '') {
    // console.log('crossStorageCheckAndUpdate');
    const crossStorageUserName = currentUserName.slice(0, currentUserName.lastIndexOf('+'))
    checkCrossStorageUser(crossStorageUserName)
      .then(checkCrossStorageTimeOut)
      .then(updateCrossStorageTimeOut)
      .catch(function(err) {
        if (err == 'logout' || err == 'user-changed') {
          logout();
        }
      });
  }
}

function logout() {
  console.log('main logout');
  actions.auth.logout();
}

[ { element: 'button', event: 'click' },
  { element: '.btn', event: 'click' },
  { element: '.questiontypelist__item', event: 'click' },
  { element: '.group__header__buttons__button', event: 'click' },
  { element: '.card__settings', event: 'click' },
  { element: 'body', event: 'keydown' }
].forEach(function(elementEvent) {
  addCustomEventListener(elementEvent.element, elementEvent.event, function() {
    crossStorageCheckAndUpdate();
  });
});

setPeriodicCrossStorageCheck(crossStorageCheck);

if (document.head.querySelector('meta[name=kpi-root-path]')) {
  // Create the element for rendering the app into
  const el = (() => {
    const $d = $('<div>', {id: 'kpiapp'});
    $('body').prepend($d);
    Modal.setAppElement('#kpiapp');
    return $d.get(0);
  })();

  render(<AllRoutes />, el);

  if (module.hot) {
    module.hot.accept('js/app', () => {
      let AllRoutes = require('js/app').default;
      render(
        <AppContainer>
          <AllRoutes />
        </AppContainer>,
        el
      );
    });
  }
} else {
  console.error('no kpi-root-path meta tag set. skipping react-router init');
}

// Handles rendering a small app in the registration form
document.addEventListener('DOMContentLoaded', () => {
  const registrationPasswordAppEl = document.getElementById(
    'registration-password-app'
  );
  if (registrationPasswordAppEl) {
    render(
      <AppContainer>
        <RegistrationPasswordApp />
      </AppContainer>,
      registrationPasswordAppEl
    );
  }
});
