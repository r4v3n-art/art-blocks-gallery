import React from 'react'
import ABFrame from './ABFrame';
import useInterval from './useInterval';
import './App.css';

const { useState, useEffect, useCallback} = React;

function App(props) {
  const [tokenIndex, setTokenIndex] = useState(0);
  const [intervalTime, setIntervalTime] = useState(20);
  const [displayControls, setDisplayControls] = useState('block');
  const token = props.tokens[tokenIndex];

  const nextToken = useCallback(
    () => {
      let nextIndex = tokenIndex + 1;
      if (nextIndex  < props.tokens.length) {
        setTokenIndex(nextIndex);
      } else {
        setTokenIndex(0);
      }
    },
    [tokenIndex, props]
  );

  const prevToken = useCallback(
    () => {
      let prevIndex = tokenIndex - 1;
      if (prevIndex >= 0) {
        setTokenIndex(prevIndex);
      } else {
        setTokenIndex(props.tokens.length - 1);
      }
    },
    [tokenIndex, props]
  );

  const toggleControls = useCallback(
    () => {
      if (displayControls === 'block') {
        setDisplayControls('none');
      } else {
        setDisplayControls('block');
      }
    },
    [setDisplayControls, displayControls]
  );

  const handleKeyPress = useCallback(
    (event) => {
      if (event.key === 'C' && event.shiftKey) {
        toggleControls();
      }
    },
    [toggleControls]
  );

  const handleOnChange = useCallback(
    (event) => {
      setIntervalTime(event.target.value);
    },
    [setIntervalTime]
  );

  const mintNumber = (id) => {
    return parseInt(id.substring(id.length - 5));
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  useInterval(() => {
    nextToken();
  }, intervalTime*1000);

  return (
    <div className="App">
      <div className='controls' style={{display: displayControls}}>
        <div className='form-group'>
          <label htmlFor='timeInterval'>Interval: </label>
          <select onChange={handleOnChange} id='time-interval-control' name='timeInterval'>
            <option value='20'>20 secs</option>
            <option value='60'>1 min</option>
            <option value='120'>2 min</option>
            <option value='300'>5 min</option>
            <option value='600'>10 min</option>
          </select>
          <button onClick={prevToken}>prev</button>
          <button onClick={nextToken}>next</button>
        </div>
        <p>Shift-C to show/hide controls</p>
        <div className='token-details'>
          <p>{`${token.project.name} #${mintNumber(token.tokenId)}`}</p>
          <p>{token.project.artistName}</p>
        </div>
      </div>
      <div className='content'>
        {props.tokens != null ? <ABFrame tokenId={token.tokenId} /> : "Loading..."}
      </div>
    </div>
  );
}

export default App;
