import debug from 'debug';
import { createSelector, createStructuredSelector } from 'reselect';
import { Map as makeMap } from 'immutable';
import timely from 'timely';

import { CANVAS_MARGINS } from '../constants/styles';
import { getActiveTopologyOptions } from '../utils/topology-utils';
import { initEdgesFromNodes, collapseMultiEdges } from '../utils/layouter-utils';
import { shownNodesSelector } from './node-filters';
import { doLayout } from '../charts/nodes-layout';

const log = debug('scope:nodes-chart');


const layoutOptionsSelector = createStructuredSelector({
  margins: () => CANVAS_MARGINS,
  width: state => state.getIn(['viewport', 'width']),
  height: state => state.getIn(['viewport', 'height']),
  forceRelayout: state => state.get('forceRelayout'),
  topologyId: state => state.get('currentTopologyId'),
  topologyOptions: state => getActiveTopologyOptions(state),
});

export const graphLayout = createSelector(
  [
    // TODO: Instead of sending the nodes with all the information (metrics, metadata, etc...)
    // to the layout engine, it would suffice to forward it just the nodes adjacencies map, which
    // we could get with another selector like:
    //
    // const nodesAdjacenciesSelector = createMapSelector(
    //   [ (_, props) => props.nodes ],
    //   node => node.get('adjacency') || makeList()
    // );
    //
    // That would enable us to use smarter caching, so that the layout doesn't get recalculated
    // if adjacencies don't change but e.g. metrics gets updated. We also don't need to init
    // edges here as the adjacencies data is enough to reconstruct them in the layout engine (this
    // might enable us to simplify the caching system there since we really only need to cache
    // the adjacencies map in that case and not nodes and edges).
    shownNodesSelector,
    layoutOptionsSelector,
  ],
  (nodes, options) => {
    // If the graph is empty, skip computing the layout.
    if (nodes.size === 0) {
      return {
        layoutNodes: makeMap(),
        layoutEdges: makeMap(),
      };
    }

    const edges = initEdgesFromNodes(nodes);
    const timedLayouter = timely(doLayout);
    const graph = timedLayouter(nodes, edges, options);

    // NOTE: We probably shouldn't log anything in a
    // computed property, but this is still useful.
    log(`graph layout calculation took ${timedLayouter.time}ms`);

    return {
      // NOTE: This might be a good place to add (some of) nodes/edges decorators.
      layoutNodes: graph.nodes,
      layoutEdges: collapseMultiEdges(graph.edges),
    };
  }
);
