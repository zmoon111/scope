import React from 'react';
import { connect } from 'react-redux';

import NodesChartEdges from './nodes-chart-edges';
import NodesChartNodes from './nodes-chart-nodes';
import {
  selectedScaleSelector, layoutNodes2Selector, layoutEdges2Selector
} from '../selectors/nodes-chart-focus';


const GRAPH_COMPLEXITY_NODES_TRESHOLD = 100;

class NodesChartElements extends React.Component {
  isTopologyGraphComplex() {
    return this.props.layoutNodes.size > GRAPH_COMPLEXITY_NODES_TRESHOLD;
  }

  render() {
    const { layoutNodes, layoutEdges, selectedScale, transform } = this.props;
    const isAnimated = !this.isTopologyGraphComplex();

    return (
      <g className="nodes-chart-elements" transform={transform}>
        <NodesChartEdges
          layoutEdges={layoutEdges}
          selectedScale={selectedScale}
          isAnimated={isAnimated} />
        <NodesChartNodes
          layoutNodes={layoutNodes}
          selectedScale={selectedScale}
          isAnimated={isAnimated} />
      </g>
    );
  }
}


function mapStateToProps(state) {
  return {
    layoutNodes: layoutNodes2Selector(state),
    layoutEdges: layoutEdges2Selector(state),
    selectedScale: selectedScaleSelector(state),
  };
}

export default connect(
  mapStateToProps
)(NodesChartElements);
