import React from 'react';
import SendRequest from './SendRequest';
import GetRequest from './GetRequest';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>HTTP Request Example</h1>
                <SendRequest />
                <GetRequest />
            </header>
        </div>
    );
}

export default App;