<script>
    export let isOpen = false;
    export let title = '';
    export let onClose = () => {}; // 接收一个关闭回调函数

    const closeDialog = () => {
        isOpen = false;
        onClose(); // 调用传入的回调函数
    };
</script>

<style>
    .dialog-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .dialog {
        color: #000;
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        width: 90vw;
        max-width: 600px;
        box-sizing: border-box;
        animation: fadeIn 0.3s ease;
    }
    @media (max-width: 600px) {
        .dialog {
            width: 90%;
            padding: 15px;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .close-button {
        background: none;
        border: none;
        cursor: pointer;
        color: #888;
        transition: color 0.3s;
    }

    .close-button:hover {
        color: #006eff;
    }
</style>

{#if isOpen}
    <div class="dialog-backdrop" on:click={closeDialog} hidden={!isOpen}>
        <div class="dialog" on:click|stopPropagation>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px;">
                <h2>{title}</h2>
                <button class="close-button" on:click={closeDialog}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <slot></slot>
        </div>
    </div>
{/if}