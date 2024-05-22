import React, { useState } from 'react';
import axios from 'axios';

const GetRequest = () => {
    const [data, setData] = useState(null);

    const fetchData = () => {
        axios.get('http://localhost:3000/get-all-assets')
        .then(response => {
            console.log('Success:', response.data);
            setData(response.data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };

    return (
        <div>
            <button onClick={fetchData}>Fetch Data</button>
            {data && <div><pre>{JSON.stringify(data, null, 2)}</pre></div>}
        </div>
    );
};

export default GetRequest;
