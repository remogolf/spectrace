<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let requirement = null;
  export let loading = false;
  export let editing = false;
  export let project = null;
  export let userId = null;

  const dispatch = createEventDispatcher();
  
  // Form data for editing
  let formData = {
    title: '',
    description: '',
    status: '',
    priority: '',
    assignee: ''
  };
  
  // Status options
  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'implemented', label: 'Implemented' }
  ];
  
  // Priority options
  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];
  
  // Watch for requirement changes to update form data
  $: if (requirement) {
    formData = {
      title: requirement.title || '',
      description: requirement.description || '',
      status: requirement.status || 'draft',
      priority: requirement.priority || 'medium',
      assignee: requirement.assignee || ''
    };
  }
  
  // Handle form submission
  function handleSubmit() {
    const updatedRequirement = {
      ...requirement,
      ...formData
    };
    dispatch('save', updatedRequirement);
  }
  
  // Handle canceling edit
  function handleCancel() {
    dispatch('cancelEdit');
  }
  
  // Start editing
  function startEdit() {
    dispatch('edit');
  }
  
  // Delete requirement
  function deleteRequirement() {
    if (confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
      dispatch('delete', requirement);
    }
  }

  // Get priority color class
  function getPriorityClass(priority) {
    const classes = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return classes[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  // Get status color class
  function getStatusClass(status) {
    const classes = {
      draft: 'bg-yellow-100 text-yellow-800',
      review: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      implemented: 'bg-blue-100 text-blue-800'
    };
    return classes[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }
</script>

<div class="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
  {#if loading}
    <div class="flex-1 flex justify-center items-center p-8" in:fade>
      <div class="h-8 w-8 rounded-full border-3 border-gray-300 border-t-blue-600 animate-spin"></div>
      <span class="ml-3 text-gray-600">Loading requirement details...</span>
    </div>
  {:else if !requirement}
    <div class="flex-1 flex flex-col justify-center items-center p-8 text-center" in:fade>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-1">No requirement selected</h3>
      <p class="text-gray-500">Select a requirement from the tree to view its details</p>
    </div>
  {:else}
    <!-- Requirement header -->
    <div class="bg-gray-50 border-b border-gray-200 p-5">
      {#if editing}
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Edit Requirement</h2>
          <div class="flex space-x-2">
            <button 
              on:click={handleCancel}
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button 
              on:click={handleSubmit}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      {:else}
        <div class="flex justify-between items-center mb-2">
          <h2 class="text-xl font-bold text-gray-900 leading-tight">
            {#if requirement.hierarchicalPath}
              <span class="text-gray-500 mr-2 font-mono text-sm">{requirement.hierarchicalPath}</span>
            {/if}
            {requirement.title || requirement.name}
          </h2>
          <div class="flex space-x-2">
            <button 
              on:click={startEdit}
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="-ml-0.5 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
            <button 
              on:click={deleteRequirement}
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg class="-ml-0.5 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              Delete
            </button>
          </div>
        </div>
        <div class="flex items-center space-x-3 mt-3">
          <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(requirement.status)}`}>
            {statuses.find(s => s.value === requirement.status)?.label || 'Draft'}
          </span>
          <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityClass(requirement.priority)}`}>
            {priorities.find(p => p.value === requirement.priority)?.label || 'Medium'}
          </span>
          {#if requirement.assignee}
            <span class="inline-flex items-center text-xs text-gray-500">
              <svg class="h-4 w-4 mr-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              {requirement.assignee}
            </span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Requirement content -->
    <div class="flex-1 overflow-y-auto p-5">
      {#if editing}
        <form class="space-y-5">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Requirement Title</label>
            <input 
              type="text" 
              id="title" 
              bind:value={formData.title} 
              class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter requirement title"
              required
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              id="description" 
              bind:value={formData.description} 
              rows="6" 
              class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter requirement description"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                id="status" 
                bind:value={formData.status} 
                class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                {#each statuses as status}
                  <option value={status.value}>{status.label}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select 
                id="priority" 
                bind:value={formData.priority} 
                class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                {#each priorities as priority}
                  <option value={priority.value}>{priority.label}</option>
                {/each}
              </select>
            </div>
          </div>
          
          <div>
            <label for="assignee" class="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <input 
              type="text" 
              id="assignee" 
              bind:value={formData.assignee} 
              class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter assignee name"
            />
          </div>
        </form>
      {:else}
        <div class="prose prose-blue max-w-none">
          <h3 class="text-gray-900 text-base font-medium mb-2">Description</h3>
          {#if requirement.description}
            <div class="text-gray-700 whitespace-pre-line">{requirement.description}</div>
          {:else}
            <p class="text-gray-500 italic">No description provided</p>
          {/if}
        </div>
        
        <!-- Hierarchy Information -->
        <div class="border-t border-gray-200 pt-6 mt-6">
          <h3 class="text-gray-900 text-base font-medium mb-2">Hierarchy Information</h3>
          
          <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">Level</dt>
                <dd class="mt-1 text-sm text-gray-900">{requirement.level || 0}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Order</dt>
                <dd class="mt-1 text-sm text-gray-900">{requirement.order || 'Not set'}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Parent ID</dt>
                <dd class="mt-1 text-sm text-gray-900">{requirement.parentId || 'Root level'}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Hierarchical Path</dt>
                <dd class="mt-1 text-sm text-gray-900 font-mono">{requirement.hierarchicalPath || 'Not set'}</dd>
              </div>
            </dl>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>