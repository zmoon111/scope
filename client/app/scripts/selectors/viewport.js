import { createSelector } from 'reselect';

import { CANVAS_MARGINS } from '../constants/styles';


export const viewportWidthSelector = createSelector(
  [
    state => state.getIn(['viewport', 'width']),
  ],
  width => width - CANVAS_MARGINS.left - CANVAS_MARGINS.right
);

export const viewportHeightSelector = createSelector(
  [
    state => state.getIn(['viewport', 'height']),
  ],
  height => height - CANVAS_MARGINS.top
);

// The narrower dimension of the viewport, used for scaling.
export const viewportExpanseSelector = createSelector(
  [
    viewportWidthSelector,
    viewportHeightSelector,
  ],
  (width, height) => Math.min(width, height)
);
