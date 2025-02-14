<script>
	import "../app.css";
	import "../tailwind.css";
	import "tippy.js/dist/tippy.css";
	import { Toaster } from "svelte-french-toast";
</script>

<svelte:head>
	<title>海洋卫士AI客服</title>
</svelte:head>

<Toaster />
<slot />
