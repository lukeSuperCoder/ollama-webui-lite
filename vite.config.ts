import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		cors: {
			origin: '*', // 允许所有来源
			methods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许的请求方法
			allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
		},
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8020', // 代理目标地址
				changeOrigin: true, // 是否改变源
				rewrite: (path) => path.replace(/^\/api/, ''), // 重写路径
			}
		}
	}
});
