import React from 'react';
import { connect } from 'react-redux';
import { assign, pick } from 'lodash';

import { event as d3Event, select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';

import Logo from '../components/logo';
import NodesChartElements from './nodes-chart-elements';
import { clickBackground, cacheZoomState } from '../actions/app-actions';
import { topologyZoomSelector } from '../selectors/nodes-chart-zoom';


const ZOOM_CACHE_FIELDS = [
  'panTranslateX', 'panTranslateY',
  'zoomScale', 'minZoomScale', 'maxZoomScale'
];


class NodesChart extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      zoomScale: 0,
      minZoomScale: 0,
      maxZoomScale: 0,
      panTranslateX: 0,
      panTranslateY: 0,
    };

    this.handleMouseClick = this.handleMouseClick.bind(this);
    this.cacheZoom = this.cacheZoom.bind(this);
    this.zoomed = this.zoomed.bind(this);
  }

  componentDidMount() {
    // distinguish pan/zoom from click
    this.isZooming = false;
    this.zoom = zoom().on('zoom', this.zoomed);

    this.svg = select('.nodes-chart svg');
    this.svg.call(this.zoom);
  }

  componentWillUnmount() {
    // undoing .call(zoom)
    this.svg
      .on('mousedown.zoom', null)
      .on('onwheel', null)
      .on('onmousewheel', null)
      .on('dblclick.zoom', null)
      .on('touchstart.zoom', null);
  }

  componentWillReceiveProps(nextProps) {
    // Don't modify the original state, as we only want to call setState once at the end.
    const state = assign({}, this.state);
    assign(state, nextProps.topologyZoom);

    console.log('Will receive props');
    this.applyZoomState(state);
    this.setState(state);
  }


  render() {
    // Not passing transform into child components for perf reasons.
    const { panTranslateX, panTranslateY, zoomScale } = this.state;
    const transform = `translate(${panTranslateX}, ${panTranslateY}) scale(${zoomScale})`;
    const svgClassNames = this.props.isEmpty ? 'hide' : '';

    return (
      <div className="nodes-chart">
        <svg
          width="100%" height="100%" id="nodes-chart-canvas"
          className={svgClassNames} onClick={this.handleMouseClick}>
          <g transform="translate(24,24) scale(0.25)">
            <Logo />
          </g>
          <NodesChartElements transform={transform} />
        </svg>
      </div>
    );
  }

  cacheZoom(state = this.state) {
    const zoomState = pick(state, ZOOM_CACHE_FIELDS);
    this.props.cacheZoomState(zoomState);
  }

  handleMouseClick() {
    if (!this.isZooming || this.props.selectedNodeId) {
      this.props.clickBackground();
    } else {
      this.isZooming = false;
    }
  }

  applyZoomState({ zoomScale, minZoomScale, maxZoomScale, panTranslateX, panTranslateY }) {
    this.zoom = this.zoom.scaleExtent([minZoomScale, maxZoomScale]);
    this.svg.call(this.zoom.transform, zoomIdentity
      .translate(panTranslateX, panTranslateY)
      .scale(zoomScale));
  }

  zoomed() {
    this.isZooming = true;
    // don't pan while node is selected
    if (!this.props.selectedNodeId) {
      this.setState({
        panTranslateX: d3Event.transform.x,
        panTranslateY: d3Event.transform.y,
        zoomScale: d3Event.transform.k
      });
    }
  }
}


function mapStateToProps(state) {
  return {
    topologyZoom: topologyZoomSelector(state),
  };
}


export default connect(
  mapStateToProps,
  { clickBackground, cacheZoomState }
)(NodesChart);
