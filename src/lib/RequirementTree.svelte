<script>
  import RequirementTreeItem from './RequirementTreeItem.svelte';
  import { createEventDispatcher } from 'svelte';
  import { moveRequirement } from './requirementsService.js';
  import { fade, slide } from 'svelte/transition';

  export let requirements = [];
  export let activeRequirementId = null;
  export let loading = false;
  export let userId = null;
  export let projectId = null;
  export let isCreatingRequirement = false;
  export let newRequirementParentId = null;
  export let newRequirementTitle = '';

  const dispatch = createEventDispatcher();
  
  // Improved drag and drop state management
  let isDraggingActive = false;
  let isRootDropTarget = false;
  let dragState = {
    sourceId: null,
    dropPreview: null,
    targetId: null,
    position: null
  };
  let dropPreviewTimeout = null;
  let debounceTimer = null;

  // Track expanded items in a Set
  let expandedItems = new Set();

  // Build requirementsByParent: { parentId: [children] }
  $: requirementsByParent = {};
  $: {
    requirementsByParent = {};
    requirements.forEach(req => {
      const parent = req.parentId ?? null;
      if (!requirementsByParent[parent]) requirementsByParent[parent] = [];
      requirementsByParent[parent].push(req);
    });
  }

  // Helper functions for drag and drop with improved stability
  function onDropPreview(preview) {
    // Clear any pending timeouts to prevent "flickering"
    if (dropPreviewTimeout) clearTimeout(dropPreviewTimeout);
    if (debounceTimer) clearTimeout(debounceTimer);
    
    // Set preview immediately without debounce to make indicators persist
    dragState.dropPreview = preview;
    
    // Only set auto-clear timeout if preview is null
    // This way, indicators remain visible while hovering
    if (preview === null) {
      // Short delay when clearing to prevent flickering during transitions
      dropPreviewTimeout = setTimeout(() => {
        dragState.dropPreview = null;
      }, 100);
    }
  }

  function onDrop({ sourceId, targetId, position }) {
    // Clear all timeouts to prevent any visual glitches after drop
    if (dropPreviewTimeout) clearTimeout(dropPreviewTimeout);
    if (debounceTimer) clearTimeout(debounceTimer);
    
    // Reset state
    dragState = { sourceId: null, dropPreview: null, targetId: null, position: null };
    
    // Process the drop
    handleDrop({ detail: { sourceId, targetId, position } });
  }

  function onDragStart(sourceId) {
    dragState.sourceId = sourceId;
    isDraggingActive = true;
  }

  function onDragEnd() {
    // Clear all timeouts
    if (dropPreviewTimeout) clearTimeout(dropPreviewTimeout);
    if (debounceTimer) clearTimeout(debounceTimer);
    
    // Reset state
    dragState = { sourceId: null, dropPreview: null, targetId: null, position: null };
    isDraggingActive = false;
    isRootDropTarget = false;
  }

  // Updated event handlers for drag and drop to ensure cross-component communication
  function handleDropPreview(event) {
    onDropPreview(event.detail);
  }
  
  function handleClearDropPreview() {
    onDropPreview(null);
  }
  
  function handleDragStart(event) {
    onDragStart(event.detail);
  }
  
  function handleDragEnd() {
    onDragEnd();
  }

  // Event handlers for requirements
  function handleToggleExpand(event) {
    const id = event.detail;
    if (expandedItems.has(id)) {
      expandedItems.delete(id);
    } else {
      expandedItems.add(id);
    }
    expandedItems = new Set(expandedItems);
  }

  function handleSelectRequirement(event) {
    dispatch('selectRequirement', event.detail);
  }

  function handleStartNewRequirement(event) {
    dispatch('addChild', event.detail);
  }

  function handleCancelNewRequirement() {
    dispatch('cancelNewRequirement');
  }

  function handleCreateNewRequirement() {
    dispatch('createNewRequirement');
  }

  function handleShowDetails(event) {
    dispatch('showDetails', event.detail);
  }
  
  // Status class helper function
  function getStatusClass(status) {
    switch(status) {
      case 'draft': return 'bg-gray-200 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'implemented': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }
  
  // Handle drag and drop events
  async function handleDrop(event) {
    const { sourceId, targetId, position } = event.detail;
    
    try {
      // Find source and target requirements
      const sourceReq = requirements.find(r => r.id === sourceId);
      
      // Special case handling for drops onto the root area
      if (targetId === 'root') {
        // Find the maximum order among root items
        const rootItems = requirements.filter(r => !r.parentId);
        const maxOrder = rootItems.length > 0 
          ? Math.max(...rootItems.map(r => r.order || 0)) 
          : 0;
        
        await moveRequirement({
          requirementId: sourceId,
          newParentId: null, // null parent means root level
          newOrder: maxOrder + 1,
          userId
        });
        
        dispatch('requirementMoved', { 
          requirementId: sourceId, 
          newParentId: null,
          newOrder: maxOrder + 1
        });
        
        return;
      }
      
      const targetReq = requirements.find(r => r.id === targetId);
      
      if (!sourceReq || !targetReq) {
        console.error('Source or target requirement not found');
        return;
      }
      
      // Calculate new parent and order
      let newParentId = null;
      let siblings = [];
      let newOrder = 1;
      let affectedSiblings = [];
      
      switch (position) {
        case 'top':
          // Insert before target as a sibling - use target's parent
          newParentId = targetReq.parentId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          if (targetReq.order !== undefined) {
            // Identify siblings that need their order increased
            affectedSiblings = siblings.filter(sib => 
              sib.id !== sourceId && sib.order >= targetReq.order
            );
            
            // Set new order to target's current order
            newOrder = targetReq.order;
          }
          break;
        
        case 'middle':
          // Make it a child of the target
          newParentId = targetId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          newOrder = siblings.length + 1;
          break;
        
        case 'bottom':
          // Insert after target as a sibling - use target's parent
          newParentId = targetReq.parentId;
          siblings = requirements.filter(r => r.parentId === newParentId);
          if (targetReq.order !== undefined) {
            // Identify siblings that need their order increased
            affectedSiblings = siblings.filter(sib => 
              sib.id !== sourceId && sib.order > targetReq.order
            );
            
            // Set new order to one after target's order
            newOrder = targetReq.order + 1;
          }
          break;
      }
      
      // Move the requirement
      console.log(`Moving requirement ${sourceId} to parent=${newParentId}, order=${newOrder}, position=${position}`);
      await moveRequirement({
        requirementId: sourceId,
        newParentId,
        newOrder,
        userId
      });
      
      // Update affected siblings
      if (affectedSiblings.length > 0) {
        console.log(`Updating ${affectedSiblings.length} affected siblings`);
        
        // Process each affected sibling sequentially
        for (const sibling of affectedSiblings) {
          const newSiblingOrder = sibling.order + 1;
          console.log(`Updating sibling ${sibling.id} order from ${sibling.order} to ${newSiblingOrder}`);
          
          await moveRequirement({
            requirementId: sibling.id,
            newParentId: sibling.parentId, // Keep same parent
            newOrder: newSiblingOrder,
            userId
          });
        }
      }
      
      // Notify parent component of the change
      dispatch('requirementMoved', { 
        requirementId: sourceId, 
        newParentId, 
        newOrder 
      });
    } catch (error) {
      console.error('Error moving requirement:', error);
      alert(`Failed to move requirement: ${error.message}`);
    }
  }

  // Root level drag and drop handlers
  function handleRootDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer.types.includes('application/json')) {
      // Set the correct cursor
      event.dataTransfer.dropEffect = 'move';
      
      // Only update if not already a root drop target
      if (!isRootDropTarget) {
        isRootDropTarget = true;
        // Show a drop preview at the end of the list
        onDropPreview({ 
          sourceId: dragState.sourceId, 
          targetId: 'root', 
          position: 'bottom' 
        });
      }
    }
  }
  
  function handleRootDragLeave(event) {
    // Check if we're actually leaving the container (not just entering a child)
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isRootDropTarget = false;
      onDropPreview(null);
    }
  }
  
  function handleRootDrop(event) {
    event.preventDefault();
    isRootDropTarget = false;
    
    if (event.dataTransfer.types.includes('application/json')) {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      const sourceId = data.id;
      
      // Find the maximum order among root items
      const rootItems = requirements.filter(r => !r.parentId);
      const maxOrder = rootItems.length > 0 
        ? Math.max(...rootItems.map(r => r.order || 0)) 
        : 0;
      
      // Place this item at the end of root items
      try {
        moveRequirement({
          requirementId: sourceId,
          newParentId: null, // null parent means root level
          newOrder: maxOrder + 1,
          userId
        });
        
        // Notify parent component of the change
        dispatch('requirementMoved', { 
          requirementId: sourceId, 
          newParentId: null,
          newOrder: maxOrder + 1
        });
      } catch (error) {
        console.error('Error moving requirement to root:', error);
        alert(`Failed to move requirement: ${error.message}`);
      }
    }
  }
</script>

<div class="h-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
  <div class="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
    <h3 class="text-md font-medium text-gray-900">Requirements</h3>
    <div class="flex space-x-2">
      <button 
        on:click={() => dispatch('addRoot')}
        class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg class="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Add Root
      </button>
    </div>
  </div>

  <!-- Column headers -->
  <div class="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center py-2">
    <div class="w-8"><!-- Drag handle column --></div>
    <div class="flex-grow pl-6">Name</div>
    <div class="w-24 text-center">Status</div>
    <div class="w-32"><!-- Actions column --></div>
  </div>

  <!-- Main tree content area -->
  <div class="flex-grow overflow-auto relative flex flex-col">
    <!-- Requirements list -->
    <div 
      class="flex-grow {isRootDropTarget ? 'root-drop-active' : ''}"
      on:dragover={handleRootDragOver}
      on:dragleave={handleRootDragLeave}
      on:drop={handleRootDrop}
    >
      {#if loading}
        <div class="flex justify-center items-center py-8">
          <div class="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"></div>
          <span class="ml-2 text-sm text-gray-500">Loading requirements...</span>
        </div>
      {:else if requirementsByParent[null]?.length === 0}
        <div class="text-center py-8 px-4">
          <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No requirements</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new requirement.</p>
        </div>
      {:else}
        <ul>
          {#each requirementsByParent[null] || [] as requirement (requirement.id)}
            <RequirementTreeItem
              req={requirement}
              selectedRequirement={activeRequirementId}
              expandedItems={expandedItems}
              requirementsByParent={requirementsByParent}
              {getStatusClass}
              {isCreatingRequirement}
              {newRequirementParentId}
              {newRequirementTitle}
              dragState={dragState}
              {onDropPreview}
              {onDrop}
              {onDragStart}
              {onDragEnd}
              on:toggleExpand={handleToggleExpand}
              on:selectRequirement={handleSelectRequirement}
              on:startNewRequirement={handleStartNewRequirement}
              on:cancelNewRequirement={handleCancelNewRequirement}
              on:createNewRequirement={handleCreateNewRequirement}
            />
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Root drop zone at the bottom - enhanced with better visual feedback -->
    {#if isDraggingActive && requirementsByParent[null]?.length > 0}
      <div 
        class="root-drop-zone py-2 mt-2 {isRootDropTarget ? 'active' : ''}"
        on:dragover={handleRootDragOver}
        on:dragleave={handleRootDragLeave}
        on:drop={handleRootDrop}
      >
        {#if isRootDropTarget}
          <div class="root-drop-indicator" in:fade={{ duration: 150 }}>
            <div class="root-drop-pill">Move to root level</div>
          </div>
        {:else}
          <div class="root-drop-zone-label">Drag here to add to root level</div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Add item button at the bottom -->
  <div class="border-t border-gray-200 p-2 bg-gray-50">
    <button 
      on:click={() => dispatch('addRoot')}
      class="flex items-center justify-center w-full py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
    >
      <svg class="mr-1 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      Add item
    </button>
  </div>
</div>

<style>
  .root-drop-active {
    background-color: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3b82f6;
  }
  .drop-preview-bar {
    height: 8px;
    background: #3b82f6;
    border-radius: 4px;
    margin: 2px 0;
    opacity: 0.7;
    transition: background 0.18s;
  }
  .drop-preview-bar.root {
    margin-left: 0;
    width: 98%;
    margin-right: 1%;
  }
  .root-drop-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3b82f6;
    padding: 8px 16px;
    border-radius: 8px;
    text-align: center;
  }
  .root-drop-pill {
    background-color: #3b82f6;
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .root-drop-zone {
    min-height: 40px;
    border-radius: 6px;
    margin: 0 8px 8px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #e5e7eb;
    transition: all 0.2s ease-in-out;
    position: relative;
    z-index: 10; /* Ensure it's above other content */
  }
  .root-drop-zone.active {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.08);
  }
  .root-drop-zone-label {
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s ease-in-out;
  }
  .root-drop-zone:hover {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.04);
  }
  .root-drop-zone:hover .root-drop-zone-label {
    color: #3b82f6;
  }
</style>
