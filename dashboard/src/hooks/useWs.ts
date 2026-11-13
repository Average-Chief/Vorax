import { useEffect, useRef, useState, useCallback } from 'react';
import { WsTaskEvent } from '../lib/types';

export type WsStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

type MessageHandler = (event: WsTaskEvent) => void;
type ReconnectHandler = () => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private status: WsStatus = 'connecting';
  private statusListeners: Set<(s: WsStatus) => void> = new Set();
  private messageListeners: Set<MessageHandler> = new Set();
  private reconnectListeners: Set<ReconnectHandler> = new Set();
  private retryDelay = 1000;
  private reconnectTimer: any = null;
  private hasConnectedOnce = false;

  constructor() {
    this.connect();
  }

  private setStatus(s: WsStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  public getStatus(): WsStatus {
    return this.status;
  }

  public subscribeStatus(fn: (s: WsStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  public subscribeMessage(fn: MessageHandler): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  public subscribeReconnect(fn: ReconnectHandler): () => void {
    this.reconnectListeners.add(fn);
    return () => this.reconnectListeners.delete(fn);
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.hasConnectedOnce ? 'reconnecting' : 'connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('open');
        this.retryDelay = 1000;
        if (this.hasConnectedOnce) {
          this.reconnectListeners.forEach((fn) => fn());
        }
        this.hasConnectedOnce = true;
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.type === 'task_event') {
            this.messageListeners.forEach((fn) => fn(data as WsTaskEvent));
          }
        } catch {
          // ignore
        }
      };

      this.ws.onclose = () => {
        this.setStatus('closed');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.setStatus('closed');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.retryDelay);
    this.retryDelay = Math.min(30000, this.retryDelay * 2);
  }
}

export const wsManager = new WebSocketManager();

export function useWs() {
  const [status, setStatus] = useState<WsStatus>(wsManager.getStatus());

  useEffect(() => {
    return wsManager.subscribeStatus(setStatus);
  }, []);

  return { status };
}
