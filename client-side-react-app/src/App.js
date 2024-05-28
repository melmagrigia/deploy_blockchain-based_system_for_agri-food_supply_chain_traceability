import React from 'react';
import SendRequest from './SendRequest';
import GetRequest from './GetRequest';

function App() {
    const title = process.env.REACT_APP_ORG_NAME
    return (
        <div className="App">
            <header className="App-header">
                <h1>{title}</h1>
                <SendRequest />
            </header>
        </div>
    );
}

export default App;