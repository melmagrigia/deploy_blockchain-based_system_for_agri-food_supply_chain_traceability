import React from 'react';
import axios from 'axios';

class SendRequest extends React.Component {
    sendHttpRequest = () => {
        axios.post('http://localhost:3000/create-asset', {
            message: 'Hello, server!'
        })
        .then(response => {
            console.log('Success:', response.data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };

    render() {
        return (
            <div>
                <button onClick={this.sendHttpRequest}>Send Request</button>
            </div>
        );
    }
}

export default SendRequest;