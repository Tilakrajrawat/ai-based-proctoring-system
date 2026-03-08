import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = "http://localhost:8080/ws";

export function createStompClient(token: string, onConnect: (client: Client) => void): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    onConnect: () => onConnect(client),
  });

  client.activate();
  return client;
}
