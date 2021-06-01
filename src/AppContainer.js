import React from 'react'
import fetchTokensByOwner from './fetchTokensByOwner';
import App from './App';

const { useState, useEffect, useCallback} = React;

function AppContainer() {
  const [tokens, setTokens] = useState(null);
  const [address, setAddress] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleButtonClick = useCallback(
    () => {
      const value = document.getElementById('address-input').value
      setErrorMsg(null)
      setAddress(value)
      setSubmitted(true)
    },
    [setAddress, setSubmitted]
  );


  useEffect(() => {
    let isMounted = true;
    if (address != null) {
      fetchTokensByOwner(address).then(response => {
        if (!isMounted) {
          return
        }

        const data = response.data;
        const tokens = data.tokens

        if (tokens.length > 0) {
          setTokens(tokens);
        } else {
          setErrorMsg('No Art Blocks found');
        }
      }).catch(error => {
        console.log(error);
        setErrorMsg('Check the formatting on your address and try again');
      });
    }

    return () => {
      isMounted = false;
    };
  }, [address]);

  return (
    <div className='AppContainer' >
      { submitted && tokens !== null ?
        <App tokens={tokens} /> :
        <div className='address-group'>
         <label htmlFor='address'>Enter Address with Art Blocks NFTs</label>
         <input id='address-input' type='text' name='address' />
         <button onClick={handleButtonClick}>Enter</button>
         <p className='error'>{errorMsg}</p>
        </div>
      }
    </div>
  );
}

export default AppContainer;
