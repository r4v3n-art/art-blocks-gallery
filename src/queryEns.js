async function queryEns(domain) {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/ensdomains/ens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query queryEns {
        domains(where: {name: "${domain}"}) {
          resolvedAddress {
            id
          }
        }
    }`
    })
  });

  return await response.json();
}

export default queryEns;
