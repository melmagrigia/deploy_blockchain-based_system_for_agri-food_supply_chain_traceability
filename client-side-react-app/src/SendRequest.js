import React, { useState } from 'react';
import axios from 'axios';

const SendRequest = () => {
  const [postResult, setPostResult] = useState(null);
  const [getResult, setGetResult] = useState(null);
  
  const apiUrl = process.env.REACT_APP_API_URL;

  const handlePostRequest = async () => {
    try {
      const response = await axios.post(
        apiUrl + '/create-asset',
        { data: 'example data' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      setPostResult(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleGetRequest = async () => {
    try {
      const response = await axios.get(apiUrl + '/get-all-assets');
      setGetResult(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <button onClick={handlePostRequest}>Send POST Request</button>
      {postResult && <pre>{JSON.stringify(postResult, null, 2)}</pre>}

      <button onClick={handleGetRequest}>Send GET Request</button>
      {getResult && <pre>{JSON.stringify(getResult, null, 2)}</pre>}
    </div>
  );
};

export default SendRequest;
