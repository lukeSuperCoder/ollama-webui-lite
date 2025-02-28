<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiKey } from '$lib/constants';

    // 定义一个可响应的存储来保存表格数据
    let documents = writable([]);

    // 模拟 API URL
    const API_URL = '/api/documents';

    // 格式化时间的函数
    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Date(dateString).toLocaleString('zh-CN', options);
    };

    // 定义定时器变量
    let intervalId: NodeJS.Timeout;

    // 获取数据的函数
    const fetchData = async () => {
        try {
            const response = await fetch(API_URL, {
                headers: {
                    'x-api-key': apiKey
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 处理数据，合并两个数组并添加 displayStatus 字段
            const processedDocs = data.statuses.processed ? data.statuses.processed.map(doc => ({
                ...doc,
                displayStatus: '已完成'
            })) : [];

            const processingDocs = data.statuses.processing ? data.statuses.processing.map(doc => ({
                ...doc,
                displayStatus: '进行中'
            })) : [];

            const failedDocs = data.statuses.failed ? data.statuses.failed.map(doc => ({
                ...doc,
                displayStatus: '上传失败'
            })) : [];

            // 合并三个数组
            const allDocuments = [...processedDocs, ...processingDocs, ...failedDocs];

            // 更新 documents store，格式化时间
            const formattedDocuments = allDocuments.map(doc => ({
                ...doc,
                created_at: formatDate(doc.created_at),
                updated_at: formatDate(doc.updated_at)
            }));

            documents.set(formattedDocuments);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    // 在组件挂载时启动定时器
    onMount(() => {
        fetchData(); // 初始获取数据
        intervalId = setInterval(fetchData, 5000); // 每5秒获取一次数据
    });

    // 在组件销毁时清除定时器
    onDestroy(() => {
        clearInterval(intervalId);
    });
</script>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #f2f2f2;
    }
</style>

<div>
    <h2>Document List</h2>
    <div style="overflow-x: auto;"> <!-- 添加水平滚动 -->
        <table>
            <thead>
                <tr>
                    <th style="white-space: nowrap;">ID</th>
                    <th style="white-space: nowrap;">Summary</th>
                    <th style="white-space: nowrap;">Status</th>
                    <th style="white-space: nowrap;">Length</th>
                    <th style="white-space: nowrap;">Chunks</th>
                    <th style="white-space: nowrap;">Created</th>
                    <th style="white-space: nowrap;">Updated</th>
                    <th style="white-space: nowrap;">Metadata</th>
                </tr>
            </thead>
            <tbody>
                {#each $documents as document}
                    <tr>
                        <td style="white-space: nowrap;">{document.id}</td>
                        <td style="white-space: nowrap; width: 200px; overflow: hidden; text-overflow: ellipsis; display: block;">{document.content_summary}</td>
                        <td style="white-space: nowrap; color: {document.displayStatus === '已完成' ? 'green' : document.displayStatus === '进行中' ? 'blue' : document.displayStatus === '上传失败' ? 'red' : 'black'};">{document.displayStatus}</td>
                        <td style="white-space: nowrap;">{document.content_length}</td>
                        <td style="white-space: nowrap;">{document.chunks_count}</td>
                        <td style="white-space: nowrap;">{document.created_at}</td>
                        <td style="white-space: nowrap;">{document.updated_at}</td>
                        <td style="white-space: nowrap;">{JSON.stringify(document.metadata)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
