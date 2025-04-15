<script>
  import { createEventDispatcher } from 'svelte';

  export let req; // The requirement object
  export let selectedRequirement = null;
  export let expandedItems = new Set();
  export let requirementsByParent = {};
  export let getStatusClass;
  export let isCreatingRequirement = false;
  export let newRequirementParentId = null;
  export let newRequirementTitle = '';
  
  const dispatch = createEventDispatcher();
  
  function toggleExpand(id, event) {
    event.stopPropagation();
    dispatch('toggleExpand', id);
  }
  
  function selectRequirement(id, event) {
    event.stopPropagation();
    dispatch('selectRequirement', id);
  }
  
  function startNewRequirement(id, event) {
    event.stopPropagation();
    dispatch('startNewRequirement', id);
  }
  
  function cancelNewRequirement(event) {
    event.stopPropagation();
    dispatch('cancelNewRequirement');
  }
  
  function createNewRequirement(event) {
    event.stopPropagation();
    dispatch('createNewRequirement');
  }
</script>

<li>
  <div class="flex items-center p-2 hover:bg-gray-50 rounded 
              {selectedRequirement?.id === req.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}">
    <!-- Expand/Collapse Button -->
    {#if requirementsByParent[req.id]?.length}
      <button 
        on:click={(event) => toggleExpand(req.id, event)}
        class="w-5 h-5 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        {#if expandedItems.has(req.id)}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>
    {:else}
      <div class="w-5 h-5"></div>
    {/if}
    
    <!-- Requirement Details -->
    <div 
      class="ml-1 flex-1 flex items-center justify-between cursor-pointer"
      on:click={(event) => selectRequirement(req.id, event)}
    >
      <div class="flex items-center">
        <div class="font-mono text-xs text-gray-500 mr-2">{req.hierarchicalPath || req.id.substring(0, 6)}</div>
        <div class="font-medium truncate">{req.title}</div>
      </div>
      
      {#if req.status}
        <span class="ml-2 px-2 py-0.5 text-xs rounded-full {getStatusClass(req.status)}">
          {req.status}
        </span>
      {/if}
    </div>
    
    <!-- Add Child Button -->
    <button 
      on:click={(event) => startNewRequirement(req.id, event)}
      class="w-5 h-5 text-gray-400 hover:text-blue-600 focus:outline-none ml-1"
      title="Add child requirement"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
  
  {#if isCreatingRequirement && newRequirementParentId === req.id}
    <div class="ml-6 my-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <input 
        type="text" 
        bind:value={newRequirementTitle}
        placeholder="New requirement title..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
        autofocus
      />
      <div class="flex justify-end space-x-2">
        <button 
          on:click={cancelNewRequirement}
          class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded"
        >
          Cancel
        </button>
        <button 
          on:click={createNewRequirement}
          class="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Create
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Recursively render children -->
  {#if expandedItems.has(req.id) && requirementsByParent[req.id]?.length}
    <ul class="pl-5 mt-1 space-y-1 border-l border-gray-200">
      {#each requirementsByParent[req.id] as childReq (childReq.id)}
        <svelte:self 
          req={childReq}
          {selectedRequirement}
          {expandedItems}
          {requirementsByParent}
          {getStatusClass}
          {isCreatingRequirement}
          {newRequirementParentId}
          {newRequirementTitle}
          on:toggleExpand
          on:selectRequirement
          on:startNewRequirement
          on:cancelNewRequirement
          on:createNewRequirement
        />
      {/each}
    </ul>
  {/if}
</li>