export { Torrent } from './torrent.mjs'

async function handleAnnounce(request, env) {
  const requestURL = new URL(request.url);
  const params = new URLSearchParams(requestURL.searchParams);

  let info_hash = params.get("info_hash");
  if(!info_hash || info_hash.length !== 20) {
    return new Response("Invalid info_hash", {
      status: 400,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  let id = env.TORRENT.idFromName(info_hash);
  let torrent = env.TORRENT.get(id);
  return await torrent.fetch(request);
}

export default {
  async fetch(request, env) {
    let url = new URL(request.url);
    if(url.pathname === '/announce') {
      return handleAnnounce(request, env);
    }
    return new Response("Not found", {
      status: 404,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}