<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import toast from "svelte-french-toast";

	import { OLLAMA_API_BASE_URL, apiKey } from "$lib/constants";
	import { onMount, tick } from "svelte";
	import { splitStream } from "$lib/utils";

	import { settings, db, chats, chatId } from "$lib/stores";

	import MessageInput from "$lib/components/chat/MessageInput.svelte";
	import Messages from "$lib/components/chat/Messages.svelte";
	import ModelSelector from "$lib/components/chat/ModelSelector.svelte";
	import Navbar from "$lib/components/layout/Navbar.svelte";
	import { page } from "$app/stores";
	import Dialog from '$lib/components/layout/Dialog.svelte';
	import Track from '$lib/components/handel/track.svelte'; // 导入track组件
	import TrackReplay from '$lib/components/handel/trackReplay.svelte'; // 导入trackReplay组件
	import Ship from '$lib/components/handel/ship.svelte'; // 导入ship组件
	let stopResponseFlag = false;
	let autoScroll = true;

	let selectedModels = [""];

	let title = "";
	let prompt = "";

	let messages = [];
	let history = {
		messages: {},
		currentId: null
	};

	$: if (history.currentId !== null) {
		let _messages = [];

		let currentMessage = history.messages[history.currentId];
		while (currentMessage !== null) {
			_messages.unshift({ ...currentMessage });
			currentMessage =
				currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
		}
		messages = _messages;
	} else {
		messages = [];
	}

	let isDialogOpen = false;	// 是否打开对话框
	let queryParams = {
		type: "",
		title: "",
		mmsi: ""
	};	// 对话框参数

	onMount(async () => {
		await chatId.set(uuidv4());

		chatId.subscribe(async () => {
			await initNewChat();
		});
	});

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		console.log($chatId);

		autoScroll = true;

		title = "";
		messages = [];
		history = {
			messages: {},
			currentId: null
		};
		selectedModels = $page.url.searchParams.get("models")
			? $page.url.searchParams.get("models")?.split(",")
			: $settings.models ?? [""];

		let _settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
		console.log(_settings);
		settings.set({
			..._settings
		});
	};

	const copyToClipboard = (text) => {
		if (!navigator.clipboard) {
			var textArea = document.createElement("textarea");
			textArea.value = text;

			// Avoid scrolling to bottom
			textArea.style.top = "0";
			textArea.style.left = "0";
			textArea.style.position = "fixed";

			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				var successful = document.execCommand("copy");
				var msg = successful ? "successful" : "unsuccessful";
				console.log("Fallback: Copying text command was " + msg);
			} catch (err) {
				console.error("Fallback: Oops, unable to copy", err);
			}

			document.body.removeChild(textArea);
			return;
		}
		navigator.clipboard.writeText(text).then(
			function () {
				console.log("Async: Copying to clipboard was successful!");
			},
			function (err) {
				console.error("Async: Could not copy text: ", err);
			}
		);
	};

	//////////////////////////
	// Ollama functions
	//////////////////////////

	const sendPrompt = async (userPrompt, parentId, _chatId) => {
		await Promise.all(
			selectedModels.map(async (model) => {
				await sendPromptRAG(model, userPrompt, parentId, _chatId);
			})
		);

		await chats.set(await $db.getChats());
	};

	const sendPromptOllama = async (model, userPrompt, parentId, _chatId) => {
		console.log("sendPromptOllama");
		let responseMessageId = uuidv4();
		let responseMessage = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: "assistant",
			content: "",
			model: model
		};

		const keywords = {
			"轨迹回放": {
				"startTime": new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16),
				"endTime": new Date().toISOString().slice(0, 16),
				"mmsi": "477148800",
				"type": "trackReplay",	
				"title": "轨迹回放"
			},
			"轨迹": {
				"startTime": new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16),
				"endTime": new Date().toISOString().slice(0, 16),
				"mmsi": "477148800",
				"type": "track",	
				"title": "轨迹查询"
			},
			"船舶": {
				"mmsi": "477148800",
				"type": "ship",
				"title": "船舶查询"
			}
		};

		for (const keyword in keywords) {
			if (userPrompt.includes(keyword)) {
				openDialog(keywords[keyword]);
				break;
			}
		}

		history.messages[responseMessageId] = responseMessage;
		history.currentId = responseMessageId;
		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				responseMessageId
			];
		}

		await tick();
		window.scrollTo({ top: document.body.scrollHeight });

		const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "text/event-stream",
				"x-api-key": apiKey
			},
			body: JSON.stringify({
				model: model,
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content
				})),
				options: {
					seed: $settings.seed ?? undefined,
					temperature: $settings.temperature ?? undefined,
					repeat_penalty: $settings.repeat_penalty ?? undefined,
					top_k: $settings.top_k ?? undefined,
					top_p: $settings.top_p ?? undefined,
					num_ctx: $settings.num_ctx ?? undefined,
					...($settings.options ?? {})
				},
				format: $settings.requestFormat ?? undefined
			})
		}).catch((err) => {
			console.log(err);
			return null;
		});

		if (res && res.ok) {
			const reader = res.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream("\n"))
				.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done || stopResponseFlag || _chatId !== $chatId) {
					responseMessage.done = true;
					messages = messages;
					break;
				}

				try {
					let lines = value.split("\n");

					for (const line of lines) {
						if (line !== "") {
							console.log(line);
							let data = JSON.parse(line);

							if ("detail" in data) {
								throw data;
							}

							if (data.done == false) {
								if (responseMessage.content == "" && data.message.content == "\n") {
									continue;
								} else {
									responseMessage.content += data.message.content;
									messages = messages;
								}
							} else {
								responseMessage.done = true;
								responseMessage.context = data.context ?? null;
								responseMessage.info = {
									total_duration: data.total_duration,
									load_duration: data.load_duration,
									sample_count: data.sample_count,
									sample_duration: data.sample_duration,
									prompt_eval_count: data.prompt_eval_count,
									prompt_eval_duration: data.prompt_eval_duration,
									eval_count: data.eval_count,
									eval_duration: data.eval_duration
								};
								messages = messages;

								if ($settings.responseAutoCopy) {
									copyToClipboard(responseMessage.content);
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					if ("detail" in error) {
						toast.error(error.detail);
					}
					break;
				}

				if (autoScroll) {
					window.scrollTo({ top: document.body.scrollHeight });
				}

				await $db.updateChatById(_chatId, {
					title: title === "" ? "新聊天" : title,
					models: selectedModels,
					options: {
						seed: $settings.seed ?? undefined,
						temperature: $settings.temperature ?? undefined,
						repeat_penalty: $settings.repeat_penalty ?? undefined,
						top_k: $settings.top_k ?? undefined,
						top_p: $settings.top_p ?? undefined,
						num_ctx: $settings.num_ctx ?? undefined,
						...($settings.options ?? {})
					},
					messages: messages,
					history: history
				});
			}
		} else {
			if (res !== null) {
				const error = await res.json();
				console.log(error);
				if ("detail" in error) {
					toast.error(error.detail);
					responseMessage.content = error.detail;
				} else {
					toast.error(error.error);
					responseMessage.content = error.error;
				}
			} else {
				toast.error(`连接出现了点问题`);
				responseMessage.content = `连接出现了点问题`;
			}

			responseMessage.error = true;
			responseMessage.content = `连接出现了点问题`;
			responseMessage.done = true;
			messages = messages;
		}

		stopResponseFlag = false;
		await tick();
		if (autoScroll) {
			window.scrollTo({ top: document.body.scrollHeight });
		}

		// 如果只有两条消息，并且第二条消息的内容不为空，则生成聊天标题
		if (messages.length == 2 && messages.at(1).content !== "") {
			window.history.replaceState(history.state, "", `/c/${_chatId}`);
			await generateChatTitle(_chatId, userPrompt);
		}
	};

	//lightrag 流式输出查询
	const sendPromptRAG = async (model, userPrompt, parentId, _chatId) => {
        console.log('sendPromptRAG');
		let responseMessageId = uuidv4();
		let responseMessage = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: 'assistant',
			content: '',
			model: model
		};
		history.messages[responseMessageId] = responseMessage;
		history.currentId = responseMessageId;
		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				responseMessageId
			];
		}

		await tick();
		window.scrollTo({ top: document.body.scrollHeight });

		const res = await fetch('/api/query/stream', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey
			},
			body: JSON.stringify({
				query: history.messages[parentId].content,	//当前输入内容
				mode: 'mix', // 假设使用默认模式
			})
		}).catch((err) => {
			console.log(err);
			return null;
		});
		
		if (res && res.ok) {
			const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');

			while (true) {
				const { value, done } = await reader.read();
				const chunk = decoder.decode(value, { stream: true });

				// 如果流结束，或者停止响应标志，或者聊天ID不匹配，则结束流
				if (done || stopResponseFlag || _chatId !== $chatId) {
					responseMessage.done = true;
					messages = messages;
					break;
				}

				try {
					let lines = chunk.split('\n');

					for (const line of lines) {
						if (line !== '') {
							let data = JSON.parse(line);
							
							if (done == false) {
								console.log(data.response);
								if (responseMessage.content == '' && data.response == '\n') {
									continue;
								} else {
									responseMessage.content += data.response;
									messages = messages;
								}
							} else {
								responseMessage.done = true;
								responseMessage.context = data.response ?? null;
								responseMessage.info = {
									total_duration: data.total_duration,
									load_duration: data.load_duration,
									sample_count: data.sample_count,
									sample_duration: data.sample_duration,
									prompt_eval_count: data.prompt_eval_count,
									prompt_eval_duration: data.prompt_eval_duration,
									eval_count: data.eval_count,
									eval_duration: data.eval_duration
								};
								messages = messages;

								if ($settings.notificationEnabled && !document.hasFocus()) {
									const notification = new Notification(
										`Ollama - ${model}`,
										{
											body: responseMessage.content,
											icon: '/favicon.png'
										}
									);
								}

								if ($settings.responseAutoCopy) {
									copyToClipboard(responseMessage.content);
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					if ('detail' in error) {
						toast.error(error.detail);
					}
					break;
				}

				if (autoScroll) {
					window.scrollTo({ top: document.body.scrollHeight });
				}

				await $db.updateChatById(_chatId, {
					title: title === '' ? '新聊天' : title,
					models: selectedModels,
					system: $settings.system ?? undefined,
					options: {
						seed: $settings.seed ?? undefined,
						temperature: $settings.temperature ?? undefined,
						repeat_penalty: $settings.repeat_penalty ?? undefined,
						top_k: $settings.top_k ?? undefined,
						top_p: $settings.top_p ?? undefined,
						num_ctx: $settings.num_ctx ?? undefined,
						...($settings.options ?? {})
					},
					messages: messages,
					history: history
				});
			}
		} else {
			if (res !== null) {
				const error = await res.json();
				console.log(error);
				if ('detail' in error) {
					toast.error(error.detail);
					responseMessage.content = error.detail;
				} else {
					toast.error(error.error);
					responseMessage.content = error.error;
				}
			} else {
				toast.error(`Uh-oh! There was an issue connecting to Ollama.`);
				responseMessage.content = `Uh-oh! There was an issue connecting to Ollama.`;
			}

			responseMessage.error = true;
			responseMessage.content = `Uh-oh! There was an issue connecting to Ollama.`;
			responseMessage.done = true;
			messages = messages;
		}

        responseMessage.done = true;
        messages.push(responseMessage); // 将响应消息添加到消息列表
        await tick();
        if (autoScroll) {
            window.scrollTo({ top: document.body.scrollHeight });
        }
    };

	const submitPrompt = async (userPrompt) => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log("submitPrompt", _chatId);

		if (selectedModels.includes("")) {
			toast.error("Model not selected");
		} else if (messages.length != 0 && messages.at(-1).done != true) {
			console.log("wait");
		} else {
			document.getElementById("chat-textarea").style.height = "";

			let userMessageId = uuidv4();
			let userMessage = {
				id: userMessageId,
				parentId: messages.length !== 0 ? messages.at(-1).id : null,
				childrenIds: [],
				role: "user",
				content: userPrompt
			};

			if (messages.length !== 0) {
				history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
			}

			history.messages[userMessageId] = userMessage;
			history.currentId = userMessageId;

			await tick();
			if (messages.length == 1) {
				await $db.createNewChat({
					id: _chatId,
					title: "新聊天",
					models: selectedModels,
					options: {
						seed: $settings.seed ?? undefined,
						temperature: $settings.temperature ?? undefined,
						repeat_penalty: $settings.repeat_penalty ?? undefined,
						top_k: $settings.top_k ?? undefined,
						top_p: $settings.top_p ?? undefined,
						num_ctx: $settings.num_ctx ?? undefined,
						...($settings.options ?? {})
					},
					messages: messages,
					history: history
				});
			}

			prompt = "";

			setTimeout(() => {
				window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
			}, 50);

			await sendPrompt(userPrompt, userMessageId, _chatId);
		}
	};

	const stopResponse = () => {
		stopResponseFlag = true;
		console.log("stopResponse");
	};

	const regenerateResponse = async () => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log("regenerateResponse", _chatId);

		if (messages.length != 0 && messages.at(-1).done == true) {
			messages.splice(messages.length - 1, 1);
			messages = messages;

			let userMessage = messages.at(-1);
			let userPrompt = userMessage.content;

			await sendPrompt(userPrompt, userMessage.id, _chatId);
		}
	};

	// 获取分析接口，生成聊天标题
	const generateChatTitle = async (_chatId, userPrompt) => {
		if ($settings.titleAutoGenerate ?? true) {
			console.log("generateChatTitle");

			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "text/event-stream",
					"x-api-key": apiKey
				},
				body: JSON.stringify({
					model: selectedModels[0],
					prompt: `Generate a brief 3-5 word title for this question, excluding the term 'title.' Then, please reply with only the title: ${userPrompt}`,
					stream: false
				})
			})
				.then(async (res) => {
					if (!res.ok) throw await res.json();
					return res.json();
				})
				.catch((error) => {
					if ("detail" in error) {
						toast.error(error.detail);
					}
					console.log(error);
					return null;
				});

			if (res) {
				await setChatTitle(_chatId, res.response === "" ? "新聊天" : res.response);
			}
		} else {
			await setChatTitle(_chatId, `${userPrompt}`);
		}
	};

	const setChatTitle = async (_chatId, _title) => {
		await $db.updateChatById(_chatId, { title: _title });
		if (_chatId === $chatId) {
			title = _title;
		}
	};

	const openDialog = (params) => {
		isDialogOpen = true;
		queryParams = params;
	};
</script>

<svelte:window
	on:scroll={(e) => {
		autoScroll = window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
	}}
/>

<Navbar {title} />
<div class="min-h-screen w-full flex justify-center">
	<div class=" py-2.5 flex flex-col justify-between w-full">
		<!-- <div class="max-w-2xl mx-auto w-full px-3 md:px-0 mt-10">
			<ModelSelector bind:selectedModels disabled={messages.length > 0} />
		</div> -->

		<div class=" h-full mt-10 mb-32 w-full flex flex-col">
			<Messages
				{selectedModels}
				bind:history
				bind:messages
				bind:autoScroll
				{sendPrompt}
				{regenerateResponse}
			/>
		</div>
	</div>

	<MessageInput bind:prompt bind:autoScroll {messages} {submitPrompt} {stopResponse} />
</div>

<Dialog bind:isOpen={isDialogOpen} title={queryParams.title}>
	{#if queryParams.type === "trackReplay"}
		<TrackReplay {...queryParams} />
	{:else if queryParams.type === "track"}
		<Track {...queryParams} />
	{:else if queryParams.type === "ship"}
		<Ship {...queryParams} />	
	{/if}
</Dialog>
