import React, {lazy, Suspense} from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import {observer} from 'mobx-react';
import Reflux from 'reflux';
import { NavLink } from 'react-router-dom';
import {stores} from '../stores';
import sessionStore from '../stores/session';
import bem from 'js/bem';
import {searches} from '../searches';
import mixins from '../mixins';
import LibrarySidebar from 'js/components/library/librarySidebar';
import HelpBubble from 'js/components/support/helpBubble';
import {
  COMMON_QUERIES,
  MODAL_TYPES,
} from '../constants';
import {ROUTES} from 'js/router/routerConstants';
import {assign} from 'utils';
import SidebarFormsList from '../lists/sidebarForms';
import envStore from 'js/envStore';
import {history} from 'js/router/historyRouter';
import { routerIsActive, withRouter } from '../router/legacy';

const AccountSidebar = lazy(() => import("js/account/accountSidebar"));

const INITIAL_STATE = {
  headerFilters: 'forms',
  searchContext: searches.getSearchContext('forms', {
    filterParams: {
      assetType: COMMON_QUERIES.s,
    },
    filterTags: COMMON_QUERIES.s,
  })
};

const FormSidebar = observer(class FormSidebar extends Reflux.Component {
  constructor(props){
    super(props);
    this.state = assign({
      currentAssetId: false,
      files: []
    }, stores.pageState.state);
    this.state = assign(INITIAL_STATE, this.state);

    this.stores = [
      stores.pageState
    ];
    this.unlisteners = [];
    autoBind(this);
  }
  componentDidMount() {
    this.unlisteners.push(
      history.listen(this.onRouteChange.bind(this))
    );
  }
  componentWillUnmount() {
    this.unlisteners.forEach((clb) => {clb();});
  }
  newFormModal (evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.NEW_FORM
    });
  }
  render() {
    return (
      <React.Fragment>
        <bem.KoboButton
          m={['blue', 'fullwidth']}
          disabled={!sessionStore.isLoggedIn}
          onClick={this.newFormModal}
        >
          {t('new')}
        </bem.KoboButton>
        <SidebarFormsList/>
      </React.Fragment>
    );
  }
  onRouteChange() {
    this.setState(INITIAL_STATE);
  }
});

FormSidebar.contextTypes = {
  router: PropTypes.object
};

reactMixin(FormSidebar.prototype, searches.common);
reactMixin(FormSidebar.prototype, mixins.droppable);

class DrawerLink extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }
  onClick (evt) {
    if (!this.props.href) {
      evt.preventDefault();
    }
    if (this.props.onClick) {
      this.props.onClick(evt);
    }
  }
  render () {
    var icon = (<i className={`k-icon-${this.props['k-icon']}`}/>);
    var classNames = [this.props.class, 'k-drawer__link'];

    var link;
    if (this.props.linkto) {
      link = (
        <NavLink to={this.props.linkto}
            className={classNames.join(' ')}
            data-tip={this.props.label}>
          {icon}
        </NavLink>
      );
    } else {
      link = (
        <a href={this.props.href || '#'}
            className={classNames.join(' ')}
            onClick={this.onClick}
            data-tip={this.props.label}>
            {icon}
        </a>
      );
    }
    return link;
  }
}

const Drawer = observer(class Drawer extends Reflux.Component {
  constructor(props){
    super(props);
    autoBind(this);
    this.stores = [
      stores.pageState,
    ];
  }

  isAccount() {
    return routerIsActive(ROUTES.ACCOUNT_ROOT);
  }

  render() {
    // no sidebar for not logged in users
    if (!sessionStore.isLoggedIn) {
      return null;
    }

    return (
      <bem.KDrawer>

        <bem.KDrawer__sidebar>
          { this.isLibrary()
            ? <LibrarySidebar />
            : (this.isFormList() || this.isFormSingle()) && <FormSidebar />
          }
        </bem.KDrawer__sidebar>

        <bem.KDrawer__secondaryIcons>
          { sessionStore.currentAccount &&
            (!this.isLibrary() && 
            <a href='https://docs.openclinica.com/oc4/design-study/form-designer'
              className='k-drawer__link'
              target='_blank'
              data-tip={t('Learn more about Form Designer')}
            >
              <i className='k-icon k-icon-help' />
            </a>)
          }
        </bem.KDrawer__secondaryIcons>
      </bem.KDrawer>
      );
  }
});

reactMixin(Drawer.prototype, searches.common);
reactMixin(Drawer.prototype, mixins.droppable);
reactMixin(Drawer.prototype, mixins.contextRouter);

Drawer.contextTypes = {
  router: PropTypes.object
};

export default withRouter(Drawer);
