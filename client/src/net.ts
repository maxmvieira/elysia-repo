/**
 * Conexão de rede do cliente com o servidor autoritativo.
 *
 * Reconecta automaticamente e expõe callbacks simples. Toda a lógica de
 * jogo real vive no servidor; aqui só transportamos mensagens.
 *
 * A partir da etapa 7 o fluxo de entrada tem três passos:
 *
 *   conectar -> auth (login/registro) -> charlist -> hello(characterId)
 *
 * O NetClient guarda credencial e personagem escolhido para conseguir REFAZER
 * esse caminho sozinho depois de uma queda. Sem isso, cair a conexão jogaria o
 * jogador de volta na tela de login no meio de uma caçada.
 */

import {
  PROTOCOL_VERSION,
  decodeServerMessage,
  encode,
  type ClientMessage,
  type ServerMessage,
} from '@dominion/shared';

type ServerHandler = (msg: ServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class NetClient {
  private socket: WebSocket | null = null;
  private readonly url: string;
  private onMessage: ServerHandler;
  private onStatus: StatusHandler;
  private reconnectTimer: number | null = null;

  /** Guardadas só em memória, para poder reautenticar após queda. */
  private username = '';
  private password = '';
  /** Personagem em jogo. Null enquanto o jogador não escolheu. */
  private characterId: number | null = null;

  constructor(onMessage: ServerHandler, onStatus: StatusHandler) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    // Conecta no MESMO host/porta da página, pelo caminho /ws — o Vite faz o
    // proxy até o servidor de jogo (porta 8080). Assim funciona em localhost, na
    // LAN e por um túnel https (usa wss automaticamente, sem "mixed content").
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${proto}//${location.host}/ws`;
  }

  connect(): void {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.onStatus(true);
      // Se já temos credencial (reconexão), refaz o login sozinho.
      if (this.username) this.sendAuth('login');
    };

    this.socket.onmessage = (ev) => {
      const msg = decodeServerMessage(String(ev.data));
      if (!msg) return;
      // Reconexão: autenticou de novo e já sabemos qual personagem estava em
      // jogo -> volta direto para ele, sem passar pela tela de seleção.
      if (msg.t === 'authresult' && msg.ok && this.characterId !== null) {
        this.enterGame(this.characterId);
      }
      this.onMessage(msg);
    };

    this.socket.onclose = () => {
      this.onStatus(false);
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
  }

  /** Login ou criação de conta. Guarda a credencial para reconexões. */
  auth(mode: 'login' | 'register', username: string, password: string): void {
    this.username = username;
    this.password = password;
    this.sendAuth(mode);
  }

  private sendAuth(mode: 'login' | 'register'): void {
    this.send({
      t: 'auth', protocol: PROTOCOL_VERSION, mode,
      username: this.username, password: this.password,
    });
  }

  /** Entra no mundo com um personagem da conta. */
  enterGame(characterId: number): void {
    this.characterId = characterId;
    this.send({ t: 'hello', protocol: PROTOCOL_VERSION, characterId });
  }

  /** Volta para a seleção de personagem (para de reentrar automaticamente). */
  leaveCharacter(): void {
    this.characterId = null;
  }

  send(msg: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(encode(msg));
    }
  }
}
