async function fetchTokensByOwner(ownerAddress) {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/xenoliss/art-blocks-explorer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query FetchTokensByOwnerQuery {
        tokens(where: {owner: "${ownerAddress}"}) {
          id
          project {
            name
            artistName
          }
        }
    }`
    })
  });

  return await response.json();
}

export default fetchTokensByOwner;
