<script>
  export let counter = 0;
</script>
<style>
  p { color: red }
</style>

<slot>OSOM.</slot>
<slot name="after">?</slot>
<button on:click={() => counter++}>{counter}</button>
{JSON.stringify($$slots)}
{JSON.stringify($$props)}
