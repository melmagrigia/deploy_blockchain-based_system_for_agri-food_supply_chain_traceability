import React, { useState } from 'react';
import axios from 'axios';

const GetRequest = () => {
    const [data, setData] = useState(null);

    const fetchData = () => {
        axios.get(`${process.env.REACT_APP_API_URL}/get-all-assets`)
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
