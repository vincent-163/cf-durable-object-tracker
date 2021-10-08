import bencode from 'bencode';

// How long a peer entry is retained before it is evicted, in milliseconds.
const timeout = 1000 * 60 * 60 * 24;
// Max number of peers.
const peer_count = 1000;
// Announce interval in seconds.
const interval = 1800;

export class Torrent {
    constructor(state, env) {
      this.state = state;
      this.state.blockConcurrencyWhile(async () => {
        let peers = await this.state.storage.get("peers");
        this.peers = peers || [];
      })
    }
  
    // Handle announce requests from clients.
    async fetch(request) {
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
  
    let peer_id = params.get("peer_id");
    if(!peer_id || peer_id.length !== 20) {
        return new Response("Invalid peer_id", {
            status: 400,
            headers: {
            'Content-Type': 'text/plain'
            }
        });
    }

    let ip = params.get("ip") || request.headers.get("CF-Connecting-IP");

    let port = parseInt(params.get("port"));
    if(!(port > 1024 && port < 65536)) {
        return new Response("Invalid port", {
            status: 400,
            headers: {
            'Content-Type': 'text/plain'
            }
        });
    }

    let peer = this.peers.find(x => x.id === peer_id);
    if(peer) {
        peer.ip = ip;
        peer.port = port;
        peer.last_seen = Date.now();
    } else {
      this.peers.push({
        id: peer_id,
        ip,
        port,
        last_seen: Date.now()
      });
    }
    this.peers = this.peers.filter(x => Date.now() - x.last_seen < timeout);
    if(this.peers.length > peer_count) {
      this.peers.shift();
    }

    await this.state.storage.put("peers", this.peers);

    let resp = {
      interval: interval,
      peers: this.peers.map(peer => ({
        id: peer.id,
        ip: peer.ip,
        port: peer.port,
      }))
    };
    return new Response(bencode.encode(resp), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

  }
}
