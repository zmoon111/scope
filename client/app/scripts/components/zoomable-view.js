import React from 'react';
import { connect } from 'react-redux';
import { debounce } from 'lodash';
import { fromJS } from 'immutable';

// import Logo from '../components/logo';
import ZoomableCanvas from './zoomable-canvas';
import { cacheZoomState } from '../actions/app-actions';
import { activeTopologyZoomCacheKeyPathSelector } from '../selectors/zooming';


import { ZOOM_CACHE_DEBOUNCE_INTERVAL } from '../constants/timer';


class ZoomableView extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {};

    this.debouncedCacheZoom = debounce(this.cacheZoom.bind(this), ZOOM_CACHE_DEBOUNCE_INTERVAL);
    this.updateState = this.updateState.bind(this);
  }

  componentDidMount() {
    this.zoomRestored = false;
    this.restoreZoomState(this.props);
  }

  componentWillUnmount() {
    this.debouncedCacheZoom.cancel();
  }

  componentWillReceiveProps(nextProps) {
    const layoutChanged = nextProps.layoutId !== this.props.layoutId;

    // If the layout has changed (either active topology or its options) or
    // relayouting has been requested, stop pending zoom caching event and
    // ask for the new zoom settings to be restored again from the cache.
    if (layoutChanged || nextProps.forceRelayout) {
      this.debouncedCacheZoom.cancel();
      this.zoomRestored = false;
    }

    if (!this.zoomRestored) {
      this.restoreZoomState(nextProps);
    }
  }

  render() {
    return (
      <div className="zoomable-view">
        <ZoomableCanvas onUpdateZoom={this.updateState} {...this.props}>
          {transform => this.props.children(transform)}
        </ZoomableCanvas>
      </div>
    );
  }

  cacheZoom() {
    this.props.cacheZoomState(fromJS(this.state));
  }

  // Restore the zooming settings
  restoreZoomState(props) {
    if (!props.layoutZoomState.isEmpty()) {
      const zoomState = props.layoutZoomState.toJS();

      // Update the state variables.
      this.setState(zoomState);
      this.zoomRestored = true;
    }
  }

  updateState(cachableState) {
    this.setState(cachableState);
    this.debouncedCacheZoom();
  }
}


function mapStateToProps(state, props) {
  return {
    layoutZoomState: props.zoomStateSelector(state),
    layoutZoomLimits: props.zoomLimitsSelector(state),
    layoutId: JSON.stringify(activeTopologyZoomCacheKeyPathSelector(state)),
    forceRelayout: state.get('forceRelayout'),
  };
}


export default connect(
  mapStateToProps,
  { cacheZoomState }
)(ZoomableView);
