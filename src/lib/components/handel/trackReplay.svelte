<form on:submit|preventDefault={handleSubmit} class="flex flex-col space-y-4">
    <div>
        <label for="startTime" class="block text-sm font-medium text-gray-700">轨迹回放开始时间</label>
        <input type="datetime-local" id="startTime" bind:value={startTime} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50 px-1.5" required />
    </div>
    <div>
        <label for="endTime" class="block text-sm font-medium text-gray-700">轨迹回放结束时间</label>
        <input type="datetime-local" id="endTime" bind:value={endTime} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50 px-1.5" required />
    </div>
    <div>
        <label for="shipName" class="block text-sm font-medium text-gray-700">查询MMSI</label>
        <input type="text" id="shipName" bind:value={mmsi} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50 px-1.5" required />
    </div>
    <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">开始回放</button>
</form>

<script>
    import { PostMessageManager } from '$lib/utils/PostMessageManager';
    export let startTime = '';
    export let endTime = '';
    export let mmsi = '';

    const handleSubmit = () => {
        // 调用postmessage工具类发送数据
        const postMessageManager = new PostMessageManager();
        postMessageManager.sendMessage('trackReplay', { startTime, endTime, mmsi });
    };
</script>
