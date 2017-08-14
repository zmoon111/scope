import React from 'react';
import { connect } from 'react-redux';
import { debounce, pick } from 'lodash';
import { fromJS } from 'immutable';

import { drag } from 'd3-drag';
import { event as d3Event, select } from 'd3-selection';

import Logo from '../components/logo';
import ZoomControl from '../components/zoom-control';
import { cacheZoomState } from '../actions/app-actions';
import { zoomFactor } from '../utils/zoom-utils';
import { transformToString } from '../utils/transform-utils';
import { activeTopologyZoomCacheKeyPathSelector } from '../selectors/zooming';
import {
  canvasMarginsSelector,
  canvasWidthSelector,
  canvasHeightSelector,
} from '../selectors/canvas';

import { ZOOM_CACHE_DEBOUNCE_INTERVAL } from '../constants/timer';


class ZoomableCanvas extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      minTranslateX: 0,
      maxTranslateX: 0,
      minTranslateY: 0,
      maxTranslateY: 0,
      translateX: 0,
      translateY: 0,
      minScale: 1,
      maxScale: 1,
      scaleX: 1,
      scaleY: 1,
    };

    this.debouncedCacheZoom = debounce(this.cacheZoom.bind(this), ZOOM_CACHE_DEBOUNCE_INTERVAL);
    this.handleZoomControlAction = this.handleZoomControlAction.bind(this);
    this.canChangeZoom = this.canChangeZoom.bind(this);
    this.handleZoom = this.handleZoom.bind(this);
    this.handlePan = this.handlePan.bind(this);
  }

  componentDidMount() {
    this.zoomRestored = false;
    // this.zoom = zoom().on('zoom', this.zoomed);
    this.svg = select('svg#canvas');
    this.drag = drag().on('drag', this.handlePan);
    this.svg.call(this.drag);

    // this.setZoomTriggers(!this.props.disabled);
    this.updateZoomLimits(this.props);
    this.restoreZoomState(this.props);
  }

  componentWillUnmount() {
    // this.setZoomTriggers(false);
    this.debouncedCacheZoom.cancel();
  }

  componentWillReceiveProps(nextProps) {
    const layoutChanged = nextProps.layoutId !== this.props.layoutId;
    // const disabledChanged = nextProps.disabled !== this.props.disabled;

    // If the layout has changed (either active topology or its options) or
    // relayouting has been requested, stop pending zoom caching event and
    // ask for the new zoom settings to be restored again from the cache.
    if (layoutChanged || nextProps.forceRelayout) {
      this.debouncedCacheZoom.cancel();
      this.zoomRestored = false;
    }

    // If the zooming has been enabled/disabled, update its triggers.
    // if (disabledChanged) {
    //   this.setZoomTriggers(!nextProps.disabled);
    // }

    this.updateZoomLimits(nextProps);
    if (!this.zoomRestored) {
      this.restoreZoomState(nextProps);
    }
  }

  handleZoomControlAction(scale) {
    // Update the canvas scale (not touching the translation).
    // this.svg.call(this.zoom.scaleTo, scale);

    // Update the scale state and propagate to the global cache.
    this.setState(this.cachableState({
      scaleX: scale,
      scaleY: scale,
    }));
    this.debouncedCacheZoom();
  }

  render() {
    // `forwardTransform` says whether the zoom transform is forwarded to the child
    // component. The advantage of that is more control rendering control in the
    // children, while the disadvantage is that it's slower, as all the children
    // get updated on every zoom/pan action.
    const { children, forwardTransform } = this.props;
    const transform = forwardTransform ? '' : transformToString(this.state);

    return (
      <div className="zoomable-canvas">
        <svg
          id="canvas" width="100%" height="100%"
          onClick={this.props.onClick} onWheel={this.handleZoom}>
          <Logo transform="translate(24,24) scale(0.25)" />
          <g className="zoom-content" transform={transform}>
            {forwardTransform ? children(this.state) : children}
          </g>
        </svg>
        {this.canChangeZoom() && <ZoomControl
          zoomAction={this.handleZoomControlAction}
          minScale={this.state.minScale}
          maxScale={this.state.maxScale}
          scale={this.state.scaleX}
        />}
      </div>
    );
  }

  // setZoomTriggers(zoomingEnabled) {
  //   if (zoomingEnabled) {
  //     // use d3-zoom defaults but exclude double clicks
  //     this.svg.call(this.zoom)
  //       .on('dblclick.zoom', null);
  //   } else {
  //     this.svg.on('.zoom', null);
  //   }
  // }

  // Decides which part of the zoom state is cachable depending
  // on the horizontal/vertical degrees of freedom.
  cachableState(state = this.state) {
    const cachableFields = []
      .concat(this.props.fixHorizontal ? [] : ['scaleX', 'translateX'])
      .concat(this.props.fixVertical ? [] : ['scaleY', 'translateY']);

    return pick(state, cachableFields);
  }

  cacheZoom() {
    this.props.cacheZoomState(fromJS(this.cachableState()));
  }

  updateZoomLimits(props) {
    const zoomLimits = props.layoutZoomLimits.toJS();

    // this.zoom = this.zoom.scaleExtent([zoomLimits.minScale, zoomLimits.maxScale]);

    // if (props.bounded) {
    //   this.zoom = this.zoom
    //     // Translation limits are only set if explicitly demanded (currently we are using them
    //     // in the resource view, but not in the graph view, although I think the idea would be
    //     // to use them everywhere).
    //     .translateExtent([
    //       [zoomLimits.minTranslateX, zoomLimits.minTranslateY],
    //       [zoomLimits.maxTranslateX, zoomLimits.maxTranslateY],
    //     ])
    //     // This is to ensure that the translation limits are properly
    //     // centered, so that the canvas margins are respected.
    //     .extent([
    //       [props.canvasMargins.left, props.canvasMargins.top],
    //       [props.canvasMargins.left + props.width, props.canvasMargins.top + props.height]
    //     ]);
    // }

    this.setState(zoomLimits);
  }

  // Restore the zooming settings
  restoreZoomState(props) {
    if (!props.layoutZoomState.isEmpty()) {
      const zoomState = props.layoutZoomState.toJS();

      // After the limits have been set, update the zoom.
      // this.svg.call(this.zoom.transform, zoomIdentity
      //   .translate(zoomState.translateX, zoomState.translateY)
      //   .scale(zoomState.scaleX, zoomState.scaleY));

      // Update the state variables.
      this.setState(zoomState);
      this.zoomRestored = true;
    }
  }

  canChangeZoom() {
    const { disabled, layoutZoomLimits } = this.props;
    const canvasHasContent = !layoutZoomLimits.isEmpty();
    return !disabled && canvasHasContent;
  }

  handlePan() {
    let translateX = this.state.translateX + d3Event.dx;
    let translateY = this.state.translateY + d3Event.dy;

    if (this.props.bounded) {
      const { maxTranslateX, minTranslateX, maxTranslateY, minTranslateY }
        = this.props.layoutZoomLimits.toJS();

      if (minTranslateX !== undefined) translateX = Math.max(translateX, minTranslateX);
      if (maxTranslateX !== undefined) translateX = Math.min(translateX, maxTranslateX);

      if (minTranslateY !== undefined) translateY = Math.max(translateY, minTranslateY);
      if (maxTranslateY !== undefined) translateY = Math.min(translateY, maxTranslateY);
    }

    this.setState(this.cachableState({ translateX, translateY }));
  }

  handleZoom(ev) {
    if (this.canChangeZoom()) {
      // console.log(ev.clientX, ev.clientY);
      // console.log(this.cachableState(this.state));
      // const transform = ({ x, y }, t) => ({
      //   x: t.translateX + (x * t.scaleX),
      //   y: t.translateY + (y * t.scaleY),
      // });
      const inverse = ({ x, y }, t) => ({
        x: (x - t.translateX) / t.scaleX,
        y: (y - t.translateY) / t.scaleY,
      });
      //
      // const center = inverse({ x: ev.clientX, y: ev.clientY }, this.state);
      // const WIDTH = 1905;
      // const HEIGHT = 525;
      // const dx = ((WIDTH * 0.5) - ev.clientX) * 0.2;
      // const dy = ((HEIGHT * 0.5) - ev.clientY) * 0.2;
      const { top, left } = this.svg.node().getBoundingClientRect();
      const dx = ev.clientX - left;
      const dy = ev.clientY - top;
      const tx = inverse({ x: dx, y: dy }, this.state).x;
      const ty = inverse({ x: dx, y: dy }, this.state).y;
      // const px = this.state.translateX + (dx / this.state.scaleX);
      // const py = this.state.translateY + (dy / this.state.scaleY);
      const newScaleX = this.state.scaleX / zoomFactor(ev);
      const newScaleY = this.state.scaleY / zoomFactor(ev);
      const newTranslateX = dx - (tx * newScaleX);
      const newTranslateY = dy - (ty * newScaleY);
      // const dy = 1000
      const updatedState = this.cachableState({
        scaleX: newScaleX,
        scaleY: newScaleY,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });

      this.setState(updatedState);
      this.debouncedCacheZoom();
    }
  }

  // zoomed() {
  //   if (this.canChangeZoom()) {
  //     const updatedState = this.cachableState({
  //       scaleX: d3Event.transform.k,
  //       scaleY: d3Event.transform.k,
  //       translateX: d3Event.transform.x,
  //       translateY: d3Event.transform.y,
  //     });
  //
  //     this.setState(updatedState);
  //     this.debouncedCacheZoom();
  //   }
  // }
}


function mapStateToProps(state, props) {
  return {
    width: canvasWidthSelector(state),
    height: canvasHeightSelector(state),
    canvasMargins: canvasMarginsSelector(state),
    layoutZoomState: props.zoomStateSelector(state),
    layoutZoomLimits: props.zoomLimitsSelector(state),
    layoutId: JSON.stringify(activeTopologyZoomCacheKeyPathSelector(state)),
    forceRelayout: state.get('forceRelayout'),
  };
}


export default connect(
  mapStateToProps,
  { cacheZoomState }
)(ZoomableCanvas);
