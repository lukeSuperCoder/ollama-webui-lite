<script lang="ts">
	import { v4 as uuidv4 } from "uuid";

	import fileSaver from "file-saver";
	const { saveAs } = fileSaver;

	import { goto } from "$app/navigation";
	import { db, chats, showSettings, chatId } from "$lib/stores";
	import { onMount } from "svelte";
	import toast from "svelte-french-toast";
	import Dialog from './Dialog.svelte';
	import GraphMl from '../common/GraphMl.svelte'; // Import the GraphMl component
	import Document from '../common/Document.svelte'; // Import the Document component
	import { apiKey } from "$lib/constants";
	let show = false;
	let navElement;
	let importFileInputElement;
	let importFiles;

	let title: string = "网页用户界面";
	let search = "";

	let chatDeleteId = null;

	let chatTitleEditId = null;
	let chatTitle = "";

	let showDeleteHistoryConfirm = false;

	let showDialog = false;
	let workspaceName = "";
	let workspaceType = "public"; // 默认选择公共知识库
	let embeddingType = "default"; // 默认embedding类型
	let description = "";

	let showGraphDialog = false; // State to control the GraphMl dialog
	let showDocumentDialog = false; // State to control the Document dialog

	onMount(async () => {
		if (window.innerWidth > 1280) {
			show = true;
		}

		await chats.set(await $db.getChats());
	});

	const loadChat = async (id) => {
		goto(`/c/${id}`);
	};

	const editChatTitle = async (id, _title) => {
		await $db.updateChatById(id, {
			title: _title
		});
		title = _title;
	};

	const deleteChat = async (id) => {
		goto("/");
		$db.deleteChatById(id);
	};

	const deleteChatHistory = async () => {
		await $db.deleteAllChat();
	};

	const importChats = async (chatHistory) => {
		await $db.addChats(chatHistory);
	};

	const exportChats = async () => {
		let blob = new Blob([JSON.stringify(await $db.exportChats())], {
			type: "application/json"
		});
		saveAs(blob, `聊天导出-${Date.now()}.json`);
	};

	function createNewKnowSpace() {
		showDialog = true;
	}

	async function submitForm() {
		const response = await fetch('/api/v1/knowledge_base/create', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey // 添加apiKey
			},
			body: JSON.stringify({
				name: workspaceName,
				type: workspaceType,
				embedding_type: embeddingType,
				description: description
			})
		});

		if (response.ok) {
			toast.success('创建成功');
			showDialog = false;
		} else {
			// 处理错误情况
			const errorData = await response.json();
			toast.error(`创建失败: ${errorData.message}`);
		}
	}

	$: if (importFiles) {
		let reader = new FileReader();
		reader.onload = async (event) => {
			const formData = new FormData();
			formData.append('file', new Blob([event.target.result]), importFiles[0].name);

			const response = await fetch('/api/documents/upload', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey // 添加apiKey
				},
				body: formData
			}).then(async (res) => {
				if (!res.ok) throw await res.json();
				return res.json();
			}).catch((error) => {
				if ("detail" in error) {
					toast.error(error.detail);
				}
			});
			if (response.status == "success") {
				toast.success("上传" + importFiles[0].name + "成功 ,进程将在后台运行");
			} else {
				toast.error(`上传失败: ${response.message}`);
			}
		};

		reader.readAsArrayBuffer(importFiles[0]);
	}
</script>

<div
	bind:this={navElement}
	class="h-screen {show
		? ''
		: '-translate-x-[260px]'}  w-[260px] fixed top-0 left-0 z-40 transition bg-[#0a0a0a] text-gray-200 shadow-2xl text-sm
        "
>
	<div class="py-2.5 my-auto flex flex-col justify-between h-screen">
		<div class="px-2.5 flex justify-center space-x-2">
			<button
				class="flex-grow flex justify-between rounded-md px-3 py-1.5 mt-2 hover:bg-gray-900 transition"
			>
				<div class="flex self-center">
					<div class="self-center mr-3.5">
						<img src="/ai.png" class=" w-5 invert-[100%] rounded-full" />
					</div>

					<div class=" self-center font-medium text-sm">新聊天</div>
				</div>

				<div class="flex items-center">
					<button on:click={async () => {
						goto("/");
	
						await chatId.set(uuidv4());
						// createNewChat();
					}}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"
							/>
							<path
								d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"
							/>
						</svg>
					</button>
					<!-- <button on:click={() => { 
						createNewKnowSpace(); 
					}} class="ml-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"
							/>
						</svg>
					</button> -->
				</div>
			</button>
		</div>

		<div class="px-2.5 mt-1 mb-2 flex justify-center space-x-2">
			<div class="flex w-full">
				<div class="self-center pl-3 py-2 rounded-l bg-gray-900">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-4 h-4"
					>
						<path
							fill-rule="evenodd"
							d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>

				<input
					class="w-full rounded-r py-1.5 pl-2.5 pr-4 text-sm text-gray-300 bg-gray-900 outline-none"
					placeholder="搜索"
					bind:value={search}
				/>
			</div>
		</div>

		<div class="pl-2.5 my-2 flex-1 flex flex-col space-y-1 overflow-y-auto">
			{#each $chats.filter((chat) => {
				if (search === "") {
					return true;
				} else {
					let title = chat.title.toLowerCase();

					if (title.includes(search)) {
						return true;
					} else {
						return false;
					}
				}
			}) as chat, i}
				<div class=" w-full pr-2 relative">
					<button
						class=" w-full flex justify-between rounded-md px-3 py-2 hover:bg-gray-900 {chat.id ===
						$chatId
							? 'bg-gray-900'
							: ''} transition whitespace-nowrap text-ellipsis"
						on:click={() => {
							// goto(`/c/${chat.id}`);
							if (chat.id !== chatTitleEditId) {
								chatTitleEditId = null;
								chatTitle = "";
							}

							if (chat.id !== $chatId) {
								loadChat(chat.id);
							}
						}}
					>
						<div class=" flex self-center flex-1">
							<div class=" self-center mr-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-4 h-4"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
									/>
								</svg>
							</div>
							<div
								class=" text-left self-center overflow-hidden {chat.id === $chatId
									? 'w-[120px]'
									: 'w-[180px]'} "
							>
								{#if chatTitleEditId === chat.id}
									<input bind:value={chatTitle} class=" bg-transparent w-full" />
								{:else}
									{chat.title}
								{/if}
							</div>
						</div>
					</button>

					{#if chat.id === $chatId}
						<div class=" absolute right-[22px] top-[10px]">
							{#if chatTitleEditId === chat.id}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											editChatTitle(chat.id, chatTitle);
											chatTitleEditId = null;
											chatTitle = "";
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												fill-rule="evenodd"
												d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											chatTitleEditId = null;
											chatTitle = "";
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
											/>
										</svg>
									</button>
								</div>
							{:else if chatDeleteId === chat.id}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											deleteChat(chat.id);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												fill-rule="evenodd"
												d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											chatDeleteId = null;
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
											/>
										</svg>
									</button>
								</div>
							{:else}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											chatTitle = chat.title;
											chatTitleEditId = chat.id;
											// editChatTitle(chat.id, 'a');
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
											/>
										</svg>
									</button>
									<button
										class=" self-center hover:text-white transition"
										on:click={() => {
											chatDeleteId = chat.id;
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="px-2.5">
			<hr class=" border-gray-800 mb-2 w-full" />

			<div class="flex flex-col">
				<div class="flex">
					<input bind:this={importFileInputElement} bind:files={importFiles} type="file" hidden />
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							importFileInputElement.click();
							// importChats();
						}}
					>
						<div class=" self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/>
							</svg>
						</div>
						<div class=" self-center">上传文档</div>
					</button>
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							exportChats();
						}}
					>
						<div class=" self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/>
							</svg>
						</div>
						<div class=" self-center">导出对话</div>
					</button>
				</div>
				{#if showDeleteHistoryConfirm}
					<div class="flex justify-between rounded-md items-center py-3 px-3.5 w-full transition">
						<div class="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5 mr-3"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
							<span>你确定吗？</span>
						</div>

						<div class="flex space-x-1.5 items-center">
							<button
								class="hover:text-white transition"
								on:click={() => {
									deleteChatHistory();
									showDeleteHistoryConfirm = false;
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-4 h-4"
								>
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								class="hover:text-white transition"
								on:click={() => {
									showDeleteHistoryConfirm = false;
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-4 h-4"
								>
									<path
										d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
									/>
								</svg>
							</button>
						</div>
					</div>
				{:else}
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							showDeleteHistoryConfirm = true;
						}}
					>
						<div class="mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
						</div>
						<span>清除对话</span>
					</button>
				{/if}
				<!-- <button
					class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
					on:click={async () => {
						await showSettings.set(true);
					}}
				>
					<div class=" self-center mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
					<div class=" self-center font-medium">设置</div>
				</button> -->
				<!-- <button
					class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
					on:click={() => {
						showGraphDialog = true; // Open the GraphMl dialog
					}}
				>
					<div class=" self-center mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
					<div class=" self-center font-medium">展示图谱</div>
				</button> -->
				<button
					class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
					on:click={() => {
						showDocumentDialog = true; // Open the Document dialog
					}}
				>
					<div class=" self-center mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M7 6h10M7 10h10M7 14h10M7 18h10"
							/>
						</svg>
					</div>
					<div class=" self-center">查看文件</div>
				</button>
			</div>
		</div>
	</div>

	<div
		class="fixed left-0 top-[50dvh] z-40 -translate-y-1/2 transition-transform translate-x-[255px] md:translate-x-[260px] rotate-0"
	>
		<button
			class=" group"
			on:click={() => {
				show = !show;
			}}
			><span class="" data-state="closed"
				><div
					class="flex h-[72px] w-8 items-center justify-center opacity-20 group-hover:opacity-100 transition"
				>
					<div class="flex h-6 w-6 flex-col items-center">
						<div
							class="h-3 w-1 rounded-full bg-[#0f0f0f] dark:bg-white rotate-0 translate-y-[0.15rem] {show
								? 'group-hover:rotate-[15deg]'
								: 'group-hover:rotate-[-15deg]'}"
						/>
						<div
							class="h-3 w-1 rounded-full bg-[#0f0f0f] dark:bg-white rotate-0 translate-y-[-0.15rem] {show
								? 'group-hover:rotate-[-15deg]'
								: 'group-hover:rotate-[15deg]'}"
						/>
					</div>
				</div>
			</span>
		</button>
	</div>

	<Dialog isOpen={showGraphDialog} title="图谱展示" onClose={() => (showGraphDialog = false)}>
		<GraphMl /> <!-- Display the GraphMl component -->
	</Dialog>

	<Dialog isOpen={showDocumentDialog} title="文档查看" onClose={() => (showDocumentDialog = false)}>
		<Document /> <!-- Display the Document component -->
	</Dialog>
</div>

<Dialog isOpen={showDialog} title="创建知识库">
	<form on:submit|preventDefault={submitForm} class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium">知识库名称:</label>
			<input type="text" id="name" bind:value={workspaceName} required placeholder="请输入知识库名称" class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-500" />
		</div>
		<div>
			<label for="type" class="block text-sm font-medium">知识库类型:</label>
			<select id="type" bind:value={workspaceType} class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-500 max-h-40 overflow-y-auto">
				<option value="public">公共知识库</option>
				<option value="private">个人知识库</option>
			</select>
		</div>
		<div>
			<label for="embedding_type" class="block text-sm font-medium">Embedding类型:</label>
			<select id="embedding_type" bind:value={embeddingType} class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-500 max-h-40 overflow-y-auto">
				<option value="default">默认</option>
			</select>
		</div>
		<div>
			<label for="description" class="block text-sm font-medium">描述:</label>
			<textarea id="description" bind:value={description} placeholder="请输入描述" class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-500"></textarea>
		</div>
		<div class="dialog-actions">
			<button type="button" on:click={() => (showDialog = false)} class="bg-gray-300 rounded-md px-4 py-2">取消</button>
			<button type="submit" class="ml-2 bg-blue-500 text-white rounded-md px-4 py-2">提交</button>
		</div>
	</form>
</Dialog>

<style>
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 10px;
	}
</style>
