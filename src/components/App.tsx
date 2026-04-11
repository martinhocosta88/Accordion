import React from 'react';

export default function App() {
  return (
    <div className="app">
      <div className="side-pane">
        <div className="side-pane-header">Repositories</div>
        <div className="side-pane-list">
          <div className="side-pane-empty">
            No repositories configured. Click Settings to add one.
          </div>
        </div>
        <button className="side-pane-settings">⚙ Settings</button>
      </div>
      <div className="terminal-grid empty">
        <p>Select a repository from the side pane to open a terminal.</p>
      </div>
    </div>
  );
}
