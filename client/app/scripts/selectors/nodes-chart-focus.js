import { includes, without } from 'lodash';
import { createSelector } from 'reselect';
import { scaleThreshold } from 'd3-scale';
import { fromJS, Set as makeSet } from 'immutable';

import { CANVAS_MARGINS, NODE_BASE_SIZE, DETAILS_PANEL_WIDTH } from '../constants/styles';
import { layoutNodesSelector, layoutEdgesSelector } from './nodes-chart-layout';
import { activeLayoutZoomSelector } from './nodes-chart-zoom';
import { viewportExpanseSelector } from './viewport';


const circularOffsetAngle = Math.PI / 4;

// make sure circular layouts a bit denser with 3-6 nodes
const radiusDensity = scaleThreshold()
  .domain([3, 6])
  .range([2.5, 3.5, 3]);


// Coordinates of the viewport center (when the details
// panel is open), used for focusing the selected node.
const viewportCenterSelector = createSelector(
  [
    state => state.getIn(['viewport', 'width']),
    state => state.getIn(['viewport', 'height']),
    state => activeLayoutZoomSelector(state).get('panTranslateX'),
    state => activeLayoutZoomSelector(state).get('panTranslateY'),
    state => activeLayoutZoomSelector(state).get('zoomScale'),
  ],
  (width, height, translateX, translateY, scale) => {
    const viewportHalfWidth = ((width + CANVAS_MARGINS.left) - DETAILS_PANEL_WIDTH) / 2;
    const viewportHalfHeight = (height + CANVAS_MARGINS.top) / 2;
    return {
      x: (-translateX + viewportHalfWidth) / scale,
      y: (-translateY + viewportHalfHeight) / scale,
    };
  }
);

// List of all the adjacent nodes to the selected
// one, excluding itself (in case of loops).
// TODO: Use createMapSelector here instead.
const selectedNodeNeighborsIdsSelector = createSelector(
  [
    state => state.get('selectedNodeId'),
    state => state.get('nodes'),
  ],
  (selectedNodeId, nodes) => {
    let adjacentNodes = makeSet();
    if (!selectedNodeId) {
      return adjacentNodes;
    }

    if (nodes && nodes.has(selectedNodeId)) {
      adjacentNodes = makeSet(nodes.getIn([selectedNodeId, 'adjacency']));
      // fill up set with reverse edges
      nodes.forEach((node, id) => {
        if (node.get('adjacency') && node.get('adjacency').includes(selectedNodeId)) {
          adjacentNodes = adjacentNodes.add(id);
        }
      });
    }

    return without(adjacentNodes.toArray(), selectedNodeId);
  }
);

const selectedNodesLayoutSettingsSelector = createSelector(
  [
    state => activeLayoutZoomSelector(state).get('zoomScale'),
    selectedNodeNeighborsIdsSelector,
    viewportExpanseSelector,
  ],
  (scale, circularNodesIds, viewportExpanse) => {
    const circularNodesCount = circularNodesIds.length;

    // Here we calculate the zoom factor of the nodes that get selected into focus.
    // The factor is a somewhat arbitrary function (based on what looks good) of the
    // viewport dimensions and the number of nodes in the circular layout. The idea
    // is that the node should never be zoomed more than to cover 1/3 of the viewport
    // (`maxScale`) and then the factor gets decresed asymptotically to the inverse
    // square of the number of circular nodes, with a little constant push to make
    // the layout more stable for a small number of nodes. Finally, the zoom factor is
    // divided by the zoom factor applied to the whole topology layout to cancel it out.
    const maxScale = viewportExpanse / NODE_BASE_SIZE / 3;
    const shrinkFactor = Math.sqrt(circularNodesCount + 10);
    const selectedScale = maxScale / shrinkFactor / scale;

    // Following a similar logic as above, we set the radius of the circular
    // layout based on the viewport dimensions and the number of circular nodes.
    const circularRadius = viewportExpanse / radiusDensity(circularNodesCount) / scale;
    const circularInnerAngle = (2 * Math.PI) / circularNodesCount;

    return { selectedScale, circularRadius, circularInnerAngle };
  }
);

const layoutWithSelectedNodeSelector = createSelector(
  [
    state => state.get('selectedNodeId'),
    layoutNodesSelector,
    layoutEdgesSelector,
    viewportCenterSelector,
    selectedNodeNeighborsIdsSelector,
    selectedNodesLayoutSettingsSelector,
  ],
  (selectedNodeId, layoutNodes, layoutEdges, viewportCenter, neighborsIds, layoutSettings) => {
    const { selectedScale, circularRadius, circularInnerAngle } = layoutSettings;

    // Do nothing if the layout doesn't contain the selected node anymore.
    if (!layoutNodes.has(selectedNodeId)) {
      return { layoutNodes, layoutEdges, selectedScale };
    }

    // Fix the selected node in the viewport center.
    layoutNodes = layoutNodes.mergeIn([selectedNodeId], viewportCenter);

    // Put the nodes that are adjacent to the selected one in a circular layout around it.
    layoutNodes = layoutNodes.map((node, nodeId) => {
      const index = neighborsIds.indexOf(nodeId);
      if (index > -1) {
        const angle = circularOffsetAngle + (index * circularInnerAngle);
        return node.merge({
          x: viewportCenter.x + (circularRadius * Math.sin(angle)),
          y: viewportCenter.y + (circularRadius * Math.cos(angle))
        });
      }
      return node;
    });

    // Update the edges in the circular layout to link the nodes in a straight line.
    layoutEdges = layoutEdges.map((edge) => {
      if (edge.get('source') === selectedNodeId
        || edge.get('target') === selectedNodeId
        || includes(neighborsIds, edge.get('source'))
        || includes(neighborsIds, edge.get('target'))) {
        const source = layoutNodes.get(edge.get('source'));
        const target = layoutNodes.get(edge.get('target'));
        return edge.set('points', fromJS([
          {x: source.get('x'), y: source.get('y')},
          {x: target.get('x'), y: target.get('y')}
        ]));
      }
      return edge;
    });

    return { layoutNodes, layoutEdges, selectedScale };
  }
);

// TODO: Rename those.
export const layoutNodes2Selector = createSelector(
  [
    layoutWithSelectedNodeSelector,
  ],
  layout => layout.layoutNodes
);

export const layoutEdges2Selector = createSelector(
  [
    layoutWithSelectedNodeSelector,
  ],
  layout => layout.layoutEdges
);

export const selectedScaleSelector = createSelector(
  [
    layoutWithSelectedNodeSelector,
  ],
  layout => layout.selectedScale
);
