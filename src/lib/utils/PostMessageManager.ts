interface MessageData {
    type: string;
    data: any;
}

export class PostMessageManager {
    private targetOrigin: string;
    private handlers: Map<string, ((data: any) => void)[]>;

    constructor(targetOrigin: string = '*') {
        this.targetOrigin = targetOrigin;
        this.handlers = new Map();
        
        // 绑定消息监听器
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    // 发送消息
    sendMessage(type: string, data: any) {
        const message: MessageData = { type, data };
        const send = () => {
            window.parent.postMessage(message, this.targetOrigin);
            // 监听接收方的返回信息
            const listener = (event: MessageEvent) => {
                if (event.data && event.data.success) {
                    // 如果接收成功，移除监听
                    window.removeEventListener('message', listener);
                } else {
                    // 如果发送失败，1秒后重试
                    setTimeout(send, 1000);
                }
            };
            window.addEventListener('message', listener);
        };
        send();
    }

    // 监听特定类型的消息
    on(type: string, callback: (data: any) => void) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type)?.push(callback);
    }

    // 移除特定类型的消息监听
    off(type: string, callback: (data: any) => void) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // 处理接收到的消息
    private handleMessage(event: MessageEvent) {
        // 可以在这里添加源检查
        // if (event.origin !== expectedOrigin) return;

        const message = event.data as MessageData;
        if (!message || !message.type) return;

        const handlers = this.handlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => handler(message.data));
        }
    }

    // 销毁实例，清理事件监听
    destroy() {
        window.removeEventListener('message', this.handleMessage.bind(this));
        this.handlers.clear();
    }
} 