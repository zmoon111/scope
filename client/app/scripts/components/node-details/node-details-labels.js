import React from 'react';
import { Map as makeMap } from 'immutable';

import MatchedText from '../matched-text';
import ShowMore from '../show-more';

export default class NodeDetailsLabels extends React.Component {

  constructor(props, context) {
    super(props, context);
    this.DEFAULT_LIMIT = 5;
    this.state = {
      limit: this.DEFAULT_LIMIT,
    };
    this.handleLimitClick = this.handleLimitClick.bind(this);
  }

  handleLimitClick() {
    const limit = this.state.limit ? 0 : this.DEFAULT_LIMIT;
    this.setState({limit});
  }

  render() {
    const { matches = makeMap() } = this.props;
    let rows = this.props.rows;
    let notShown = 0;
    const limited = rows && this.state.limit > 0 && rows.length > this.state.limit;
    const expanded = this.state.limit === 0;
    if (rows && limited) {
      const hasNotShownMatch = rows.filter((row, index) => index >= this.state.limit
        && matches.has(row.id)).length > 0;
      if (!hasNotShownMatch) {
        notShown = rows.length - this.DEFAULT_LIMIT;
        rows = rows.slice(0, this.state.limit);
      }
    }

    return (
      <div className="node-details-labels">
        {rows.map(field => (<div className="node-details-labels-field" key={field.id}>
            <div className="node-details-labels-field-label truncate" title={field.label}
              key={field.id}>
              {field.label}
            </div>
            <div className="node-details-labels-field-value truncate" title={field.value}>
              <MatchedText text={field.value} matches={matches} fieldId={field.id} />
            </div>
          </div>
        ))}
        <ShowMore handleClick={this.handleLimitClick} collection={this.props.rows}
          expanded={expanded} notShown={notShown} />
      </div>
    );
  }
}
