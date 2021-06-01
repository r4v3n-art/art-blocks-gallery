function ABFrame(props) {
  const styles = {
    width: '100vw',
    height: '100vh',
    border: 'none'
  }

  return (
    <iframe title='Art Blocks Frame'
            id='ab-frame'
            src={`https://api.artblocks.io/generator/${props.tokenId}`}
            style={styles}
    />
  )
}

export default ABFrame;
