import React from 'react'
import fetchTokensByOwner from './fetchTokensByOwner';
import queryEns from './queryEns';
import web3 from 'web3';
import App from './App';

const { useState, useEffect, useCallback} = React;

function AppContainer() {
  const [tokens, setTokens] = useState(null);
  const [address, setAddress] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleButtonClick = useCallback(
    (event) => {
      setLoading(true);

      const value = document.getElementById('address-input').value
      setErrorMsg(null)

      if (web3.utils.isAddress(value)) {
        setAddress(value)
      } else {
        queryEns(value).then(response => {
          if (response.data.domains.length > 0) {
            setAddress(response.data.domains[0].resolvedAddress.id);
          } else {
            setErrorMsg('Check the formatting on your address and try again');
            setLoading(false);
          }
        }).catch(error => {
          console.log(error)
        });
      }

      setSubmitted(true)
    },
    [setAddress, setSubmitted, setErrorMsg, setLoading]
  );


  useEffect(() => {
    let isMounted = true;
    if (address != null) {
      fetchTokensByOwner(address).then(response => {
        if (!isMounted) {
          return
        }

        const data = response.data;
        const tokens = data.tokens;

        if (tokens.length > 0) {
          setTokens(tokens);
        } else {
          setLoading(false);
          setErrorMsg('No Art Blocks found');
        }
      }).catch(error => {
        console.log(error);
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
         <button disabled={loading ? 'disabled' : ''} id='enter-button' onClick={handleButtonClick}>Enter</button>
         <p className='error'>{errorMsg}</p>
          <p style={{display: loading ? 'block' : 'none'}}>Loading...</p>
        </div>
      }
    </div>
  );
}

export default AppContainer;
